import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

export interface EventWithCounts extends Event {
  going: number;
  maybe: number;
  cancel: number;
  waitlist: number;
}

export interface PublicEventRow {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  location: string | null;
  capacity: number | null;
  startAt: Date;
  endAt: Date;
  rsvpCutoffAt: Date | null;
  branchId: string;
  branchName: string;
  branchCity: string | null;
  going: number;
}

@Injectable()
export class EventsService {
  constructor(@InjectRepository(Event) private readonly events: Repository<Event>) {}

  async findAll(): Promise<EventWithCounts[]> {
    const rows = await this.events.find({ order: { startAt: 'ASC' } });
    return this.attachCounts(rows);
  }

  async findOne(id: string): Promise<EventWithCounts> {
    const event = await this.events.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found.');
    const [withCounts] = await this.attachCounts([event]);
    return withCounts;
  }

  async create(dto: CreateEventDto, actorId: string): Promise<Event> {
    this.ensureEndAfterStart(dto.startAt, dto.endAt);

    const event = this.events.create({
      branchId: dto.branchId,
      title: dto.title,
      description: dto.description ?? null,
      location: dto.location ?? null,
      capacity: dto.capacity ?? null,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      rsvpCutoffAt: dto.rsvpCutoffAt ? new Date(dto.rsvpCutoffAt) : null,
      publishAt: dto.publishAt ? new Date(dto.publishAt) : null,
      coverImageUrl: dto.coverImage ?? null,
      status: dto.status ?? 'draft',
      createdBy: actorId,
      updatedBy: actorId,
    });
    return this.events.save(event);
  }

  async update(id: string, dto: UpdateEventDto, actorId: string): Promise<Event> {
    const event = await this.events.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found.');

    const nextStart = dto.startAt ? new Date(dto.startAt) : event.startAt;
    const nextEnd = dto.endAt ? new Date(dto.endAt) : event.endAt;
    if (nextEnd <= nextStart) {
      throw new BadRequestException('End time must be after the start time.');
    }

    if (dto.branchId !== undefined) event.branchId = dto.branchId;
    if (dto.title !== undefined) event.title = dto.title;
    if (dto.description !== undefined) event.description = dto.description;
    if (dto.location !== undefined) event.location = dto.location;
    if (dto.capacity !== undefined) event.capacity = dto.capacity;
    if (dto.startAt !== undefined) event.startAt = nextStart;
    if (dto.endAt !== undefined) event.endAt = nextEnd;
    if (dto.rsvpCutoffAt !== undefined) event.rsvpCutoffAt = dto.rsvpCutoffAt ? new Date(dto.rsvpCutoffAt) : null;
    if (dto.publishAt !== undefined) event.publishAt = dto.publishAt ? new Date(dto.publishAt) : null;
    if (dto.coverImage !== undefined) event.coverImageUrl = dto.coverImage;
    if (dto.status !== undefined) event.status = dto.status;
    event.updatedBy = actorId;

    return this.events.save(event);
  }

  async softDelete(id: string): Promise<void> {
    const event = await this.events.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found.');
    await this.events.softDelete(id);
  }

  async findPublished(): Promise<PublicEventRow[]> {
    return this.events.query(
      `SELECT e.id, e.title, e.description, e.cover_image_url AS "coverImageUrl", e.location, e.capacity,
              e.start_at AS "startAt", e.end_at AS "endAt", e.rsvp_cutoff_at AS "rsvpCutoffAt",
              b.id AS "branchId", b.name AS "branchName", b.city AS "branchCity",
              COALESCE((SELECT COUNT(*) FROM event_rsvp r WHERE r.event_id = e.id AND r.status = 'confirm'), 0)::int AS going
         FROM events e
         JOIN branches b ON b.id = e.branch_id
         WHERE e.status = 'published' AND e.deleted_at IS NULL
         ORDER BY e.start_at ASC`,
    );
  }

  async findOnePublished(id: string): Promise<PublicEventRow> {
    const rows = await this.events.query(
      `SELECT e.id, e.title, e.description, e.cover_image_url AS "coverImageUrl", e.location, e.capacity,
              e.start_at AS "startAt", e.end_at AS "endAt", e.rsvp_cutoff_at AS "rsvpCutoffAt",
              b.id AS "branchId", b.name AS "branchName", b.city AS "branchCity",
              COALESCE((SELECT COUNT(*) FROM event_rsvp r WHERE r.event_id = e.id AND r.status = 'confirm'), 0)::int AS going
         FROM events e
         JOIN branches b ON b.id = e.branch_id
         WHERE e.id = $1 AND e.status = 'published' AND e.deleted_at IS NULL`,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Event not found.');
    return rows[0];
  }

  private ensureEndAfterStart(startAt: string, endAt: string): void {
    if (new Date(endAt) <= new Date(startAt)) {
      throw new BadRequestException('End time must be after the start time.');
    }
  }

  private async attachCounts(rows: Event[]): Promise<EventWithCounts[]> {
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const counts = await this.events.query(
      `SELECT
         e.id AS event_id,
         COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'confirm') AS going,
         COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'maybe') AS maybe,
         COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'cancel') AS cancel,
         COUNT(DISTINCT w.id) AS waitlist
       FROM events e
       LEFT JOIN event_rsvp r ON r.event_id = e.id
       LEFT JOIN event_waitlist w ON w.event_id = e.id
       WHERE e.id = ANY($1)
       GROUP BY e.id`,
      [ids],
    );

    const countMap = new Map<string, { going: string; maybe: string; cancel: string; waitlist: string }>(
      counts.map((c: any) => [c.event_id, c]),
    );

    return rows.map((row) => {
      const c = countMap.get(row.id);
      return {
        ...row,
        going: c ? Number(c.going) : 0,
        maybe: c ? Number(c.maybe) : 0,
        cancel: c ? Number(c.cancel) : 0,
        waitlist: c ? Number(c.waitlist) : 0,
      };
    });
  }
}
