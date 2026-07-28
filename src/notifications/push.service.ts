import * as fs from 'node:fs';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export interface PushSendResult {
  sent: number;
  invalidTokens: string[];
}

/**
 * Sends native push notifications via Firebase Cloud Messaging. No-ops (logs a warning
 * once, then silently skips) when neither FIREBASE_SERVICE_ACCOUNT_JSON nor
 * FIREBASE_SERVICE_ACCOUNT_PATH is configured, so local dev and early deploys work fine
 * with in-app notifications only — mirrors the TURNSTILE_SECRET_KEY no-op pattern.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private app: App | null = null;

  constructor(private readonly config: ConfigService) {
    this.tryInit();
  }

  get isConfigured(): boolean {
    return this.app !== null;
  }

  private tryInit(): void {
    const existing = getApps();
    if (existing.length) {
      this.app = existing[0]!;
      return;
    }

    const json = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    const path = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');

    let serviceAccount: ServiceAccount | null = null;
    try {
      if (json) {
        serviceAccount = JSON.parse(json);
      } else if (path && fs.existsSync(path)) {
        serviceAccount = JSON.parse(fs.readFileSync(path, 'utf8'));
      }
    } catch (err) {
      this.logger.warn(`Could not parse Firebase service account credentials: ${err}`);
    }

    if (!serviceAccount) {
      this.logger.warn(
        'Push notifications are not configured (set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH) — notifications will only appear in-app.',
      );
      return;
    }

    this.app = initializeApp({ credential: cert(serviceAccount) });
    this.logger.log('Firebase push notifications configured.');
  }

  async sendToTokens(
    tokens: string[],
    notification: { title: string; body: string },
    data?: Record<string, string>,
  ): Promise<PushSendResult> {
    if (!this.app || tokens.length === 0) return { sent: 0, invalidTokens: [] };

    try {
      const res = await getMessaging(this.app).sendEachForMulticast({ tokens, notification, data });
      const invalidTokens: string[] = [];
      res.responses.forEach((r, i) => {
        if (
          !r.success &&
          (r.error?.code === 'messaging/registration-token-not-registered' ||
            r.error?.code === 'messaging/invalid-registration-token')
        ) {
          invalidTokens.push(tokens[i]);
        }
      });
      return { sent: res.successCount, invalidTokens };
    } catch (err) {
      this.logger.error(`Failed to send push notification: ${err}`);
      return { sent: 0, invalidTokens: [] };
    }
  }
}
