import { Module } from '@nestjs/common';
import { S3Module } from '../s3/s3.module';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [S3Module],
  controllers: [UploadsController],
})
export class UploadsModule {}
