import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength } from 'class-validator';

export class IssueDonationCertificateDto {
  @ApiProperty({ description: 'Certificate template UUID used to render this certificate.' })
  @IsUUID()
  templateId: string;

  @ApiProperty({ description: 'URL of the already-generated & uploaded certificate PDF.' })
  @IsString()
  @MinLength(1)
  fileUrl: string;

  @ApiProperty({ description: 'Certificate number, pre-generated client-side and embedded in the PDF before upload.' })
  @IsString()
  @MinLength(1)
  certificateNo: string;
}
