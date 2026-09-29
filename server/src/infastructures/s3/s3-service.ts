import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { NotFoundException } from '@nestjs/common';

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

  /**
   * A stored key that is no longer in the bucket is a missing file, not a server
   * fault: rows outlive objects (a record restored from a dump, an upload that went to
   * another bucket, a file deleted by hand). Left as the raw SDK error it reaches the
   * exception filter as an unknown failure and prints a stack for every broken avatar,
   * so it is translated here — once, for all the callers — into the 404 the clients
   * already know how to fall back from.
   */
  async getObject(
    keyOrUrl: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const key = this.resolveObjectKey(keyOrUrl);

    let response: GetObjectCommandOutput;
    try {
      response = await this.s3.send(
        new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
        }),
      );
    } catch (error) {
      if (this.isMissingObject(error)) {
        throw new NotFoundException('File not found');
      }
      throw error;
    }

    const body = response.Body;
    if (!body) {
      throw new NotFoundException('File not found');
    }

    return {
      buffer: Buffer.from(await body.transformToByteArray()),
      contentType: response.ContentType ?? 'application/octet-stream',
    };
  }

  /**
   * The SDK reports a missing object as `NoSuchKey` on a plain GET and as `NotFound`
   * when the caller lacks `s3:ListBucket` — the same situation, two shapes. The status
   * check is the backstop for a version that reports neither.
   */
  private isMissingObject(error: unknown): boolean {
    if (error instanceof NoSuchKey || error instanceof NotFound) return true;

    const status = (error as { $metadata?: { httpStatusCode?: number } })
      ?.$metadata?.httpStatusCode;
    return status === 404;
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
