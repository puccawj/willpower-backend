import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { EventNeed } from './entities/event-need.entity';
import { CreateEventNeedDto } from './dto/create-event-need.dto';
import { UpdateEventNeedDto } from './dto/update-event-need.dto';

@Injectable()
export class EventNeedsService {
  constructor(
    @InjectRepository(EventNeed) private readonly needs: Repository<EventNeed>,
    @InjectRepository(Event) private readonly events: Repository<Event>,
  ) {}

  async findAllForEvent(eventId: string): Promise<EventNeed[]> {
    await this.getEventOrThrow(eventId);
    return this.needs.find({ where: { eventId }, order: { createdAt: 'ASC' } });
  }

  async create(eventId: string, dto: CreateEventNeedDto, actorId: string): Promise<EventNeed> {
    await this.getEventOrThrow(eventId);
    const need = this.needs.create({
      eventId,
      title: dto.title,
      type: dto.type,
      unit: dto.unit ?? null,
      targetQuantity: dto.targetQuantity.toFixed(2),
      createdBy: actorId,
      updatedBy: actorId,
    });
    return this.needs.save(need);
  }

  async update(eventId: string, id: string, dto: UpdateEventNeedDto, actorId: string): Promise<EventNeed> {
    const need = await this.getOrThrow(eventId, id);

    if (dto.title !== undefined) need.title = dto.title;
    if (dto.type !== undefined) need.type = dto.type;
    if (dto.unit !== undefined) need.unit = dto.unit ?? null;
    if (dto.targetQuantity !== undefined) need.targetQuantity = dto.targetQuantity.toFixed(2);
    need.updatedBy = actorId;

    return this.needs.save(need);
  }

  async remove(eventId: string, id: string): Promise<void> {
    await this.getOrThrow(eventId, id);
    await this.needs.softDelete(id);
  }

  async incrementReceived(needId: string, addedQuantity: number): Promise<void> {
    if (!addedQuantity) return;
    await this.needs.query(
      `UPDATE event_needs SET received_quantity = received_quantity + $2 WHERE id = $1`,
      [needId, addedQuantity],
    );
  }

  private async getOrThrow(eventId: string, id: string): Promise<EventNeed> {
    const need = await this.needs.findOne({ where: { id, eventId } });
    if (!need) throw new NotFoundException('Need not found.');
    return need;
  }

  private async getEventOrThrow(eventId: string): Promise<Event> {
    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');
    return event;
  }
}
