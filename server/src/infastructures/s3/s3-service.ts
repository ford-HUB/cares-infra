import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export class S3Service {
  private readonly s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY as string,
        secretAccessKey: process.env.AWS_SECRET_KEY as string,
      },
    });
  }

  async uploadToS3(
    filename: string,
    buffer: Buffer,
    contentType?: string,
  ): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: filename,
        Body: buffer,
        ...(contentType ? { ContentType: contentType } : {}),
      }),
    );

    return this.buildObjectUrl(filename);
  }

  async getObject(
    keyOrUrl: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const key = this.resolveObjectKey(keyOrUrl);
    const response = await this.s3.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      }),
    );

    const body = response.Body;
    if (!body) {
      throw new Error(`S3 object is empty: ${key}`);
    }

    return {
      buffer: Buffer.from(await body.transformToByteArray()),
      contentType: response.ContentType ?? 'application/octet-stream',
    };
  }

  async getObjectBuffer(keyOrUrl: string): Promise<Buffer> {
    const object = await this.getObject(keyOrUrl);
    return object.buffer;
  }

  resolveObjectKey(keyOrUrl: string): string {
    const trimmed = keyOrUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return new URL(trimmed).pathname.replace(/^\//, '');
    }

    const marker = '.amazonaws.com/';
    const markerIndex = trimmed.indexOf(marker);
    if (markerIndex !== -1) {
      return trimmed.slice(markerIndex + marker.length);
    }

    return trimmed;
  }

  buildObjectUrl(key: string): string {
    const bucket = process.env.AWS_BUCKET_NAME as string;
    const region = process.env.AWS_REGION as string;
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  async deleteFromS3(filename: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: this.resolveObjectKey(filename),
      }),
    );
  }
}
