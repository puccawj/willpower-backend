import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class FacebookLoginDto {
  @ApiProperty({ description: 'The user access token returned by the Facebook JS SDK on the frontend.' })
  @IsString()
  @MinLength(1)
  accessToken: string;

  @ApiPropertyOptional({ description: 'Set true on the register page to create an account if one does not exist yet.', default: false })
  @IsOptional()
  @IsBoolean()
  allowCreate?: boolean;
}
