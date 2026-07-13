import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import type { RsvpStatus } from '../entities/event-rsvp.entity';

const STATUSES: RsvpStatus[] = ['confirm', 'maybe', 'cancel'];

export class AddAttendeeDto {
  @ApiProperty({ description: 'User UUID to add as an attendee.' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ enum: STATUSES, default: 'confirm' })
  @IsOptional()
  @IsIn(STATUSES)
  status?: RsvpStatus;
}
