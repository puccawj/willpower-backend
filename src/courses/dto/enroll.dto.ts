import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class EnrollDto {
  @ApiProperty({ description: 'User UUID to enroll.' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    description:
      'Admin-only: enroll even though the student is missing a prerequisite course. Ignored for self-service enrollment.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
