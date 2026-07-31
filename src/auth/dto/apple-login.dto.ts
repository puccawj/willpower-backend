import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class AppleLoginDto {
  @ApiProperty({ description: 'The identity token returned by Sign in with Apple on the frontend.' })
  @IsString()
  @MinLength(1)
  idToken: string;

  @ApiPropertyOptional({
    description:
      'Full name, only present on the very first Apple sign-in — Apple never sends it again after that, so the frontend must capture and forward it on first login.',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Set true on the register page to create an account if one does not exist yet.', default: false })
  @IsOptional()
  @IsBoolean()
  allowCreate?: boolean;
}
