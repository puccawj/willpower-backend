import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';
import type { EventNeedType } from '../entities/event-need.entity';

const TYPES: EventNeedType[] = ['money', 'goods'];

export class CreateEventNeedDto {
  @ApiProperty({ example: 'Rice bags' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ enum: TYPES })
  @IsIn(TYPES)
  type: EventNeedType;

  @ApiPropertyOptional({ example: 'bags' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @IsPositive()
  targetQuantity: number;
}
