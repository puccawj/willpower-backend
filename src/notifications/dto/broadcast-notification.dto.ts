import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class BroadcastNotificationDto {
  @ApiProperty({ example: 'Weekend retreat reminder' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Don\'t forget to bring comfortable clothing for this weekend\'s retreat.' })
  @IsString()
  @MinLength(2)
  message: string;

  @ApiProperty({ enum: ['all', 'branch'], description: '"all" is superadmin-only; admin/instructor are always scoped to their own branch.' })
  @IsIn(['all', 'branch'])
  scope: 'all' | 'branch';

  @ApiPropertyOptional({ description: 'Required when scope is "branch". Ignored for admin/instructor, who are always scoped to their own branch.' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  studentsOnly?: boolean;
}
