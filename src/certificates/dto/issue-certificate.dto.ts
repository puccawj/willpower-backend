import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength } from 'class-validator';

export class IssueCertificateDto {
  @ApiProperty({ description: 'Course offering UUID.' })
  @IsUUID()
  offeringId: string;

  @ApiProperty({ description: 'Student user UUID.' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'URL of the already-generated & uploaded certificate PDF.' })
  @IsString()
  @MinLength(1)
  fileUrl: string;

  @ApiProperty({ description: 'Certificate number, pre-generated client-side and embedded in the PDF before upload.' })
  @IsString()
  @MinLength(1)
  certificateNo: string;
}
