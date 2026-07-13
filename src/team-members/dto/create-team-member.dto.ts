import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class CreateTeamMemberDto {
  @ApiProperty({ example: 'Ajahn Suriya' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ example: 'Director & Senior Teacher' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ description: 'Branch UUID this team member belongs to.' })
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional({ description: 'Photo URL or base64 data URI.' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({ default: true, description: 'Whether this member is shown on the public website.' })
  @IsOptional()
  @IsBoolean()
  isShown?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
