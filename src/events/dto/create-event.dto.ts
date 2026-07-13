import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import type { EventStatus } from '../entities/event.entity';

const MANAGEABLE_STATUSES: EventStatus[] = ['draft', 'published', 'closed'];

export class CreateEventDto {
  @ApiProperty({ example: 'Morning Meditation Retreat' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiProperty({ description: 'Branch UUID hosting this event.' })
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiProperty({ description: 'ISO 8601 datetime.' })
  @IsDateString()
  startAt: string;

  @ApiProperty({ description: 'ISO 8601 datetime, must be after startAt.' })
  @IsDateString()
  endAt: string;

  @ApiPropertyOptional({ description: 'ISO 8601 datetime.' })
  @IsOptional()
  @IsDateString()
  rsvpCutoffAt?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 datetime.' })
  @IsOptional()
  @IsDateString()
  publishAt?: string;

  @ApiPropertyOptional({ description: 'Cover image URL or base64 data URI.' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ enum: MANAGEABLE_STATUSES, default: 'draft' })
  @IsOptional()
  @IsIn(MANAGEABLE_STATUSES)
  status?: EventStatus;
}
