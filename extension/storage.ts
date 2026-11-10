/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CapturedConversation } from './adapters/BaseAdapter';

const EXTENSION_STORAGE_KEY_SETTINGS = 'memora_settings';
const EXTENSION_STORAGE_KEY_CONVOS = 'memora_local_conversations';
const EXTENSION_STORAGE_KEY_USER = 'memora_user_session';

export interface ExtensionSettings {
  autoSaveMode: boolean;
  activePlatformFilter: string;
  maxFreeLimit: number;
}

export class ExtensionStorage {
  public static async getUserSession(): Promise<{ email: string; name: string } | null> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([EXTENSION_STORAGE_KEY_USER], (res: Record<string, any>) => {
          resolve(res?.[EXTENSION_STORAGE_KEY_USER] || null);
        });
      });
    }
    const saved = localStorage.getItem(EXTENSION_STORAGE_KEY_USER);
    return saved ? JSON.parse(saved) : null;
  }

  public static async setUserSession(session: { email: string; name: string } | null): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      if (session) {
        await chrome.storage.local.set({ [EXTENSION_STORAGE_KEY_USER]: session });
      } else {
        await chrome.storage.local.remove([EXTENSION_STORAGE_KEY_USER]);
      }
    }
    if (session) {
      localStorage.setItem(EXTENSION_STORAGE_KEY_USER, JSON.stringify(session));
    } else {
      localStorage.removeItem(EXTENSION_STORAGE_KEY_USER);
    }
  }

  public static async getSettings(): Promise<ExtensionSettings> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([EXTENSION_STORAGE_KEY_SETTINGS], (res: Record<string, any>) => {
          const item = res?.[EXTENSION_STORAGE_KEY_SETTINGS] as ExtensionSettings | undefined;
          resolve(item || {
            autoSaveMode: true,
            activePlatformFilter: 'all',
            maxFreeLimit: 100
          });
        });
      });
    }

    const saved = localStorage.getItem(EXTENSION_STORAGE_KEY_SETTINGS);
    return saved ? JSON.parse(saved) : { autoSaveMode: true, activePlatformFilter: 'all', maxFreeLimit: 100 };
  }

  public static async updateSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [EXTENSION_STORAGE_KEY_SETTINGS]: updated });
    } else {
      localStorage.setItem(EXTENSION_STORAGE_KEY_SETTINGS, JSON.stringify(updated));
    }
  }

  public static async saveCapturedConversation(convo: CapturedConversation): Promise<{ saved: boolean; reason?: string }> {
    // Deduplicate messages within the conversation itself
    const dedupedMessages = convo.messages.filter((msg, idx, arr) => {
      const prevIdx = arr.findIndex(m => m.role === msg.role && m.content.trim() === msg.content.trim());
      return prevIdx === idx;
    });

    const user = await this.getUserSession();
    const cleanConvo: CapturedConversation = {
      ...convo,
      messages: dedupedMessages,
      createdAt: convo.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    const currentList = await this.getCapturedConversations();

    // Check by ID OR matching URL OR root user prompt on the same platform
    const cleanFirstUserMsg = cleanConvo.messages.find(m => m.role === 'user')?.content.trim().slice(0, 100);

    const existingIndex = currentList.findIndex(c => {
      // 1. Direct ID match
      if (c.id === cleanConvo.id) return true;
      if (c.platform !== cleanConvo.platform) return false;

      // 2. Specific chat URL match (e.g. /c/uuid or /app/id or /chat/uuid)
      if (c.url && cleanConvo.url && c.url.includes('/c/') && cleanConvo.url.includes('/c/')) {
        if (c.url.split('?')[0] === cleanConvo.url.split('?')[0]) return true;
      }

      // 3. First user prompt match on same platform (exact same conversation thread!)
      if (cleanFirstUserMsg && c.messages && c.messages.length > 0) {
        const cFirstUser = c.messages.find(m => m.role === 'user')?.content.trim().slice(0, 100);
        if (cFirstUser && cFirstUser === cleanFirstUserMsg) {
          return true;
        }
      }

      return false;
    });

    if (existingIndex >= 0) {
      const existing = currentList[existingIndex];
      // Keep whichever has more turns or latest update
      const messagesToKeep = (cleanConvo.messages.length >= existing.messages.length)
        ? cleanConvo.messages
        : existing.messages;

      // Keep canonical ID if existing had a server-assigned ID like chatgpt-uuid
      const resolvedId = (existing.id && !existing.id.includes('-tab-')) ? existing.id : cleanConvo.id;

      currentList[existingIndex] = {
        ...cleanConvo,
        id: resolvedId,
        messages: messagesToKeep,
        title: existing.customTitle || existing.title || cleanConvo.title,
        customTitle: existing.customTitle,
        isPinned: existing.isPinned || false,
        createdAt: existing.createdAt || cleanConvo.createdAt,
        updatedAt: Date.now()
      };
    } else {
      currentList.unshift(cleanConvo);
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [EXTENSION_STORAGE_KEY_CONVOS]: currentList.slice(0, 300) });
    } else {
      localStorage.setItem(EXTENSION_STORAGE_KEY_CONVOS, JSON.stringify(currentList.slice(0, 300)));
    }

    return { saved: true };
  }

  public static async togglePin(id: string): Promise<boolean> {
    const list = await this.getCapturedConversations();
    const item = list.find(c => c.id === id);
    let newState = false;
    if (item) {
      item.isPinned = !item.isPinned;
      newState = item.isPinned;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [EXTENSION_STORAGE_KEY_CONVOS]: list });
      } else {
        localStorage.setItem(EXTENSION_STORAGE_KEY_CONVOS, JSON.stringify(list));
      }
    }
    return newState;
  }

  public static async updateTitle(id: string, newTitle: string): Promise<void> {
    const list = await this.getCapturedConversations();
    const item = list.find(c => c.id === id);
    if (item) {
      item.title = newTitle.trim();
      item.customTitle = newTitle.trim();
      item.updatedAt = Date.now();
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [EXTENSION_STORAGE_KEY_CONVOS]: list });
      } else {
        localStorage.setItem(EXTENSION_STORAGE_KEY_CONVOS, JSON.stringify(list));
      }
    }
  }

  public static async getCapturedConversations(): Promise<CapturedConversation[]> {
    let list: CapturedConversation[] = [];
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      list = await new Promise((resolve) => {
        chrome.storage.local.get([EXTENSION_STORAGE_KEY_CONVOS], (res: Record<string, any>) => {
          resolve(res?.[EXTENSION_STORAGE_KEY_CONVOS] || []);
        });
      });
    } else {
      const saved = localStorage.getItem(EXTENSION_STORAGE_KEY_CONVOS);
      list = saved ? JSON.parse(saved) : [];
    }

    // Sort: Pinned items first, then by updatedAt descending
    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }

  public static async setAllConversations(list: CapturedConversation[]): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [EXTENSION_STORAGE_KEY_CONVOS]: list });
    } else {
      localStorage.setItem(EXTENSION_STORAGE_KEY_CONVOS, JSON.stringify(list));
    }
  }
}
