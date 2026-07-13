import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { UserRole, UserStatus } from '../entities/user.entity';

const MANAGEABLE_ROLES: UserRole[] = ['superadmin', 'admin', 'instructor', 'student', 'general'];
const MANAGEABLE_STATUSES: UserStatus[] = ['active', 'suspended', 'pending_verification'];

export class CreateUserDto {
  @ApiProperty({ example: 'Jane' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'jane.doe@willpower.org' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3curePass!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiProperty({ enum: MANAGEABLE_ROLES })
  @IsIn(MANAGEABLE_ROLES)
  role: UserRole;

  @ApiPropertyOptional({ description: 'Branch UUIDs this user belongs to. First one is treated as primary.', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  branchIds?: string[];

  @ApiPropertyOptional({ example: '+66' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  phoneCountryCode?: string;

  @ApiPropertyOptional({ example: '812345678' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @ApiPropertyOptional({ enum: MANAGEABLE_STATUSES, default: 'active' })
  @IsOptional()
  @IsIn(MANAGEABLE_STATUSES)
  status?: UserStatus;
}
