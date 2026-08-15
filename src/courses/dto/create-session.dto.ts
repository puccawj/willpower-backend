import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreateSessionDto {
  @ApiProperty({ description: 'ISO date (YYYY-MM-DD) this session meets on.' })
  @IsDateString()
  sessionDate: string;

  @ApiProperty({ description: 'Start time, HH:mm or HH:mm:ss.' })
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm format.' })
  startTime: string;

  @ApiProperty({ description: 'End time, HH:mm or HH:mm:ss.' })
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:mm format.' })
  endTime: string;

  @ApiPropertyOptional({ description: 'Optional topic/agenda for this session.' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({ description: 'Optional room/location override for this session.' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Optional explicit ordering number; defaults to the next available slot.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  sessionNo?: number;
}
