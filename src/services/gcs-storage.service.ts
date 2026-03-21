import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { extname } from 'path';

type UploadedObject = {
  publicUrl: string;
  objectName: string;
  contentType?: string;
};

const HARDCODED_GCS_CREDENTIALS = {
  bucket: 'supercanteen-images',
  projectId: 'supercanteen',
  privateKeyId: 'a87493a026141f60f959794acf51abdc666a675c',
  private_key:
    '-----BEGIN PRIVATE KEY-----\n' +
    'MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDKruvryRb35HjW\n' +
    'v9YD7lFmpn5QmS15l5L0JK67/1TIa+cGE9eMfII85/isX1AsEgSdu4pT08i/dgVZ\n' +
    '8FGnyJm4bUJJuiXbb62UREaFdbV8Aiw8QihZxuqK15s3Xdh6gTWGDC/WgP57K6ui\n' +
    'OLgRLCLkW+nD4KfCDUb91MU2dGOLHxcMCtSChnaOGfK2KLLiiHxvntOt29ICoDzC\n' +
    'vMrR75JYrm8CDIC3Ra9Au445TTD8EoN++pVzNOE63/Cw8w+ls0OgqvzquufIS098\n' +
    '/bvZ1fXbusncy79/l5ZYFxBGjB0iFSTSGzuaPlgp28XgvZGwdd3Ze/EqqgixWFyq\n' +
    'UPWuOWwHAgMBAAECggEALX4xqgzKwP1hOiJ48Qzu7HF2bLTVBjPFYlNRfRUEfK/r\n' +
    'fOu7N+dCfFU89cO3BQ1OR/EuTT5+Eqt07AkK6vQVvNWZSV8k3Com9d6VTaNsBtee\n' +
    'AjB/Shdh0aQvTLAdxPF3iAz4N9dgR1k3/wNoHUKg2kzfHX4xaVb9lj/JvD1HkpQT\n' +
    'mGqg0e6QhC41o6oVwlgNkHsrfTQZHM3Uvw5euf5DcMivVWn6zfTeN7JrlFqeYrRn\n' +
    'bnCAkGd8dVazF5BuWc8RVkG167cusWzrcZOgydEI5hk5Cv8ZcG6gGMHzsMfSJSLr\n' +
    '2ZkHc1/7ZEEPIhhAZow2z2F2uk+k3vgbQFdczBwAoQKBgQDphmQGqx53bAnwILVk\n' +
    'ZCb89W7H42Vys3zm4r4f3wgr2Nu+6rSLNyMASiYUaFCvqBtz3T1Bk/WoICfiEVAP\n' +
    'paTdTt+dSPnDMtip0xWtwaR0FPKF3jfDBhGxQzegobKzp6ZeBn1J+4q1b9eBNqxt\n' +
    'ZFUe6Y6ilH4F/H2rt++zVg80zwKBgQDeMKabx8EO2j6eaeC2c9Z7vmUpMhZ5vwYS\n' +
    'OyII4nVH0RfqWuobTR1+ibLmVCrsghq8L8APUqD6k/a8VkX/yYZkRxc2mvKzLKcn\n' +
    'ljjnVHscFnOhuU+napcLjZ1mncrG/GpfsLJJiJMl6EQu4+z4Lxa7mlVpHOaER4ut\n' +
    'Wp0s+4gTSQKBgDrQqDytuHynb1FVS5o/RzqKrh4V/aUH47ta/DuWtr4kXiQVhOdT\n' +
    'ObOG+VRGeZvkIRXrcNQlacewYZskdR+bvowmo1c/2/f3xG3xRhJ/JOY/qF1i/HRY\n' +
    'APi+TzJbx2BMJzCjPcb2XZcY1hQrKv5aOL4SYOQ9tgfX8ebf6rUmRaotAoGAIOVl\n' +
    'FXVasP9A/CVC3uCBpeqHgbTnvPi6RmK45EXbBVoAx3LUbFxbfIuYkB9wB3ovySLs\n' +
    'tZgPO2pCwpmnXXqRyjD4T95bBooa6XKFVEKew4bTceNE1s2iNVSvNC0yg4mFmktH\n' +
    '6jktSBR+W87lG82k+Pudn6Vmv7j0BiN/V9SZzfkCgYBKDWzNDqntdvPqZE7kdv5I\n' +
    'LetWdpLT3RyIZQnqND53Rp6u6niha4IKhjf/pNTI5/qVJ0ybwSyRloBoiSxNvCxE\n' +
    'xTBRAXakTcOWCHET4zcmAXr0b7S6ZIBw7ntQJ8khBLIFl4PgOcGvNxfvF00GZSkK\n' +
    'eBODI8gR5T/ts3E1JyhdDg==\n' +
    '-----END PRIVATE KEY-----\n',
  client_email: '458693559879-compute@developer.gserviceaccount.com',
  client_id: '115231375108021903775',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url:
    'https://www.googleapis.com/robot/v1/metadata/x509/458693559879-compute@developer.gserviceaccount.com',
  universe_domain: 'googleapis.com',
} as const;

@Injectable()
export class GcsStorageService {
  private getBucketName(): string {
    return HARDCODED_GCS_CREDENTIALS.bucket;
  }

  private getStorageClient(): any {
    try {
      // Keep this as require() so the project can still compile even if the dependency isn't installed yet.
      // Install it with: npm i @google-cloud/storage
      // Credentials are picked up from GOOGLE_APPLICATION_CREDENTIALS (service account JSON path) or other ADC sources.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Storage } = require('@google-cloud/storage');
      return new Storage({
        projectId: HARDCODED_GCS_CREDENTIALS.projectId,
        credentials: {
          client_email: HARDCODED_GCS_CREDENTIALS.client_email,
          private_key: HARDCODED_GCS_CREDENTIALS.private_key,
        },
      });
    } catch (e) {
      throw new InternalServerErrorException(
        'Google Cloud Storage client not available. Install @google-cloud/storage and configure GOOGLE_APPLICATION_CREDENTIALS.',
      );
    }
  }

  async uploadImage(params: {
    folder: 'products' | 'categories' | 'subcategories' | 'category-icons';
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
