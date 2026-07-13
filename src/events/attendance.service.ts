import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { Event } from './entities/event.entity';
import { EventRsvp } from './entities/event-rsvp.entity';
import { EventWaitlist } from './entities/event-waitlist.entity';
import { EventAttendance } from './entities/event-attendance.entity';
import { AddAttendeeDto } from './dto/add-attendee.dto';

export interface AttendeeRow {
  userId: string;
  name: string;
  email: string;
  status: 'confirm' | 'maybe' | 'cancel';
  checkedIn: boolean;
}

export interface WaitlistRow {
  userId: string;
  name: string;
  email: string;
  position: number;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Event) private readonly events: Repository<Event>,
    @InjectRepository(EventRsvp) private readonly rsvps: Repository<EventRsvp>,
    @InjectRepository(EventWaitlist) private readonly waitlist: Repository<EventWaitlist>,
    @InjectRepository(EventAttendance) private readonly attendance: Repository<EventAttendance>,
  ) {}

  async listAttendees(eventId: string): Promise<AttendeeRow[]> {
    await this.getEventOrThrow(eventId);

    return this.rsvps.query(
      `SELECT
         u.id AS "userId",
         u.first_name || ' ' || u.last_name AS name,
         u.email,
         r.status,
         (a.id IS NOT NULL) AS "checkedIn"
       FROM event_rsvp r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN event_attendance a ON a.event_id = r.event_id AND a.user_id = r.user_id
       WHERE r.event_id = $1
       ORDER BY r.responded_at ASC`,
      [eventId],
    );
  }

  async listWaitlist(eventId: string): Promise<WaitlistRow[]> {
    await this.getEventOrThrow(eventId);

    return this.waitlist.query(
      `SELECT u.id AS "userId", u.first_name || ' ' || u.last_name AS name, u.email, w.position
       FROM event_waitlist w
       JOIN users u ON u.id = w.user_id
       WHERE w.event_id = $1
       ORDER BY w.position ASC`,
      [eventId],
    );
  }

  async addAttendee(eventId: string, dto: AddAttendeeDto): Promise<{ waitlisted: boolean }> {
    const event = await this.getEventOrThrow(eventId);
    const status = dto.status ?? 'confirm';

    if (status === 'confirm' && (await this.isFull(event))) {
      await this.appendToWaitlist(eventId, dto.userId);
      return { waitlisted: true };
    }

    await this.upsertRsvp(eventId, dto.userId, status);
    return { waitlisted: false };
  }

  async updateAttendeeStatus(eventId: string, userId: string, status: 'confirm' | 'maybe' | 'cancel'): Promise<void> {
    const event = await this.getEventOrThrow(eventId);
    const existing = await this.rsvps.findOne({ where: { eventId, userId } });
    if (!existing) throw new NotFoundException('This user has no RSVP for this event.');

    if (status === 'confirm' && existing.status !== 'confirm' && (await this.isFull(event))) {
      throw new ConflictException('Event is at capacity — promote from the waitlist instead.');
    }

    await this.upsertRsvp(eventId, userId, status);
  }

  async setSelfRsvp(eventId: string, userId: string, status: 'confirm' | 'maybe' | 'cancel'): Promise<void> {
    const event = await this.getEventOrThrow(eventId);
    this.ensureRsvpOpen(event);

    const existing = await this.rsvps.findOne({ where: { eventId, userId } });
    if (existing) {
      await this.updateAttendeeStatus(eventId, userId, status);
    } else {
      await this.addAttendee(eventId, { userId, status });
    }
  }

  private ensureRsvpOpen(event: Event): void {
    if (event.rsvpCutoffAt && new Date() > new Date(event.rsvpCutoffAt)) {
      throw new ConflictException('The RSVP cutoff for this event has passed.');
    }
  }

  async removeAttendee(eventId: string, userId: string): Promise<void> {
    await this.getEventOrThrow(eventId);
    await this.rsvps.delete({ eventId, userId });
    await this.attendance.delete({ eventId, userId });
    await this.waitlist.delete({ eventId, userId });
  }

  async toggleCheckin(eventId: string, userId: string, actorId: string): Promise<{ checkedIn: boolean }> {
    await this.getEventOrThrow(eventId);
    const existing = await this.attendance.findOne({ where: { eventId, userId } });

    if (existing) {
      await this.attendance.delete({ eventId, userId });
      return { checkedIn: false };
    }

    await this.attendance.save(
      this.attendance.create({ eventId, userId, checkedInAt: new Date(), checkedInBy: actorId, method: 'manual' }),
    );
    return { checkedIn: true };
  }

  async getEventCheckinQr(eventId: string): Promise<{ code: string; qrDataUrl: string }> {
    await this.getEventOrThrow(eventId);
    const qrDataUrl = await QRCode.toDataURL(eventId, { margin: 1, width: 320 });
    return { code: eventId, qrDataUrl };
  }

  async selfCheckin(eventId: string, userId: string): Promise<{ title: string; alreadyCheckedIn: boolean }> {
    const event = await this.getEventOrThrow(eventId);

    const rsvp = await this.rsvps.findOne({ where: { eventId, userId } });
    if (!rsvp || rsvp.status !== 'confirm') {
      throw new ConflictException('You need a confirmed RSVP for this event to check in.');
    }

    const existing = await this.attendance.findOne({ where: { eventId, userId } });
    if (existing) return { title: event.title, alreadyCheckedIn: true };

    await this.attendance.save(
      this.attendance.create({ eventId, userId, checkedInAt: new Date(), checkedInBy: userId, method: 'self_qr' }),
    );
    return { title: event.title, alreadyCheckedIn: false };
  }

  async promoteFromWaitlist(eventId: string, actorId: string): Promise<void> {
    void actorId;
    const event = await this.getEventOrThrow(eventId);
    if (await this.isFull(event)) {
      throw new ConflictException('Event is already at capacity.');
    }

    const next = await this.waitlist.findOne({ where: { eventId }, order: { position: 'ASC' } });
    if (!next) throw new NotFoundException('Waitlist is empty.');

    await this.waitlist.delete({ id: next.id });
    await this.upsertRsvp(eventId, next.userId, 'confirm');
    await this.waitlist.query(
      `UPDATE event_waitlist SET position = position - 1 WHERE event_id = $1 AND position > $2`,
      [eventId, next.position],
    );
  }

  private async isFull(event: Event): Promise<boolean> {
    if (event.capacity == null) return false;
    const confirmed = await this.rsvps.count({ where: { eventId: event.id, status: 'confirm' } });
    return confirmed >= event.capacity;
  }

  private async appendToWaitlist(eventId: string, userId: string): Promise<void> {
    const existing = await this.waitlist.findOne({ where: { eventId, userId } });
    if (existing) return;

    const last = await this.waitlist.findOne({ where: { eventId }, order: { position: 'DESC' } });
    const position = (last?.position ?? 0) + 1;
    await this.waitlist.save(this.waitlist.create({ eventId, userId, position }));
  }

  private async upsertRsvp(eventId: string, userId: string, status: 'confirm' | 'maybe' | 'cancel'): Promise<void> {
    await this.rsvps.query(
      `INSERT INTO event_rsvp (event_id, user_id, status, responded_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (event_id, user_id) DO UPDATE SET status = EXCLUDED.status, responded_at = now()`,
      [eventId, userId, status],
    );
    await this.waitlist.delete({ eventId, userId });
  }

  private async getEventOrThrow(eventId: string): Promise<Event> {
    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');
    return event;
  }
}
