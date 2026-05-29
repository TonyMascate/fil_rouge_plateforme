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
import { getSignedUrl as getCloudFrontSignedUrl } from '@aws-sdk/cloudfront-signer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Upload } from '@aws-sdk/lib-storage';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

const EXT_FROM_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
};

@Injectable()
export class AwsService {
  private s3: S3Client;
  private bucket: string;
  private cloudFrontDomain: string;
  private cloudFrontKeyPairId: string;
  private cloudFrontPrivateKey: string;
  private signedUrlTtl: number;

  constructor(private config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('S3_BUCKET_NAME');
    this.cloudFrontDomain = this.config.getOrThrow<string>('CLOUDFRONT_DOMAIN');
    this.cloudFrontKeyPairId = this.config.getOrThrow<string>('CLOUDFRONT_KEY_PAIR_ID');
    this.cloudFrontPrivateKey = Buffer.from(
      this.config.getOrThrow<string>('CLOUDFRONT_PRIVATE_KEY_BASE64'),
      'base64',
    ).toString('utf8');
    this.signedUrlTtl = parseInt(
      this.config.get<string>('CLOUDFRONT_SIGNED_URL_TTL_SECONDS') ?? '3600',
      10,
    );
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

  // URL CloudFront signée (canned policy). L'expiration est arrondie à une fenêtre de TTL :
  // toutes les requêtes d'une même fenêtre produisent une URL identique → cacheable
  // (navigateur / CDN / next-image) au lieu de re-signer à chaque appel. La validité réelle
  // est garantie entre 1× et 2× le TTL selon le moment de la requête dans la fenêtre.
  getSignedImageUrl(key: string, ttlSeconds: number = this.signedUrlTtl): string {
    const ttlMs = ttlSeconds * 1000;
    const windowIndex = Math.floor(Date.now() / ttlMs);
    const dateLessThan = new Date((windowIndex + 2) * ttlMs).toISOString();
    return getCloudFrontSignedUrl({
      url: `https://${this.cloudFrontDomain}/${key}`,
      keyPairId: this.cloudFrontKeyPairId,
      privateKey: this.cloudFrontPrivateKey,
      dateLessThan,
    });
  }

  // -------- Multipart upload presigned (remplace Companion) --------

  // Génère la key côté serveur → l'user ne peut pas injecter de chemin arbitraire
  async createMultipartUpload(contentType: string) {
    const ext = EXT_FROM_CONTENT_TYPE[contentType] ?? '.bin';
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
