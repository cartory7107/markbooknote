/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Platform = 'chatgpt' | 'gemini' | 'claude';

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  tokensEstimate?: number;
}

export interface Conversation {
  id: string;
  platform: Platform;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  isFavorite: boolean;
  tags?: string[];
  externalUrl?: string;
  summary?: string;
  messages?: Message[];
}

export interface LicenseRecord {
  id: string;
  userId: string;
  licenseKey: string;
  plan: 'free' | 'premium';
  status: 'active' | 'expired' | 'revoked';
  expiresAt: number | null;
  savedCount: number;
  maxFreeConversations: number; // 100
  deviceCount: number;
  activeDeviceId?: string;
  activatedAt?: number;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: number;
  provider: 'google' | 'email';
}

export interface ShareRecord {
  id: string;
  conversationId: string;
  title: string;
  platform: Platform;
  createdAt: number;
  expiresAt: number | null;
  revokedAt: number | null;
  revocationKey: string;
  messages: Message[];
}

export type ExportFormat = 'markdown' | 'json' | 'text' | 'context_prompt';
