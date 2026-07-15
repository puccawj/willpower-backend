import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { EventPhoto } from './entities/event-photo.entity';
import { CreateEventPhotoDto } from './dto/create-event-photo.dto';
import { UpdateEventPhotoDto } from './dto/update-event-photo.dto';

@Injectable()
export class EventPhotosService {
  constructor(
    @InjectRepository(EventPhoto) private readonly photos: Repository<EventPhoto>,
    @InjectRepository(Event) private readonly events: Repository<Event>,
  ) {}

  async findAllForEvent(eventId: string): Promise<EventPhoto[]> {
    await this.getEventOrThrow(eventId);
    return this.photos.find({ where: { eventId, status: 'approved' }, order: { createdAt: 'DESC' } });
  }

  async create(eventId: string, dto: CreateEventPhotoDto, actorId: string): Promise<EventPhoto> {
    await this.getEventOrThrow(eventId);
    const photo = this.photos.create({
      eventId,
      userId: actorId,
      imageUrl: dto.imageUrl,
      caption: dto.caption ?? null,
      status: 'approved',
      moderatedBy: actorId,
      moderatedAt: new Date(),
    });
    return this.photos.save(photo);
  }

  async update(eventId: string, id: string, dto: UpdateEventPhotoDto): Promise<EventPhoto> {
    const photo = await this.getOrThrow(eventId, id);
    if (dto.imageUrl !== undefined) photo.imageUrl = dto.imageUrl;
    if (dto.caption !== undefined) photo.caption = dto.caption ?? null;
    return this.photos.save(photo);
  }

  async remove(eventId: string, id: string): Promise<void> {
    await this.getOrThrow(eventId, id);
    await this.photos.delete(id);
  }

  private async getOrThrow(eventId: string, id: string): Promise<EventPhoto> {
    const photo = await this.photos.findOne({ where: { id, eventId } });
    if (!photo) throw new NotFoundException('Photo not found.');
    return photo;
  }

  private async getEventOrThrow(eventId: string): Promise<Event> {
    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');
    return event;
  }
}
