import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { dirname, extname, isAbsolute, join } from 'path';
import { AppSettingsService } from './app-settings.service';

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
  private storageClientPromise?: Promise<any>;
  private credentialsPromise?: Promise<ServiceAccountCredentials | null>;

  constructor(private readonly appSettingsService: AppSettingsService) {}

  private getBucketName(): string {
    const bucket = process.env.GCS_BUCKET;
    if (!bucket) {
      throw new InternalServerErrorException('GCS_BUCKET is not set');
    }
    return bucket;
  }

  private async getStorageClient(): Promise<any> {
    if (this.storageClient) return this.storageClient;
    if (this.storageClientPromise) return this.storageClientPromise;

    this.storageClientPromise = (async () => {
      try {
        // Keep this as require() so the project can still compile even if the dependency isn't installed yet.
        // Install it with: npm i @google-cloud/storage
        // Credentials are picked up from the DB, env vars, or local secrets.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Storage } = require('@google-cloud/storage');

        const dbCreds = await this.loadCredentialsFromAppSettings();
        if (dbCreds) {
          this.storageClient = new Storage({
            projectId: dbCreds.projectId,
            credentials: dbCreds.credentials,
          });
          return this.storageClient;
        }

        const credentials = await this.findServiceAccountCredentials();
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
    })();

    return this.storageClientPromise;
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

  private async loadCredentialsFromAppSettings(): Promise<ServiceAccountCredentials | null> {
    try {
      const setting = await this.appSettingsService.findGlobalByKey('GCLOUDKEY');
      if (!setting?.value) return null;
      return this.parseServiceAccount(setting.value);
    } catch {
      return null;
    }
  }

  private async findServiceAccountCredentials(): Promise<ServiceAccountCredentials | null> {
    if (this.credentialsPromise) return this.credentialsPromise;
    this.credentialsPromise = (async () => {
      const credentialsJson = process.env.GCS_CREDENTIALS_JSON;
      if (credentialsJson) {
        return this.parseServiceAccount(credentialsJson);
      }

      const keyFilename = process.env.GCS_KEYFILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (keyFilename) {
        const resolved = this.findFileUpwards(keyFilename);
        if (resolved) {
          try {
            const raw = readFileSync(resolved, 'utf8');
            return this.parseServiceAccount(raw);
          } catch {
            // Continue to fallback to local secrets.
          }
        }
      }

      return this.loadLocalCredentials();
    })();
    return this.credentialsPromise;
  }

  private loadLocalCredentials(): ServiceAccountCredentials | null {
    const cwd = process.cwd();
    const candidates = [
      join(cwd, '.secrets', 'gcs-service-account.json'),
      join(cwd, '.secrets', 'gcs.json'),
      join(cwd, 'supercateen.json'),
    ];
    for (const candidate of candidates) {
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
