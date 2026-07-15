import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCoursePhotoDto {
  @ApiProperty({ example: 'https://example.com/uploads/branches/photo.jpg' })
  @IsString()
  @MinLength(1)
  imageUrl: string;

  @ApiPropertyOptional({ example: 'Students practicing walking meditation' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;
}
