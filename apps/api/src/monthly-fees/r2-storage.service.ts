import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export abstract class R2StorageService {
  abstract generatePresignedUrl(fileKey: string, contentType: string): Promise<string>;
  abstract generateReadUrl(fileKey: string, expiresInSeconds?: number): Promise<string>;
  abstract getPublicUrl(fileKey: string): string;
}

export class RealR2StorageService implements R2StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    this.bucket = process.env.R2_BUCKET_NAME ?? "tatamiq-receipts";
    this.publicUrl = process.env.R2_PUBLIC_URL ?? "";

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID ?? ""}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }

  async generatePresignedUrl(fileKey: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, { expiresIn: 600 });
  }

  async generateReadUrl(fileKey: string, expiresInSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  getPublicUrl(fileKey: string): string {
    return this.publicUrl ? `${this.publicUrl}/${fileKey}` : fileKey;
  }
}

export class FakeR2StorageService implements R2StorageService {
  async generatePresignedUrl(fileKey: string, contentType: string): Promise<string> {
    const url = new URL("/__e2e/r2/upload", e2eBaseUrl());
    url.searchParams.set("fileKey", fileKey);
    url.searchParams.set("contentType", contentType);
    return url.toString();
  }

  async generateReadUrl(fileKey: string, expiresInSeconds = 300): Promise<string> {
    const url = new URL("/__e2e/r2/read", e2eBaseUrl());
    url.searchParams.set("fileKey", fileKey);
    url.searchParams.set("expiresIn", String(expiresInSeconds));
    return url.toString();
  }

  getPublicUrl(fileKey: string): string {
    const url = new URL("/__e2e/r2/public", e2eBaseUrl());
    url.searchParams.set("fileKey", fileKey);
    return url.toString();
  }
}

function e2eBaseUrl() {
  return process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? 3100}`;
}
