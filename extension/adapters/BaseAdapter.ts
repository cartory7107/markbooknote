/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CapturedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface CapturedConversation {
  id: string;
  platform: 'chatgpt' | 'gemini' | 'claude';
  title: string;
  url: string;
  messages: CapturedMessage[];
  isPinned?: boolean;
  customTitle?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface PlatformAdapter {
  name: 'chatgpt' | 'gemini' | 'claude';
  matches(url: string): boolean;
  getConversationId(): string;
  getConversationTitle(): string;
  extractMessages(): CapturedMessage[];
  observeMutations(onNewMessageCaptured: (convo: CapturedConversation) => void): void;
  disconnect(): void;
}
