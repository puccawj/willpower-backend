import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class EnrollDto {
  @ApiProperty({ description: 'User UUID to enroll.' })
  @IsUUID()
  userId: string;
}
