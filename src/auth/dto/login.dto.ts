import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'superadmin@willpower.org' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'superadmin123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
