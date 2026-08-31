import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateStudentApplicationDto {
  @IsEmail()
  email: string;

  /** Which branch(es) the applicant wants to attend — each gets its own approve/reject
   * decision from that branch's admin, since applying to multiple branches at once is allowed. */
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  branchIds: string[];

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nickname: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;
}
