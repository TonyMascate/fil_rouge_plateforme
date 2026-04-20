import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CompletedPart,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListPartsCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Upload } from '@aws-sdk/lib-storage';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Readable } from 'stream';

@Injectable()
export class AwsService {
  private s3: S3Client;
  private bucket: string;
  private cloudFrontDomain: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('S3_BUCKET_NAME');
    this.cloudFrontDomain = this.config.getOrThrow<string>('CLOUDFRONT_DOMAIN');
    this.s3 = new S3Client({
      region: this.config.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  // -------- Lecture / écriture stream (utilisés par le worker Sharp) --------

  async downloadStream(key: string): Promise<Readable> {
    const response = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return response.Body as Readable;
  }

  async uploadStream(key: string, body: Readable, contentType: string) {
    const upload = new Upload({
      client: this.s3,
      params: { Bucket: this.bucket, Key: key, Body: body, ContentType: contentType },
    });
    return upload.done();
  }

  async headObject(key: string) {
    return this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async deleteObject(key: string) {
    return this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  getPublicUrl(key: string): string {
    return `https://${this.cloudFrontDomain}/${key}`;
  }

  // -------- Multipart upload presigned (remplace Companion) --------

  // Génère la key côté serveur → l'user ne peut pas injecter de chemin arbitraire
  async createMultipartUpload(originalName: string, contentType: string) {
    const ext = extname(originalName).toLowerCase() || '.bin';
    const key = `raw/${randomUUID()}${ext}`;

    const { UploadId } = await this.s3.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
    );

    if (!UploadId) throw new Error('S3 did not return an UploadId');
    return { uploadId: UploadId, key };
  }

  async signPart(key: string, uploadId: string, partNumber: number): Promise<string> {
    const command = new UploadPartCommand({
      Bucket: this.bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    return getSignedUrl(this.s3, command, { expiresIn: 900 }); // 15 min
  }

  async listParts(key: string, uploadId: string) {
    const res = await this.s3.send(
      new ListPartsCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId }),
    );
    return (res.Parts ?? []).map((p) => ({
      PartNumber: p.PartNumber!,
      ETag: p.ETag!,
      Size: p.Size!,
    }));
  }

  async completeMultipartUpload(key: string, uploadId: string, parts: CompletedPart[]) {
    return this.s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      }),
    );
  }

  async abortMultipartUpload(key: string, uploadId: string) {
    return this.s3.send(
      new AbortMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
      }),
    );
  }
}
