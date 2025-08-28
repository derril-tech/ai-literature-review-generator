import { Controller, Post, Body } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import { loadConfig } from '../config/configuration';

class SignUploadDto {
  filename!: string;
  contentType!: string;
}

@Controller('uploads')
export class UploadsController {
  @Post('sign')
  async signUpload(@Body() body: SignUploadDto) {
    const { filename, contentType } = body;
    const cfg = loadConfig();
    const s3 = new S3({
      endpoint: cfg.s3.endpoint,
      region: cfg.s3.region,
      accessKeyId: cfg.s3.accessKeyId,
      secretAccessKey: cfg.s3.secretAccessKey,
      s3ForcePathStyle: true,
      signatureVersion: 'v4'
    });

    const Bucket = cfg.s3.bucket || 'airg';
    const Key = `uploads/${Date.now()}-${filename}`;
    const params = { Bucket, Key, Expires: 300, ContentType: contentType } as const;
    const url = await s3.getSignedUrlPromise('putObject', params);
    return { url, key: Key, bucket: Bucket };
  }
}

