import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEventPhotoDto {
  @ApiProperty({ example: 'https://example.com/uploads/branches/photo.jpg' })
  @IsString()
  @MinLength(1)
  imageUrl: string;

  @ApiPropertyOptional({ example: 'Morning chanting before the retreat' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;
}
