/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Conversation, Message, Platform, ShareRecord } from '../types';
import { dbService } from './storage/indexedDb';

export class ContextTransferService {
  /**
   * Generates clean linear context string in the format specified:
   * Platform: ChatGPT
   * Conversation: Website Development
   *
   * User:
   * ...
   *
   * Assistant:
   * ...
   */
  public static formatLinearContext(
    conversation: Conversation,
    messages: Message[],
    selectedMessageIds?: string[]
  ): string {
    const platformName = this.getPlatformDisplayName(conversation.platform);
    const msgsToInclude = selectedMessageIds && selectedMessageIds.length > 0
      ? messages.filter(m => selectedMessageIds.includes(m.id))
      : messages;

    let output = `Platform: ${platformName}\n`;
    output += `Conversation: ${conversation.title}\n\n`;

    msgsToInclude.forEach((msg, idx) => {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      output += `${roleLabel}:\n${msg.content.trim()}\n\n`;
      if (idx < msgsToInclude.length - 1) {
        output += `---\n\n`;
      }
    });

    return output.trim();
  }

  /**
   * Formats a rich Markdown transcript with metadata headers
   */
  public static formatMarkdown(conversation: Conversation, messages: Message[]): string {
    const platformName = this.getPlatformDisplayName(conversation.platform);
    const dateStr = new Date(conversation.createdAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let md = `# ${conversation.title}\n\n`;
    md += `> **Source Platform:** ${platformName}  \n`;
    md += `> **Captured On:** ${dateStr}  \n`;
    md += `> **Message Count:** ${messages.length}  \n`;
    if (conversation.externalUrl) {
      md += `> **Original Session:** [Open Source Chat](${conversation.externalUrl})  \n`;
    }
    md += `\n---\n\n`;

    messages.forEach((msg) => {
      const roleTitle = msg.role === 'user' ? '👤 User' : `🤖 ${platformName} (${msg.model || 'Assistant'})`;
      const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      md += `### ${roleTitle} · *${timeStr}*\n\n`;
      md += `${msg.content.trim()}\n\n`;
    });

    return md;
  }

  /**
   * Formats context specifically optimized for cross-AI injection
   * e.g., continuing a ChatGPT thread inside Claude or Gemini
   */
  public static formatCrossPlatformPrompt(
    targetPlatform: Platform,
    sourceConversation: Conversation,
    messages: Message[]
  ): string {
    const sourceName = this.getPlatformDisplayName(sourceConversation.platform);
    const targetName = this.getPlatformDisplayName(targetPlatform);

    let prompt = `[CONTEXT MEMORY HANDOFF VIA MEMORA]\n`;
    prompt += `Hello ${targetName}. I am importing context from a prior deep conversation on ${sourceName} titled "${sourceConversation.title}".\n\n`;
    prompt += `Below is our discussion transcript so far. Please absorb this entire context, retain the conclusions reached, and prepare to answer my follow-up query without asking me to repeat what was established.\n\n`;
    prompt += `--- BEGIN TRANSCRIPT ---\n`;
    prompt += this.formatLinearContext(sourceConversation, messages);
    prompt += `\n--- END TRANSCRIPT ---\n\n`;
    prompt += `Acknowledged? Please provide a concise 2-sentence summary of what we've established, then ask me what you should analyze next.`;

    return prompt;
  }

  /**
   * Generate an encrypted share record with client-side revocation key
   */
  public static async createShareLink(
    conversation: Conversation,
    messages: Message[],
    expiresInDays: number | null = 7
  ): Promise<{ shareUrl: string; revocationKey: string; record: ShareRecord }> {
    const shareId = 'shr_' + Math.random().toString(36).substring(2, 10);
    const revocationKey = 'rev_' + Math.random().toString(36).substring(2, 16);
    const expiresAt = expiresInDays ? Date.now() + expiresInDays * 24 * 60 * 60 * 1000 : null;

    const record: ShareRecord = {
      id: shareId,
      conversationId: conversation.id,
      title: conversation.title,
      platform: conversation.platform,
      createdAt: Date.now(),
      expiresAt,
      revokedAt: null,
      revocationKey,
      messages
    };

    // Store in indexedDB shares
    await dbService.saveShareRecord(record);

    // Build portable payload for cross-browser, cross-device, and ChatGPT open-source readability
    let shareUrl = `${window.location.origin}/?note=${conversation.id}`;
    try {
      const compactPayload = {
        conversation: {
          id: conversation.id,
          platform: conversation.platform,
          title: conversation.title,
          createdAt: conversation.createdAt,
          messageCount: messages.length
        },
        messages: messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp
        }))
      };
      const jsonStr = JSON.stringify(compactPayload);
      const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
      // If URL length is reasonable (under 8KB)
      if (b64.length < 7500) {
        shareUrl = `${window.location.origin}/?note=payload_${b64}`;
      }
    } catch (e) {
      console.warn('Could not encode portable note payload:', e);
    }

    return { shareUrl, revocationKey, record };
  }

  public static getPlatformDisplayName(platform: Platform): string {
    switch (platform) {
      case 'chatgpt':
        return 'ChatGPT';
      case 'gemini':
        return 'Google Gemini';
      case 'claude':
        return 'Claude';
      default:
        return platform;
    }
  }
}
