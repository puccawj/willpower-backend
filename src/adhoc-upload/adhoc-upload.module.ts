import { Module } from '@nestjs/common';
import { AdhocUploadController } from './adhoc-upload.controller';

@Module({
  controllers: [AdhocUploadController],
})
export class AdhocUploadModule {}
