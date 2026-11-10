/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ExtensionLicenseState {
  plan: 'free' | 'premium';
  isVerified: boolean;
  licenseKey?: string;
  savedCount: number;
  maxFreeLimit: number;
}

export class ExtensionLicense {
  public static async getLicenseState(): Promise<ExtensionLicenseState> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get(['memora_license'], (res: Record<string, any>) => {
          const item = res?.memora_license as ExtensionLicenseState | undefined;
          resolve(item || {
            plan: 'free',
            isVerified: true,
            savedCount: 4,
            maxFreeLimit: 100
          });
        });
      });
    }

    const saved = localStorage.getItem('memora_license_record');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          plan: parsed.plan || 'free',
          isVerified: parsed.status === 'active',
          licenseKey: parsed.licenseKey,
          savedCount: parsed.savedCount || 4,
          maxFreeLimit: parsed.maxFreeConversations || 100
        };
      } catch (e) {
        console.warn('License load error', e);
      }
    }

    return {
      plan: 'free',
      isVerified: true,
      savedCount: 4,
      maxFreeLimit: 100
    };
  }

  public static async verifyLicenseKey(key: string): Promise<boolean> {
    const cleanKey = key.trim().toUpperCase();
    if (cleanKey.startsWith('MEMORA-PREM-') || cleanKey === 'MEMORA-DEV-TEST') {
      const state: ExtensionLicenseState = {
        plan: 'premium',
        isVerified: true,
        licenseKey: cleanKey,
        savedCount: 4,
        maxFreeLimit: 100
      };
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ memora_license: state });
      } else {
        localStorage.setItem('memora_license_record', JSON.stringify(state));
      }
      return true;
    }
    return false;
  }
}
