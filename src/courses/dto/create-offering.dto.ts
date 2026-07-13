import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import type { OfferingMode, OfferingStatus } from '../entities/course-offering.entity';

const MODES: OfferingMode[] = ['online', 'onsite'];
const STATUSES: OfferingStatus[] = ['draft', 'scheduled', 'ongoing', 'completed', 'cancelled'];

export class CreateOfferingDto {
  @ApiProperty({ description: 'Course UUID this offering runs.' })
  @IsUUID()
  courseId: string;

  @ApiProperty({ description: 'Branch UUID hosting this offering.' })
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional({ description: 'Instructor user UUID.' })
  @IsOptional()
  @IsUUID()
  instructorId?: string;

  @ApiProperty({ description: 'ISO date (YYYY-MM-DD).' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'ISO date (YYYY-MM-DD).' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ enum: MODES })
  @IsIn(MODES)
  mode: OfferingMode;

  @ApiPropertyOptional({ enum: STATUSES, default: 'draft' })
  @IsOptional()
  @IsIn(STATUSES)
  status?: OfferingStatus;
}
