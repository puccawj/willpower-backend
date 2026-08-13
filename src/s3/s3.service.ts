import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    },
  });

  async uploadBuffer(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
    if (cloudFrontDomain) return `https://${cloudFrontDomain}/${key}`;

    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }
}
