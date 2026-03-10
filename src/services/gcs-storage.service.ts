import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { extname } from 'path';

type UploadedObject = {
  publicUrl: string;
  objectName: string;
  contentType?: string;
};

@Injectable()
export class GcsStorageService {
  private getBucketName(): string {
    const bucket = process.env.GCS_BUCKET;
    if (!bucket) {
      throw new InternalServerErrorException('GCS_BUCKET is not set');
    }
    return bucket;
  }

  private getStorageClient(): any {
    try {
      // Keep this as require() so the project can still compile even if the dependency isn't installed yet.
      // Install it with: npm i @google-cloud/storage
      // Credentials are picked up from GOOGLE_APPLICATION_CREDENTIALS (service account JSON path) or other ADC sources.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Storage } = require('@google-cloud/storage');
      const keyFilename = process.env.GCS_KEYFILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const credentialsJson = process.env.GCS_CREDENTIALS_JSON;

      if (credentialsJson) {
        const parsed = JSON.parse(credentialsJson);
        return new Storage({
          projectId: parsed.project_id,
          credentials: {
            client_email: parsed.client_email,
            private_key: parsed.private_key,
          },
        });
      }

      if (keyFilename) {
        return new Storage({ keyFilename });
      }

      // Local-dev fallback (no env vars): load a key file from Store/.secrets/.
      // IMPORTANT: never commit this file. It's ignored via .gitignore.
      const cwd = process.cwd();
      const localKeyCandidates = [
        `${cwd}/.secrets/gcs-service-account.json`,
        `${cwd}/.secrets/gcs.json`,
      ];
      for (const candidate of localKeyCandidates) {
        if (!existsSync(candidate)) continue;
        const parsed = JSON.parse(readFileSync(candidate, 'utf8'));
        return new Storage({
          projectId: parsed.project_id,
          credentials: {
            client_email: parsed.client_email,
            private_key: parsed.private_key,
          },
        });
      }

      return new Storage();
    } catch (e) {
      throw new InternalServerErrorException(
        'Google Cloud Storage client not available. Install @google-cloud/storage and configure GOOGLE_APPLICATION_CREDENTIALS.',
      );
    }
  }

  async uploadImage(params: {
    folder: 'products' | 'categories';
    entityId: string;
    buffer: Buffer;
    mimeType?: string;
    originalName?: string;
  }): Promise<UploadedObject> {
    const bucketName = this.getBucketName();
    const storage = this.getStorageClient();
    const bucket = storage.bucket(bucketName);

    const safeExt =
      (params.originalName && extname(params.originalName).slice(0, 10)) ||
      (params.mimeType === 'image/png' ? '.png' : params.mimeType === 'image/webp' ? '.webp' : '.jpg');

    const objectName = `${params.folder}/${params.entityId}/${Date.now()}-${randomUUID()}${safeExt}`;
    const file = bucket.file(objectName);

    try {
      await file.save(params.buffer, {
        resumable: false,
        contentType: params.mimeType || 'application/octet-stream',
        metadata: {
          cacheControl: 'public, max-age=31536000',
        },
      });

      // Optional: attempt to make the object public.
      // NOTE: If your bucket has Uniform Bucket-Level Access enabled, per-object ACL updates are not allowed
      // and this call will fail. In that case, configure bucket-level IAM for public read (if desired),
      // or serve images via signed URLs / a proxy endpoint.
      if (process.env.GCS_MAKE_PUBLIC !== 'false') {
        try {
          await file.makePublic();
        } catch (e: any) {
          const msg = String(e?.message || '');
          const uniformAccess =
            msg.includes('uniform bucket-level access') ||
            msg.includes('Uniform bucket-level access') ||
            msg.includes('uniformBucketLevelAccess');
          if (!uniformAccess) throw e;
          // Ignore UBLA errors: upload succeeded, but object ACL cannot be changed.
        }
      }

      const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
      return { publicUrl, objectName, contentType: params.mimeType };
    } catch (e) {
      console.log('GCS upload error:', e);
      throw new InternalServerErrorException('Failed to upload image to Google Cloud Storage');
    }
  }

  async deleteByPublicUrl(publicUrl?: string | null): Promise<void> {
    if (!publicUrl) return;
    const bucketName = this.getBucketName();
    const prefix = `https://storage.googleapis.com/${bucketName}/`;
    if (!publicUrl.startsWith(prefix)) return;

    const withoutQuery = publicUrl.split('?')[0];
    const objectName = withoutQuery.slice(prefix.length);
    if (!objectName) return;

    const storage = this.getStorageClient();
    const bucket = storage.bucket(bucketName);
    try {
      await bucket.file(objectName).delete({ ignoreNotFound: true });
    } catch {
      // Non-fatal: don't block DB updates if delete fails
    }
  }
}
