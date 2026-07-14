import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import type { CourseStatus } from '../entities/course.entity';

const STATUSES: CourseStatus[] = ['active', 'inactive'];

export class CreateCourseDto {
  @ApiProperty({ example: 'Introduction to Meditation' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Freeform teaching topics/curriculum, one item per line.' })
  @IsOptional()
  @IsString()
  syllabus?: string;

  @ApiPropertyOptional({ example: 'Foundations' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Cover image URL or base64 data URI.' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ minimum: 1, example: 8 })
  @IsInt()
  @Min(1)
  totalSessions: number;

  @ApiPropertyOptional({ default: 80, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingAttendancePercent?: number;

  @ApiPropertyOptional({ enum: STATUSES, default: 'active' })
  @IsOptional()
  @IsIn(STATUSES)
  status?: CourseStatus;
}
