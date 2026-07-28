import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { DevicePlatform } from '../../users/entities/user-device.entity';

export class RegisterDeviceDto {
  @ApiProperty({ enum: ['ios', 'android', 'web'] })
  @IsIn(['ios', 'android', 'web'])
  platform: DevicePlatform;

  @ApiProperty({ description: 'FCM/APNs push token for this device/browser.' })
  @IsString()
  @MaxLength(255)
  pushToken: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  appVersion?: string;
}
