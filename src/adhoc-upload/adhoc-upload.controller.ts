import { BadRequestException, Controller, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { Public } from '../auth/decorators/public.decorator';
import { AdhocUploadGuard } from './adhoc-upload.guard';

const ADHOC_DIST_DIR = join(process.cwd(), 'adhoc-dist');

// Bearer-token gated (AdhocUploadGuard) instead of the usual JWT auth — this is called
// by CI (GitHub Actions), not a logged-in user, to work around the production server's
// SSH port being locked to specific IPs that don't include GitHub-hosted runners'
// ever-changing ones.
@Controller('internal/adhoc-upload')
@Public()
@UseGuards(AdhocUploadGuard)
export class AdhocUploadController {
  @Post(':filename')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: ADHOC_DIST_DIR,
        // AdhocUploadGuard already validated this filename against the allowlist before
        // this runs, so it's safe to use directly.
        filename: (req, _file, cb) => cb(null, String(req.params['filename'])),
      }),
    }),
  )
  upload(@Param('filename') filename: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded.');
    return { ok: true, filename };
  }
}
