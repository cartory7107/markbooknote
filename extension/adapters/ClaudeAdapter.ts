/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlatformAdapter, CapturedMessage, CapturedConversation } from './BaseAdapter';

export class ClaudeAdapter implements PlatformAdapter {
  public name: 'claude' = 'claude';
  private observer: MutationObserver | null = null;
  private debounceTimer: any = null;

  public matches(url: string): boolean {
    return url.includes('claude.ai');
  }

  public getConversationId(): string {
    const match = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
    if (match && match[1]) {
      const canonicalId = `claude-${match[1]}`;
      try { sessionStorage.setItem('markbook_claude_active_id', canonicalId); } catch (e) {}
      return canonicalId;
    }
    try {
      const existing = sessionStorage.getItem('markbook_claude_active_id');
      if (existing) return existing;
    } catch (e) {}
    const newId = `claude-tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    try { sessionStorage.setItem('markbook_claude_active_id', newId); } catch (e) {}
    return newId;
  }

  public getConversationTitle(): string {
    const headerTitle = document.querySelector('[data-testid="chat-title"], button[aria-label*="Rename"], header h1, h1');
    if (headerTitle && headerTitle.textContent?.trim()) {
      return headerTitle.textContent.trim();
    }
    const docTitle = document.title.replace(/ · Claude/i, '').replace(/Claude/i, '').trim();
    if (docTitle && docTitle.length > 1) {
      return docTitle;
    }
    const firstUserMsg = document.querySelector('[data-testid="user-message"], .font-user-message');
    if (firstUserMsg && firstUserMsg.textContent?.trim()) {
      const text = firstUserMsg.textContent.trim();
      return text.slice(0, 42) + (text.length > 42 ? '...' : '');
    }
    return 'Claude Conversation';
  }

  public extractMessages(): CapturedMessage[] {
    const convoId = this.getConversationId();
    const rawMessages: { role: 'user' | 'assistant'; content: string }[] = [];

    // --- STRATEGY 1: Direct Message-Node Identification ---
    const userNodes = Array.from(document.querySelectorAll(
      '[data-testid="user-message"], .font-user-message, div[class*="font-user"]'
    )).filter(el => !el.parentElement?.closest('[data-testid="user-message"], .font-user-message'));

    const assistantNodes = Array.from(document.querySelectorAll(
      '[data-testid="assistant-message"], .font-claude-message, div[class*="font-claude"], div.font-claude, div.font-tiempos'
    )).filter(el => !el.parentElement?.closest('[data-testid="assistant-message"], .font-claude-message'));

    // Combine in DOM order
    const allTurns: { el: Element; role: 'user' | 'assistant' }[] = [
      ...userNodes.map(el => ({ el, role: 'user' as const })),
      ...assistantNodes.map(el => ({ el, role: 'assistant' as const }))
    ];

    allTurns.sort((a, b) => {
      const pos = a.el.compareDocumentPosition(b.el);
      return (pos & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
    });

    if (allTurns.length > 0) {
      allTurns.forEach(({ el, role }) => {
        const text = this.extractCleanText(el);
        if (text && text.trim().length > 0) {
          rawMessages.push({ role, content: text.trim() });
        }
      });
    }

    // --- STRATEGY 2: Safety Net ---
    if (rawMessages.length > 0 && !rawMessages.some(m => m.role === 'user')) {
      const fallbackUser = document.querySelector('[class*="font-user"], div.grid-cols-1 .prose');
      if (fallbackUser) {
        const text = this.extractCleanText(fallbackUser);
        if (text) rawMessages.unshift({ role: 'user', content: text });
      }
    }
    if (rawMessages.length > 0 && !rawMessages.some(m => m.role === 'assistant')) {
      const fallbackAi = document.querySelector('[class*="font-claude"], div.font-claude');
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

    // 1. Format copyable code blocks & artifacts
    const preBlocks = Array.from(clone.querySelectorAll('pre, [data-testid*="artifact-block"]'));
    preBlocks.forEach((pre) => {
      if (pre.parentElement?.closest('pre')) return;

      const codeEl = pre.querySelector('code');
      let lang = '';
      if (codeEl) {
        const langMatch = codeEl.className.match(/language-([a-zA-Z0-9_-]+)/);
        if (langMatch) lang = langMatch[1];
      }
      if (!lang) {
        const header = pre.querySelector('span, .text-xs, [class*="language"]');
        if (header && header.textContent) {
          const t = header.textContent.trim().toLowerCase();
          if (['python', 'javascript', 'typescript', 'html', 'css', 'bash', 'json', 'sql', 'cpp', 'java'].includes(t)) {
            lang = t;
          }
        }
      }

      pre.querySelectorAll('button, svg, [aria-label*="Copy"]').forEach(b => b.remove());
      const text = (codeEl ? codeEl.textContent : pre.textContent) || '';
      const replacement = document.createTextNode(`\n\`\`\`${lang}\n${text.trim()}\n\`\`\`\n`);
      pre.replaceWith(replacement);
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
      const isAvatar = (img.alt && /avatar|user|profile|assistant|claude|anthropic/i.test(img.alt)) ||
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

    // 4. Remove UI buttons, artifacts preview buttons, copy buttons
    const buttons = clone.querySelectorAll('button, svg, [aria-label*="Copy"], [aria-label*="copy"], .text-text-500');
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
    const streamingEl = document.querySelector('[data-is-streaming="true"], button[aria-label="Stop Response"]');
    return streamingEl !== null;
  }

  public observeMutations(onNewMessageCaptured: (convo: CapturedConversation) => void): void {
    this.disconnect();

    const targetNode = document.querySelector('main') || document.body;
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
            platform: 'claude',
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
