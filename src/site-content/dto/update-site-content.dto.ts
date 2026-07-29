import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateSiteContentDto {
  @ApiProperty({ description: 'Free-form JSON content for this page — shape is defined by convention per slug.' })
  @IsObject()
  content: Record<string, unknown>;
}
