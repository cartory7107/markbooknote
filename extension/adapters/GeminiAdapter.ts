/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlatformAdapter, CapturedMessage, CapturedConversation } from './BaseAdapter';

export class GeminiAdapter implements PlatformAdapter {
  public name: 'gemini' = 'gemini';
  private observer: MutationObserver | null = null;
  private debounceTimer: any = null;

  public matches(url: string): boolean {
    return url.includes('gemini.google.com');
  }

  public getConversationId(): string {
    const match = window.location.pathname.match(/\/app\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      const canonicalId = `gemini-${match[1]}`;
      try { sessionStorage.setItem('markbook_gemini_active_id', canonicalId); } catch (e) {}
      return canonicalId;
    }
    try {
      const existing = sessionStorage.getItem('markbook_gemini_active_id');
      if (existing) return existing;
    } catch (e) {}
    const newId = `gemini-tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    try { sessionStorage.setItem('markbook_gemini_active_id', newId); } catch (e) {}
    return newId;
  }

  public getConversationTitle(): string {
    const titleEl = document.querySelector('.conversation-title, [data-test-id="conversation-title"], .recent-conversation-item.active, h1');
    if (titleEl && titleEl.textContent?.trim()) {
      return titleEl.textContent.trim();
    }
    const docTitle = document.title.replace(/ - Gemini/i, '').replace(/Google Gemini/i, '').trim();
    if (docTitle && docTitle.length > 1 && !docTitle.toLowerCase().includes('hello')) {
      return docTitle;
    }
    const firstQuery = document.querySelector('user-query-container, .user-query, .query-text');
    if (firstQuery && firstQuery.textContent?.trim()) {
      const text = firstQuery.textContent.trim();
      return text.slice(0, 42) + (text.length > 42 ? '...' : '');
    }
    return 'Google Gemini Conversation';
  }

  public extractMessages(): CapturedMessage[] {
    const convoId = this.getConversationId();
    const rawMessages: { role: 'user' | 'assistant'; content: string }[] = [];

    // --- STRATEGY 1: Direct Turn Extraction ---
    // All user nodes in Gemini
    const userNodes = Array.from(document.querySelectorAll(
      'user-query-container, div[data-test-id="user-query"], .user-query-container, .user-query, div.query-text'
    )).filter(el => !el.parentElement?.closest('user-query-container, div[data-test-id="user-query"], .user-query'));

    // All model/assistant nodes in Gemini
    const assistantNodes = Array.from(document.querySelectorAll(
      'model-response, div[data-test-id="model-response"], .model-response, message-content, .response-container'
    )).filter(el => !el.parentElement?.closest('model-response, div[data-test-id="model-response"], .model-response'));

    // Combine and sort by DOM appearance
    const allTurns: { el: Element; role: 'user' | 'assistant' }[] = [
      ...userNodes.map(el => ({ el, role: 'user' as const })),
      ...assistantNodes.map(el => ({ el, role: 'assistant' as const }))
    ];

    allTurns.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);

    if (allTurns.length > 0) {
      allTurns.forEach(({ el, role }) => {
        const text = this.extractCleanText(el);
        if (text && text.trim().length > 0) {
          rawMessages.push({ role, content: text.trim() });
        }
      });
    }

    // --- STRATEGY 2: Safety Net - Ensure NEITHER role is missing ---
    if (rawMessages.length > 0 && !rawMessages.some(m => m.role === 'user')) {
      const fallbackUser = document.querySelector('user-query, .user-query, [class*="query"]');
      if (fallbackUser) {
        const text = this.extractCleanText(fallbackUser);
        if (text) rawMessages.unshift({ role: 'user', content: text });
      }
    }
    if (rawMessages.length > 0 && !rawMessages.some(m => m.role === 'assistant')) {
      const fallbackAi = document.querySelector('model-response, .model-response, .message-content');
      if (fallbackAi) {
        const text = this.extractCleanText(fallbackAi);
        if (text) rawMessages.push({ role: 'assistant', content: text });
      }
    }

    // STRICT DEDUPLICATION:
    const cleanMessages: CapturedMessage[] = [];
    const seenSignatures = new Set<string>();

    rawMessages.forEach((msg, idx) => {
      const norm = msg.content.replace(/\s+/g, ' ').trim();
      const signature = `${msg.role}:::${norm.slice(0, 100)}:::${norm.slice(-40)}`;
      if (seenSignatures.has(signature)) {
        return;
      }
      seenSignatures.add(signature);

      cleanMessages.push({
        id: `${convoId}_msg_${cleanMessages.length}`,
        role: msg.role,
        content: msg.content,
        timestamp: Date.now() - (rawMessages.length - idx) * 1000
      });
    });

    return cleanMessages;
  }

  private extractCleanText(node: Element): string {
    const clone = node.cloneNode(true) as HTMLElement;

    // 1. Format copyable code blocks (<pre><code>, <code-block>)
    const codeBlocks = Array.from(clone.querySelectorAll('pre, code-block, .code-block, [class*="code-block"]'));
    codeBlocks.forEach((codeBlock) => {
      if (codeBlock.parentElement?.closest('pre, code-block')) return;

      const codeEl = codeBlock.querySelector('code, .formatted-code') || codeBlock;
      let lang = codeBlock.getAttribute('language') || codeBlock.getAttribute('data-language') || '';
      if (!lang) {
        const header = codeBlock.querySelector('.code-block-decoration, .header, span');
        if (header && header.textContent) {
          const t = header.textContent.trim().toLowerCase();
          if (['python', 'javascript', 'typescript', 'html', 'css', 'bash', 'json', 'sql', 'cpp', 'java'].includes(t)) {
            lang = t;
          }
        }
      }

      codeBlock.querySelectorAll('button, svg, mat-icon, .code-block-decoration button').forEach(b => b.remove());
      const text = codeEl.textContent?.trim() || '';
      const replacement = document.createTextNode(`\n\`\`\`${lang}\n${text}\n\`\`\`\n`);
      codeBlock.replaceWith(replacement);
    });

    // 2. Format HTML tables into Markdown tables
    clone.querySelectorAll('tr').forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('th, td')).map(c => c.textContent?.trim() || '');
      if (cells.length > 0) {
        tr.replaceWith(document.createTextNode('| ' + cells.join(' | ') + ' |\n'));
      }
    });

    // 3. Preserve and format images
    const images = Array.from(clone.querySelectorAll('img'));
    images.forEach((img) => {
      const isAvatar = (img.alt && /avatar|user|profile|assistant|gemini|google/i.test(img.alt)) ||
                       (img.className && /avatar/i.test(img.className)) ||
                       (img.width > 0 && img.width <= 28);
      if (isAvatar) {
        img.remove();
        return;
      }
      const src = img.currentSrc || img.src || img.getAttribute('src') || '';
      if (src && !src.startsWith('data:image/svg')) {
        const alt = (img.alt || 'Attached Image').trim();
        img.replaceWith(document.createTextNode(`\n\n![${alt}](${src})\n\n`));
      } else {
        img.remove();
      }
    });

    // 4. Remove buttons, audio icons, copy buttons, mat-icons
    const buttons = clone.querySelectorAll('button, svg, [role="button"], mat-icon, .action-buttons, [aria-label*="Copy"]');
    buttons.forEach(b => b.remove());

    // 5. Format breaks and paragraphs
    clone.querySelectorAll('br').forEach(br => br.replaceWith(document.createTextNode('\n')));
    clone.querySelectorAll('p').forEach(p => p.appendChild(document.createTextNode('\n\n')));
    clone.querySelectorAll('li').forEach(li => {
      li.prepend(document.createTextNode('\n• '));
    });

    const raw = clone.textContent || '';
    return raw.replace(/\n{3,}/g, '\n\n').trim();
  }

  public isStreaming(): boolean {
    const stopButton = document.querySelector('button[aria-label*="Stop"], button.stop-button, mat-progress-bar');
    return stopButton !== null;
  }

  public observeMutations(onNewMessageCaptured: (convo: CapturedConversation) => void): void {
    this.disconnect();

    const targetNode = document.querySelector('chat-window, main') || document.body;
    let lastMsgCount = 0;
    let lastContentLength = 0;

    this.observer = new MutationObserver(() => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        if (this.isStreaming()) return;

        const messages = this.extractMessages();
        const currentLength = messages.reduce((acc, m) => acc + m.content.length, 0);

        if (messages.length > 0 && (messages.length !== lastMsgCount || currentLength !== lastContentLength)) {
          lastMsgCount = messages.length;
          lastContentLength = currentLength;

          onNewMessageCaptured({
            id: this.getConversationId(),
            platform: 'gemini',
            title: this.getConversationTitle(),
            url: window.location.href,
            messages
          });
        }
      }, 1500);
    });

    this.observer.observe(targetNode, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  public disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
