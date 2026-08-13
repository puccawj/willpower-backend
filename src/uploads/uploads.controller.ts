import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { memoryStorage } from 'multer';
import { S3Service } from '../s3/s3.service';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

@ApiTags('uploads')
@ApiBearerAuth('access-token')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly s3: S3Service) {}

  @Post()
  @ApiOperation({ summary: 'Upload an image file, returns its publicly accessible URL.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES[file.mimetype]) {
          cb(new BadRequestException('Only PNG, JPEG, WEBP, GIF images or PDF files are allowed.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded.');
    const key = `branches/${randomUUID()}${ALLOWED_MIME_TYPES[file.mimetype] ?? ''}`;
    const url = await this.s3.uploadBuffer(key, file.buffer, file.mimetype);
    return { url };
  }
}
