import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { DonationType } from '../entities/donation.entity';

const TYPES: DonationType[] = ['money', 'goods'];

export class CreateDonationDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  donorName: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ example: '+66' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  donorPhoneCountryCode?: string;

  @ApiProperty({ example: '812345678' })
  @IsString()
  @MaxLength(30)
  donorPhoneNumber: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  donorEmail: string;

  @ApiProperty({ enum: TYPES })
  @IsIn(TYPES)
  type: DonationType;

  @ApiProperty({ description: 'Amount (for money donations) or item description (for goods donations).', example: '500' })
  @IsString()
  @MinLength(1)
  amountOrItem: string;

  @ApiProperty({ description: 'Branch UUID this donation is credited to.' })
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional({ description: 'Related event UUID, if this donation was made for a specific event.' })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({ description: 'Related course UUID, if this donation was made for a specific course.' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Proof of donation photo — URL or base64 data URI.' })
  @IsOptional()
  @IsString()
  proofImage?: string;

  @ApiPropertyOptional({ description: 'Event wishlist item (need) UUID this donation targets, if any.' })
  @IsOptional()
  @IsUUID()
  needId?: string;

  @ApiPropertyOptional({ description: 'Course wishlist item (need) UUID this donation targets, if any.' })
  @IsOptional()
  @IsUUID()
  courseNeedId?: string;

  @ApiPropertyOptional({ description: "Units donated toward the need's target (type='goods' only)." })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number;
}
