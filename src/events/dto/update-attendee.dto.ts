import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { RsvpStatus } from '../entities/event-rsvp.entity';

const STATUSES: RsvpStatus[] = ['confirm', 'maybe', 'cancel'];

export class UpdateAttendeeDto {
  @ApiProperty({ enum: STATUSES })
  @IsIn(STATUSES)
  status: RsvpStatus;
}
