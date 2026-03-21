import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { dirname, extname, isAbsolute, join } from 'path';

type UploadedObject = {
  publicUrl: string;
  objectName: string;
  contentType?: string;
};

type ServiceAccountCredentials = {
  projectId: string;
  credentials: {
    client_email: string;
    private_key: string;
  };
};

@Injectable()
export class GcsStorageService {
  private storageClient?: any;
  private secretClient?: any;
  private credentialsPromise?: Promise<ServiceAccountCredentials | null>;

  private getBucketName(): string {
    const bucket = process.env.GCS_BUCKET;
    if (!bucket) {
      throw new InternalServerErrorException('GCS_BUCKET is not set');
    }
    return bucket;
  }

  private async getStorageClient(): Promise<any> {
    if (this.storageClient) return this.storageClient;
    try {
      // Keep this as require() so the project can still compile even if the dependency isn't installed yet.
      // Install it with: npm i @google-cloud/storage
      // Credentials are picked up from GOOGLE_APPLICATION_CREDENTIALS (service account JSON path) or other ADC sources.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Storage } = require('@google-cloud/storage');

      const credentialsJson = process.env.GCS_CREDENTIALS_JSON;
      if (credentialsJson) {
        const parsed = this.parseServiceAccount(credentialsJson);
        this.storageClient = new Storage({
          projectId: parsed.projectId,
          credentials: parsed.credentials,
        });
        return this.storageClient;
      }

      const keyFilename = process.env.GCS_KEYFILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (keyFilename) {
        const resolved = this.findFileUpwards(keyFilename);
        if (resolved) {
          this.storageClient = new Storage({ keyFilename: resolved });
          return this.storageClient;
        }
      }

      const credentials = await this.loadCredentials();
      if (credentials) {
        this.storageClient = new Storage({
          projectId: credentials.projectId,
          credentials: credentials.credentials,
        });
        return this.storageClient;
      }

      this.storageClient = new Storage();
      return this.storageClient;
    } catch (e) {
      throw new InternalServerErrorException(
        'Google Cloud Storage client not available. Install @google-cloud/storage and configure GOOGLE_APPLICATION_CREDENTIALS.',
      );
    }
  }

  private parseServiceAccount(raw: string): ServiceAccountCredentials {
    const parsed = JSON.parse(raw);
    const projectId = parsed.project_id || parsed.projectId;
    const clientEmail = parsed.client_email || parsed.clientEmail;
    const privateKey = parsed.private_key || parsed.privateKey;
    if (!projectId || !clientEmail || !privateKey) {
      throw new InternalServerErrorException('Service account credentials are missing required fields.');
    }
    return {
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    };
  }

  private async loadCredentials(): Promise<ServiceAccountCredentials | null> {
    if (this.credentialsPromise) return this.credentialsPromise;
    this.credentialsPromise = this.resolveCredentials();
    return this.credentialsPromise;
  }

  private async resolveCredentials(): Promise<ServiceAccountCredentials | null> {
    let secretName = process.env.GCS_SECRET_NAME;
    if (secretName) {
      if (!secretName.includes('/versions/')) {
        if (secretName.endsWith('/')) {
          secretName = `${secretName}versions/latest`;
        } else {
          secretName = `${secretName}/versions/latest`;
        }
      }
      try {
        const client = await this.getSecretManagerClient();
        const [version] = await client.accessSecretVersion({ name: secretName });
        const payload = version.payload?.data?.toString('utf8');
        if (payload) {
          return this.parseServiceAccount(payload);
        }
      } catch {
        // Silently fall back to local files
      }
    }

    return this.loadLocalCredentials();
  }

  private loadLocalCredentials(): ServiceAccountCredentials | null {
    const cwd = process.cwd();
    const localKeyCandidates = [
      join(cwd, '.secrets', 'gcs-service-account.json'),
      join(cwd, '.secrets', 'gcs.json'),
    ];
    for (const candidate of localKeyCandidates) {
      const resolved = this.findFileUpwards(candidate);
      if (!resolved) continue;
      try {
        const raw = readFileSync(resolved, 'utf8');
        return this.parseServiceAccount(raw);
      } catch {
        continue;
      }
    }
    return null;
  }

  private async getSecretManagerClient(): Promise<any> {
    if (this.secretClient) return this.secretClient;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
    this.secretClient = new SecretManagerServiceClient();
    return this.secretClient;
  }

  private findFileUpwards(filePath: string): string | null {
    const normalized = isAbsolute(filePath) ? filePath : join(process.cwd(), filePath);
    if (existsSync(normalized)) return normalized;
    if (isAbsolute(filePath)) return null;

    let dir = process.cwd();
    while (true) {
      const candidate = join(dir, filePath);
      if (existsSync(candidate)) return candidate;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return null;
  }

  async uploadImage(params: {
    folder: 'products' | 'categories' | 'subcategories' | 'category-icons';
    entityId: string;
    buffer: Buffer;
    mimeType?: string;
    originalName?: string;
  }): Promise<UploadedObject> {
    const bucketName = this.getBucketName();
    const storage = await this.getStorageClient();
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

    const storage = await this.getStorageClient();
    const bucket = storage.bucket(bucketName);
    try {
      await bucket.file(objectName).delete({ ignoreNotFound: true });
    } catch {
      // Non-fatal: don't block DB updates if delete fails
    }
  }
}
