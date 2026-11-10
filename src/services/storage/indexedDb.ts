/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Conversation, Message, Platform, ShareRecord } from '../../types';
import { INITIAL_SEED_CONVERSATIONS } from '../seedData';

const DB_NAME = 'memora_db';
const DB_VERSION = 1;

class IndexedDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private changeListeners: Set<() => void> = new Set();

  constructor() {
    this.initDb();
  }

  public subscribe(callback: () => void): () => void {
    this.changeListeners.add(callback);
    return () => this.changeListeners.delete(callback);
  }

  private notify() {
    this.changeListeners.forEach(listener => {
      try {
        listener();
      } catch (err) {
        console.error('Error in IndexedDb change listener:', err);
      }
    });
  }

  private async initDb(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Conversations Store
        if (!db.objectStoreNames.contains('conversations')) {
          const convoStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convoStore.createIndex('platform', 'platform', { unique: false });
          convoStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          convoStore.createIndex('isFavorite', 'isFavorite', { unique: false });
        }

        // Messages Store
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('conversationId', 'conversationId', { unique: false });
          msgStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Shares Store
        if (!db.objectStoreNames.contains('shares')) {
          db.createObjectStore('shares', { keyPath: 'id' });
        }
      };

      request.onsuccess = async () => {
        const db = request.result;
        // Check if database needs initial seeding
        await this.checkAndSeed(db);
        resolve(db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  private async checkAndSeed(db: IDBDatabase): Promise<void> {
    return new Promise((resolve) => {
      const tx = db.transaction(['conversations', 'messages'], 'readwrite');
      const convoStore = tx.objectStore('conversations');
      const countReq = convoStore.count();

      countReq.onsuccess = () => {
        if (countReq.result === 0) {
          const msgStore = tx.objectStore('messages');
          for (const item of INITIAL_SEED_CONVERSATIONS) {
            convoStore.put(item.conversation);
            for (const msg of item.messages) {
              msgStore.put(msg);
            }
          }
        }
      };

      tx.oncomplete = () => {
        resolve();
      };

      tx.onerror = () => {
        resolve(); // gracefully proceed even if seed fails
      };
    });
  }

  public async getAllConversations(filter?: {
    platform?: Platform | 'all';
    search?: string;
    isFavoriteOnly?: boolean;
    sortBy?: 'newest' | 'oldest' | 'messages';
  }): Promise<Conversation[]> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('conversations', 'readonly');
      const store = tx.objectStore('conversations');
      const req = store.getAll();

      req.onsuccess = () => {
        let results: Conversation[] = req.result || [];

        // Filter platform
        if (filter?.platform && filter.platform !== 'all') {
          results = results.filter(c => c.platform === filter.platform);
        }

        // Filter favorites
        if (filter?.isFavoriteOnly) {
          results = results.filter(c => c.isFavorite);
        }

        // Filter search term
        if (filter?.search && filter.search.trim().length > 0) {
          const term = filter.search.toLowerCase().trim();
          results = results.filter(c =>
            c.title.toLowerCase().includes(term) ||
            c.tags?.some(t => t.toLowerCase().includes(term)) ||
            (c.summary && c.summary.toLowerCase().includes(term))
          );
        }

        // Sorting
        const sortBy = filter?.sortBy || 'newest';
        if (sortBy === 'newest') {
          results.sort((a, b) => b.updatedAt - a.updatedAt);
        } else if (sortBy === 'oldest') {
          results.sort((a, b) => a.updatedAt - b.updatedAt);
        } else if (sortBy === 'messages') {
          results.sort((a, b) => b.messageCount - a.messageCount);
        }

        resolve(results);
      };

      req.onerror = () => reject(req.error);
    });
  }

  public async getConversationWithMessages(id: string): Promise<{ conversation: Conversation; messages: Message[] } | null> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['conversations', 'messages'], 'readonly');
      const convoStore = tx.objectStore('conversations');
      const msgStore = tx.objectStore('messages');
      const msgIndex = msgStore.index('conversationId');

      const convoReq = convoStore.get(id);
      const msgReq = msgIndex.getAll(id);

      tx.oncomplete = () => {
        if (!convoReq.result) {
          resolve(null);
          return;
        }
        const rawMessages: Message[] = msgReq.result || [];
        rawMessages.sort((a, b) => a.timestamp - b.timestamp);

        // Strict de-duplication: remove any duplicate message entries
        const seen = new Set<string>();
        const messages = rawMessages.filter(m => {
          const norm = m.content.replace(/\s+/g, ' ').trim();
          const sig = `${m.role}:::${norm.slice(0, 100)}:::${norm.slice(-40)}`;
          if (seen.has(sig)) return false;
          seen.add(sig);
          return true;
        });

        resolve({
          conversation: { ...convoReq.result, messageCount: messages.length, messages },
          messages
        });
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  public async saveConversation(conversation: Conversation, messages: Message[]): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['conversations', 'messages'], 'readwrite');
      const convoStore = tx.objectStore('conversations');
      const msgStore = tx.objectStore('messages');

      convoStore.put(conversation);
      for (const msg of messages) {
        msgStore.put(msg);
      }

      tx.oncomplete = () => {
        this.notify();
        resolve();
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  public async updateTitle(id: string, newTitle: string): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('conversations', 'readwrite');
      const store = tx.objectStore('conversations');
      const req = store.get(id);

      req.onsuccess = () => {
        if (req.result) {
          const updated: Conversation = {
            ...req.result,
            title: newTitle.trim(),
            updatedAt: Date.now()
          };
          store.put(updated);
        }
      };

      tx.oncomplete = () => {
        this.notify();
        resolve();
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  public async toggleFavorite(id: string): Promise<boolean> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('conversations', 'readwrite');
      const store = tx.objectStore('conversations');
      const req = store.get(id);
      let newState = false;

      req.onsuccess = () => {
        if (req.result) {
          newState = !req.result.isFavorite;
          const updated: Conversation = {
            ...req.result,
            isFavorite: newState
          };
          store.put(updated);
        }
      };

      tx.oncomplete = () => {
        this.notify();
        resolve(newState);
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  public async deleteConversation(id: string): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['conversations', 'messages'], 'readwrite');
      const convoStore = tx.objectStore('conversations');
      const msgStore = tx.objectStore('messages');
      const msgIndex = msgStore.index('conversationId');

      convoStore.delete(id);

      const msgReq = msgIndex.getAllKeys(id);
      msgReq.onsuccess = () => {
        const keys = msgReq.result;
        for (const k of keys) {
          msgStore.delete(k);
        }
      };

      tx.oncomplete = () => {
        this.notify();
        resolve();
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  public async getStats(): Promise<{
    totalConversations: number;
    totalMessages: number;
    platformCounts: { chatgpt: number; gemini: number; claude: number };
    favoritesCount: number;
  }> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['conversations', 'messages'], 'readonly');
      const convoStore = tx.objectStore('conversations');
      const msgStore = tx.objectStore('messages');

      const convoReq = convoStore.getAll();
      const msgCountReq = msgStore.count();

      tx.oncomplete = () => {
        const convos: Conversation[] = convoReq.result || [];
        const totalMessages = msgCountReq.result || 0;

        const counts = {
          chatgpt: 0,
          gemini: 0,
          claude: 0
        };
        let favoritesCount = 0;

        for (const c of convos) {
          if (c.platform in counts) {
            counts[c.platform]++;
          }
          if (c.isFavorite) {
            favoritesCount++;
          }
        }

        resolve({
          totalConversations: convos.length,
          totalMessages,
          platformCounts: counts,
          favoritesCount
        });
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  public async exportAllData(): Promise<string> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['conversations', 'messages'], 'readonly');
      const convoReq = tx.objectStore('conversations').getAll();
      const msgReq = tx.objectStore('messages').getAll();

      tx.oncomplete = () => {
        const payload = {
          version: '1.0.0',
          app: 'Memora',
          exportedAt: new Date().toISOString(),
          conversations: convoReq.result || [],
          messages: msgReq.result || []
        };
        resolve(JSON.stringify(payload, null, 2));
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  public async importData(jsonContent: string): Promise<{ importedConversations: number; importedMessages: number }> {
    const parsed = JSON.parse(jsonContent);
    if (!parsed.conversations || !Array.isArray(parsed.conversations)) {
      throw new Error('Invalid Memora backup file: missing conversations array');
    }

    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['conversations', 'messages'], 'readwrite');
      const convoStore = tx.objectStore('conversations');
      const msgStore = tx.objectStore('messages');

      let convoCount = 0;
      let msgCount = 0;

      for (const c of parsed.conversations) {
        convoStore.put(c);
        convoCount++;
      }

      if (parsed.messages && Array.isArray(parsed.messages)) {
        for (const m of parsed.messages) {
          msgStore.put(m);
          msgCount++;
        }
      }

      tx.oncomplete = () => {
        this.notify();
        resolve({ importedConversations: convoCount, importedMessages: msgCount });
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  public async saveShareRecord(share: ShareRecord): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('shares', 'readwrite');
      tx.objectStore('shares').put(share);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getShareRecord(id: string): Promise<ShareRecord | null> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('shares', 'readonly');
      const req = tx.objectStore('shares').get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  public async revokeShareRecord(id: string): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('shares', 'readwrite');
      const store = tx.objectStore('shares');
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          const updated: ShareRecord = {
            ...req.result,
            revokedAt: Date.now()
          };
          store.put(updated);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async syncExtensionConversations(extConvos: any[]): Promise<number> {
    const db = await this.initDb();
    let imported = 0;

    return new Promise((resolve) => {
      const tx = db.transaction(['conversations', 'messages'], 'readwrite');
      const convoStore = tx.objectStore('conversations');
      const msgStore = tx.objectStore('messages');
      const msgIndex = msgStore.index('conversationId');

      for (const item of extConvos) {
        if (!item.id || !item.messages || !Array.isArray(item.messages)) continue;

        // Clean out any legacy messages with old IDs for this conversation
        const keyRange = IDBKeyRange.only(item.id);
        const cursorReq = msgIndex.openCursor(keyRange);
        cursorReq.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };

        const cleanMessages: Message[] = [];
        const seenSignatures = new Set<string>();

        item.messages.forEach((m: any, idx: number) => {
          const norm = (m.content || '').replace(/\s+/g, ' ').trim();
          const sig = `${m.role}:::${norm.slice(0, 100)}:::${norm.slice(-40)}`;
          if (seenSignatures.has(sig)) return;
          seenSignatures.add(sig);

          const msg: Message = {
            id: `${item.id}_turn_${cleanMessages.length}`,
            conversationId: item.id,
            role: m.role || 'assistant',
            content: m.content || '',
            timestamp: m.timestamp || (Date.now() - (item.messages.length - idx) * 1000)
          };
          cleanMessages.push(msg);
          msgStore.put(msg);
        });

        const convo: Conversation = {
          id: item.id,
          platform: item.platform || 'chatgpt',
          title: item.title || 'Captured Conversation',
          createdAt: item.createdAt || Date.now(),
          updatedAt: item.updatedAt || Date.now(),
          messageCount: cleanMessages.length,
          isFavorite: false,
          externalUrl: item.url,
          summary: cleanMessages[cleanMessages.length - 1]?.content?.slice(0, 100)
        };

        convoStore.put(convo);
        imported++;
      }

      tx.oncomplete = () => {
        this.notify();
        resolve(imported);
      };

      tx.onerror = () => {
        resolve(0);
      };
    });
  }

  public async clearAllData(): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['conversations', 'messages', 'shares'], 'readwrite');
      tx.objectStore('conversations').clear();
      tx.objectStore('messages').clear();
      tx.objectStore('shares').clear();
      tx.oncomplete = () => {
        this.notify();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const dbService = new IndexedDbService();
