import { PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

export class S3Service {
    private readonly s3: S3Client;

    constructor() {
        this.s3 = new S3Client({
            region: process.env.AWS_REGION as string,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY as string,
                secretAccessKey: process.env.AWS_SECRET_KEY as string,
            },
        });
    }

    async uploadToS3(filename: string, buffer: Buffer): Promise<string> {
        const fileUrl = `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
        await this.s3.send(new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME as string,
            Key: filename,
            Body: buffer,
        }));

        return fileUrl;
    }

    async deleteFromS3(filename: string): Promise<void> {
        await this.s3.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME as string,
            Key: filename,
        }));
    }
}