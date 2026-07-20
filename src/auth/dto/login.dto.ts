import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'superadmin@willpower.org' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'superadmin123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ description: 'Keep the session signed in for longer than the default expiry.' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @ApiPropertyOptional({ description: 'Cloudflare Turnstile token from the login form.' })
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
