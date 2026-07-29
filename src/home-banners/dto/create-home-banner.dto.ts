import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateHomeBannerDto {
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({ description: 'Relative path (e.g. /events) or a full URL.' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD. Omit to start showing immediately.' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD. Omit for no end date.' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
