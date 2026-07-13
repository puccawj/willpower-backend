import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SelfEnrollDto {
  @ApiProperty({ description: 'Course offering UUID to enroll in.' })
  @IsUUID()
  offeringId: string;
}
