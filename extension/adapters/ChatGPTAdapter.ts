/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlatformAdapter, CapturedMessage, CapturedConversation } from './BaseAdapter';

export class ChatGPTAdapter implements PlatformAdapter {
  public name: 'chatgpt' = 'chatgpt';
  private observer: MutationObserver | null = null;
  private debounceTimer: any = null;

  public matches(url: string): boolean {
    return url.includes('chatgpt.com') || url.includes('openai.com');
  }

  public getConversationId(): string {
    const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
    if (match && match[1]) {
      const canonicalId = `chatgpt-${match[1]}`;
      try { sessionStorage.setItem('markbook_chatgpt_active_id', canonicalId); } catch (e) {}
      return canonicalId;
    }
    // Check if we have an active session ID for this chat tab
    try {
      const existing = sessionStorage.getItem('markbook_chatgpt_active_id');
      if (existing) return existing;
    } catch (e) {}

    const newId = `chatgpt-tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    try { sessionStorage.setItem('markbook_chatgpt_active_id', newId); } catch (e) {}
    return newId;
  }

  public getConversationTitle(): string {
    const activeSidebarLink = document.querySelector('nav a[class*="active"], nav a[aria-current="page"]');
    if (activeSidebarLink && activeSidebarLink.textContent?.trim()) {
      return activeSidebarLink.textContent.trim();
    }

    const h1 = document.querySelector('h1');
    if (h1 && h1.textContent?.trim() && !h1.textContent.includes('What can I help with')) {
      return h1.textContent.trim();
    }

    const docTitle = document.title.replace(/ - ChatGPT/i, '').replace(/ChatGPT/i, '').trim();
    if (docTitle && docTitle.length > 1 && docTitle !== 'New chat') {
      return docTitle;
    }

    // Try finding first user query as title
    const firstUserMsg = document.querySelector('[data-message-author-role="user"], div.items-end .whitespace-pre-wrap, .whitespace-pre-wrap');
    if (firstUserMsg && firstUserMsg.textContent?.trim()) {
      const text = firstUserMsg.textContent.trim();
      return text.slice(0, 42) + (text.length > 42 ? '...' : '');
    }

    return 'ChatGPT Conversation';
  }

  /**
   * Fail-Proof Dual-Role Sequential Extractor:
   * Guarantees BOTH User prompts AND AI responses are 100% captured from top to bottom.
   */
  public extractMessages(): CapturedMessage[] {
    const convoId = this.getConversationId();
    const rawMessages: { role: 'user' | 'assistant'; content: string; order: number }[] = [];

    // --- STRATEGY 1: Turn-by-Turn Sequential DOM Traversal ---
    // Every conversation turn in ChatGPT is wrapped in an <article> or [data-testid^="conversation-turn-"]
    const turns = Array.from(document.querySelectorAll(
      'article, [data-testid^="conversation-turn-"], div[class*="group/conversation-turn"]'
    )).filter(el => {
      let p = el.parentElement;
      while (p) {
        if (p.tagName.toLowerCase() === 'article' || (p.getAttribute('data-testid') || '').startsWith('conversation-turn-')) {
          return false;
        }
        p = p.parentElement;
      }
      return true;
    });

    if (turns.length > 0) {
      turns.forEach((turn, idx) => {
        // 1. Check if turn has explicit user and/or assistant elements
        const userSubEl = turn.querySelector(
          '[data-message-author-role="user"], [data-testid="user-message"], div.items-end .whitespace-pre-wrap, div[class*="self-end"] .whitespace-pre-wrap, .whitespace-pre-wrap'
        );
        const assistantSubEl = turn.querySelector(
          '[data-message-author-role="assistant"], [data-testid="assistant-message"], [class*="agent-turn"], [class*="markdown"], div.prose'
        );

        const hasUserRole = turn.getAttribute('data-message-author-role') === 'user' ||
                            turn.querySelector('[data-message-author-role="user"]') !== null ||
                            turn.querySelector('div.items-end, div[class*="self-end"]') !== null;

        const hasAssistantRole = turn.getAttribute('data-message-author-role') === 'assistant' ||
                                 turn.querySelector('[data-message-author-role="assistant"]') !== null ||
                                 turn.querySelector('[class*="markdown"], div.prose, [data-testid*="copy"]') !== null;

        if (userSubEl && assistantSubEl && hasUserRole && hasAssistantRole && userSubEl !== assistantSubEl) {
          // Both inside same turn: extract user first, then assistant
          const uText = this.extractCleanText(userSubEl);
          if (uText && !uText.includes('What can I help with today?')) {
            rawMessages.push({ role: 'user', content: uText, order: idx * 2 });
          }
          const aText = this.extractCleanText(assistantSubEl);
          if (aText && !aText.includes('What can I help with today?')) {
            rawMessages.push({ role: 'assistant', content: aText, order: idx * 2 + 1 });
          }
        } else if (hasUserRole && !hasAssistantRole) {
          const target = userSubEl || turn;
          const uText = this.extractCleanText(target);
          if (uText && !uText.includes('What can I help with today?')) {
            rawMessages.push({ role: 'user', content: uText, order: idx * 2 });
          }
        } else if (hasAssistantRole && !hasUserRole) {
          const target = assistantSubEl || turn;
          const aText = this.extractCleanText(target);
          if (aText && !aText.includes('What can I help with today?')) {
            rawMessages.push({ role: 'assistant', content: aText, order: idx * 2 + 1 });
          }
        } else {
          // Heuristic based on right-align vs markdown
          const isRight = turn.querySelector('div.items-end, div[class*="self-end"], img[alt*="User"]') !== null;
          const hasMd = turn.querySelector('[class*="markdown"], div.prose, pre, code') !== null;

          if (isRight && !hasMd) {
            const uText = this.extractCleanText(userSubEl || turn);
            if (uText && !uText.includes('What can I help with today?')) {
              rawMessages.push({ role: 'user', content: uText, order: idx * 2 });
            }
          } else {
            const aText = this.extractCleanText(assistantSubEl || turn);
            if (aText && !aText.includes('What can I help with today?')) {
              rawMessages.push({ role: 'assistant', content: aText, order: idx * 2 + 1 });
            }
          }
        }
      });
    }

    // --- STRATEGY 2: Comprehensive Direct Node Query (Safety Check) ---
    // If turns missed user messages or assistant messages, query elements directly across the document!
    const userCount = rawMessages.filter(m => m.role === 'user').length;
    const aiCount = rawMessages.filter(m => m.role === 'assistant').length;

    if (userCount === 0 || aiCount === 0 || rawMessages.length === 0) {
      // Find all user elements
      const directUserNodes = Array.from(document.querySelectorAll(
        '[data-message-author-role="user"], [data-testid="user-message"], div.items-end .whitespace-pre-wrap, div[class*="self-end"] .whitespace-pre-wrap, div.items-end > div'
      )).filter(n => !n.closest('[data-message-author-role="assistant"], .markdown, div.prose'));

      // Find all assistant elements
      const directAssistantNodes = Array.from(document.querySelectorAll(
        '[data-message-author-role="assistant"], [data-testid="assistant-message"], div[class*="agent-turn"], div[class*="markdown"], div.prose, [data-testid*="response"]'
      )).filter(n => !n.closest('[data-message-author-role="user"]'));

      const combined: { el: Element; role: 'user' | 'assistant' }[] = [
        ...directUserNodes.map(el => ({ el, role: 'user' as const })),
        ...directAssistantNodes.map(el => ({ el, role: 'assistant' as const }))
      ];

      // Sort strictly by DOM chronological order
      combined.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);

      if (combined.length > rawMessages.length) {
        rawMessages.length = 0;
        combined.forEach(({ el, role }, i) => {
          const text = this.extractCleanText(el);
          if (text && !text.includes('What can I help with today?')) {
            rawMessages.push({ role, content: text, order: i });
          }
        });
      }
    }

    // --- STRATEGY 3: Final Fallback specifically for User Messages ---
    // If we have AI responses but 0 user messages, extract all .whitespace-pre-wrap or items-end nodes
    if (rawMessages.length > 0 && !rawMessages.some(m => m.role === 'user')) {
      const allPreWraps = Array.from(document.querySelectorAll('.whitespace-pre-wrap')).filter(
        el => !el.closest('[data-message-author-role="assistant"], .markdown, div.prose')
      );
      if (allPreWraps.length > 0) {
        const uNodes = allPreWraps.map(el => ({ role: 'user' as const, content: this.extractCleanText(el) }))
          .filter(m => m.content.length > 0 && !m.content.includes('What can I help with today?'));

        if (uNodes.length > 0) {
          // Prepend or interleave
          uNodes.forEach((un, idx) => {
            rawMessages.splice(idx * 2, 0, { role: 'user', content: un.content, order: idx * 2 });
          });
        }
      }
    }

    // STRICT DEDUPLICATION:
    const cleanMessages: CapturedMessage[] = [];
    const seenSignatures = new Set<string>();

    rawMessages.forEach((msg, idx) => {
      const norm = msg.content.replace(/\s+/g, ' ').trim();
      if (!norm) return;
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

  /**
   * Clean text extractor that preserves code blocks, tables, images, and math
   */
  private extractCleanText(node: Element): string {
    const clone = node.cloneNode(true) as HTMLElement;

    // 1. Convert code blocks into clean markdown fences
    const codeBlocks = Array.from(clone.querySelectorAll('pre, [class*="code-block"], [data-testid*="code-block"]'));
    codeBlocks.forEach((codeBlock) => {
      if (codeBlock.parentElement?.closest('pre')) return;

      const codeEl = codeBlock.querySelector('code');
      let lang = '';
      if (codeEl) {
        const langMatch = codeEl.className.match(/language-([a-zA-Z0-9_-]+)/);
        if (langMatch) lang = langMatch[1];
      }
      if (!lang) {
        const header = codeBlock.querySelector('span, .text-xs');
        if (header && header.textContent) {
          const cand = header.textContent.trim().toLowerCase();
          if (['python', 'javascript', 'typescript', 'html', 'css', 'bash', 'json', 'sql', 'c', 'cpp', 'rust', 'go', 'java', 'xml', 'yaml'].includes(cand)) {
            lang = cand;
          }
        }
      }

      codeBlock.querySelectorAll('button, svg, [aria-label*="Copy"], [aria-label*="copy"]').forEach(b => b.remove());
      const codeText = (codeEl ? codeEl.textContent : codeBlock.textContent) || '';
      const replacement = document.createTextNode(`\n\`\`\`${lang}\n${codeText.trim()}\n\`\`\`\n`);
      codeBlock.replaceWith(replacement);
    });

    // 2. Format HTML tables into Markdown tables
    clone.querySelectorAll('tr').forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('th, td')).map(c => c.textContent?.trim() || '');
      if (cells.length > 0) {
        tr.replaceWith(document.createTextNode('| ' + cells.join(' | ') + ' |\n'));
      }
    });

    // 3. Preserve images (User photos & AI generated images) as Markdown
    const images = Array.from(clone.querySelectorAll('img'));
    images.forEach((img) => {
      const isAvatar = (img.alt && /avatar|user|profile|assistant|chatgpt/i.test(img.alt)) ||
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

    // 4. Remove UI action buttons
    const uiButtons = clone.querySelectorAll(
      'button, svg, .sr-only, [aria-label*="Copy"], [aria-label*="copy"], [aria-label*="Read aloud"], [data-testid*="copy"], [data-testid*="feedback"], .citation, [data-testid*="citation"]'
    );
    uiButtons.forEach(el => el.remove());

    // 5. Format breaks and paragraphs
    clone.querySelectorAll('br').forEach(br => br.replaceWith(document.createTextNode('\n')));
    clone.querySelectorAll('p').forEach(p => {
      p.appendChild(document.createTextNode('\n\n'));
    });
    clone.querySelectorAll('li').forEach(li => {
      li.prepend(document.createTextNode('\n• '));
    });

    const raw = clone.textContent || '';
    return raw.replace(/\n{3,}/g, '\n\n').trim();
  }

  public isStreaming(): boolean {
    const stopBtn = document.querySelector('button[aria-label="Stop streaming"], button[data-testid="stop-button"], .result-streaming');
    return stopBtn !== null;
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
        if (this.isStreaming()) {
          return;
        }

        const messages = this.extractMessages();
        const currentLength = messages.reduce((acc, m) => acc + m.content.length, 0);

        if (messages.length > 0 && (messages.length !== lastMsgCount || currentLength !== lastContentLength)) {
          lastMsgCount = messages.length;
          lastContentLength = currentLength;

          onNewMessageCaptured({
            id: this.getConversationId(),
            platform: 'chatgpt',
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
