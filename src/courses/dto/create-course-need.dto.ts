import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { CourseNeedType } from '../entities/course-need.entity';

const TYPES: CourseNeedType[] = ['money', 'goods'];

export class CreateCourseNeedDto {
  @ApiProperty({ example: 'Meditation cushions' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Which class session (1-based) this need is for. Omit for the whole course.', example: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  sessionNumber?: number;

  @ApiPropertyOptional({ description: 'Which specific offering (branch/run) this need is for. Omit for the whole course.' })
  @IsOptional()
  @IsUUID()
  offeringId?: string;

  @ApiProperty({ enum: TYPES })
  @IsIn(TYPES)
  type: CourseNeedType;

  @ApiPropertyOptional({ example: 'pieces' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @IsPositive()
  targetQuantity: number;
}
