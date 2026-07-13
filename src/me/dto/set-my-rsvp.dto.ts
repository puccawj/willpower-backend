import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const STATUSES = ['confirm', 'maybe', 'cancel'] as const;
export type MyRsvpStatus = (typeof STATUSES)[number];

export class SetMyRsvpDto {
  @ApiProperty({ enum: STATUSES })
  @IsIn(STATUSES)
  status: MyRsvpStatus;
}
