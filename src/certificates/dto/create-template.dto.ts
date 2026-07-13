import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import type { TemplateType } from '../entities/certificate-template.entity';

const TYPES: TemplateType[] = ['certificate', 'donation_money', 'donation_goods'];

export class CreateTemplateDto {
  @ApiProperty({ example: 'Certificate of Completion 2026' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ enum: TYPES })
  @IsIn(TYPES)
  type: TemplateType;

  @ApiProperty({ description: 'Background image URL or base64 data URI.' })
  @IsString()
  @MinLength(1)
  backgroundImage: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  year?: number;

  @ApiPropertyOptional({ description: 'Branch UUID this template is scoped to. Omit for a global template.' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Field positions (xPct/yPct per field key) and kicker text for the PDF layout.' })
  @IsOptional()
  @IsObject()
  layoutConfig?: Record<string, unknown>;
}
