import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ description: 'The ID token returned by Google Identity Services on the frontend.' })
  @IsString()
  @MinLength(1)
  idToken: string;

  @ApiPropertyOptional({ description: 'Set true on the register page to create an account if one does not exist yet.', default: false })
  @IsOptional()
  @IsBoolean()
  allowCreate?: boolean;
}
