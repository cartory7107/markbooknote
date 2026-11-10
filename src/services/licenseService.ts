/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LicenseRecord } from '../types';

const STORAGE_KEY_LICENSE = 'memora_license_record';
const MAX_FREE_CONVERSATIONS = 100;

class LicenseService {
  private licenseRecord: LicenseRecord;
  private listeners: Set<(record: LicenseRecord) => void> = new Set();

  constructor() {
    this.licenseRecord = this.loadStoredLicense();
  }

  public subscribe(callback: (record: LicenseRecord) => void): () => void {
    this.listeners.add(callback);
    callback(this.licenseRecord);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this.licenseRecord);
      } catch (e) {
        console.error('License listener error:', e);
      }
    });
  }

  private loadStoredLicense(): LicenseRecord {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LICENSE);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verify expiry if premium
        if (parsed.plan === 'premium' && parsed.expiresAt && parsed.expiresAt < Date.now()) {
          parsed.status = 'expired';
          // Note: When expired, we DO NOT delete existing data! We simply revert auto-save entitlement to free
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse stored license, falling back to free defaults', e);
    }

    const defaultRecord: LicenseRecord = {
      id: 'lic-free-default',
      userId: 'usr-local-owner',
      licenseKey: 'FREE-TIER-100-CAP',
      plan: 'free',
      status: 'active',
      expiresAt: null,
      savedCount: 4, // Initial 4 seed conversations
      maxFreeConversations: MAX_FREE_CONVERSATIONS,
      deviceCount: 1,
      activeDeviceId: 'dev-chrome-primary'
    };
    return defaultRecord;
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(this.licenseRecord));
    } catch (e) {
      console.error('Could not persist license to localStorage', e);
    }
    this.notify();
  }

  public getLicense(): LicenseRecord {
    return { ...this.licenseRecord };
  }

  public isPremium(): boolean {
    if (this.licenseRecord.plan !== 'premium') return false;
    if (this.licenseRecord.status !== 'active') return false;
    if (this.licenseRecord.expiresAt && this.licenseRecord.expiresAt < Date.now()) return false;
    return true;
  }

  /**
   * Evaluates if a new conversation can be automatically saved.
   * Free tier allows up to 100 conversations.
   * Premium tier allows unlimited conversations.
   * If limit is reached, returns allowed: false with warning message.
   */
  public canSaveNewConversation(currentConversationCount: number): {
    allowed: boolean;
    reason?: string;
    isLimitReached?: boolean;
  } {
    if (this.isPremium()) {
      return { allowed: true };
    }

    if (currentConversationCount >= MAX_FREE_CONVERSATIONS) {
      return {
        allowed: false,
        isLimitReached: true,
        reason: 'Your 100 free conversations have been used. Upgrade to Markbook Note Premium for unlimited automatic saving.'
      };
    }

    return { allowed: true };
  }

  /**
   * Server-side verified activation simulator
   */
  public async activateLicenseKey(key: string): Promise<{ success: boolean; message: string; record?: LicenseRecord }> {
    const cleanKey = key.trim().toUpperCase();

    // Verification algorithm simulator (Matches format MARKBOOK-PREM-XXXX or MEMORA-PREM-XXXX)
    if (!cleanKey.startsWith('MARKBOOK-PREM-') && !cleanKey.startsWith('MEMORA-PREM-') && cleanKey !== 'MARKBOOK-DEV-TEST' && cleanKey !== 'MEMORA-DEV-TEST') {
      return {
        success: false,
        message: 'Invalid license key format. Please provide a verified key from your Markbook Note dashboard.'
      };
    }

    // Verify key against simulated server authority
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    this.licenseRecord = {
      ...this.licenseRecord,
      licenseKey: cleanKey,
      plan: 'premium',
      status: 'active',
      expiresAt,
      activatedAt: Date.now()
    };
    this.persist();

    return {
      success: true,
      message: 'Markbook Note Premium successfully activated! Unlimited automatic capture is now enabled.',
      record: this.licenseRecord
    };
  }

  /**
   * Process simulated payment through bKash, Nagad, or Card
   */
  public async processPayment(provider: 'bkash' | 'nagad' | 'card', details: {
    mobileOrCardNumber: string;
    pinOrOtp?: string;
    trxId?: string;
  }): Promise<{ success: boolean; licenseKey: string; message: string }> {
    // Simulate server-side verification and processing delay
    await new Promise(res => setTimeout(res, 850));

    if (!details.mobileOrCardNumber || details.mobileOrCardNumber.length < 4) {
      throw new Error('Invalid account or card credentials provided.');
    }

    // Generate verified license key token
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomHex2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const generatedKey = `MEMORA-PREM-${randomHex}-${randomHex2}`;

    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    this.licenseRecord = {
      ...this.licenseRecord,
      licenseKey: generatedKey,
      plan: 'premium',
      status: 'active',
      expiresAt,
      activatedAt: Date.now()
    };
    this.persist();

    return {
      success: true,
      licenseKey: generatedKey,
      message: `Payment of ৳40 via ${provider.toUpperCase()} confirmed! Premium license activated.`
    };
  }

  public downgradeToFree(): void {
    this.licenseRecord = {
      ...this.licenseRecord,
      plan: 'free',
      status: 'active',
      licenseKey: 'FREE-TIER-100-CAP',
      expiresAt: null
    };
    this.persist();
  }
}

export const licenseService = new LicenseService();
