import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCoursePhotoDto {
  @ApiPropertyOptional({ example: 'https://example.com/uploads/branches/photo.jpg' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'Students practicing walking meditation' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;
}
