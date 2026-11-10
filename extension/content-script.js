(() => {
  // extension/adapters/ChatGPTAdapter.ts
  var ChatGPTAdapter = class {
    constructor() {
      this.name = "chatgpt";
      this.observer = null;
      this.debounceTimer = null;
    }
    matches(url) {
      return url.includes("chatgpt.com") || url.includes("openai.com");
    }
    getConversationId() {
      const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
      if (match && match[1]) {
        const canonicalId = `chatgpt-${match[1]}`;
        try {
          sessionStorage.setItem("markbook_chatgpt_active_id", canonicalId);
        } catch (e) {
        }
        return canonicalId;
      }
      try {
        const existing = sessionStorage.getItem("markbook_chatgpt_active_id");
        if (existing) return existing;
      } catch (e) {
      }
      const newId = `chatgpt-tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      try {
        sessionStorage.setItem("markbook_chatgpt_active_id", newId);
      } catch (e) {
      }
      return newId;
    }
    getConversationTitle() {
      const activeSidebarLink = document.querySelector('nav a[class*="active"], nav a[aria-current="page"]');
      if (activeSidebarLink && activeSidebarLink.textContent?.trim()) {
        return activeSidebarLink.textContent.trim();
      }
      const h1 = document.querySelector("h1");
      if (h1 && h1.textContent?.trim() && !h1.textContent.includes("What can I help with")) {
        return h1.textContent.trim();
      }
      const docTitle = document.title.replace(/ - ChatGPT/i, "").replace(/ChatGPT/i, "").trim();
      if (docTitle && docTitle.length > 1 && docTitle !== "New chat") {
        return docTitle;
      }
      const firstUserMsg = document.querySelector('[data-message-author-role="user"], div.items-end .whitespace-pre-wrap, .whitespace-pre-wrap');
      if (firstUserMsg && firstUserMsg.textContent?.trim()) {
        const text = firstUserMsg.textContent.trim();
        return text.slice(0, 42) + (text.length > 42 ? "..." : "");
      }
      return "ChatGPT Conversation";
    }
    /**
     * Fail-Proof Dual-Role Sequential Extractor:
     * Guarantees BOTH User prompts AND AI responses are 100% captured from top to bottom.
     */
    extractMessages() {
      const convoId = this.getConversationId();
      const rawMessages = [];
      const turns = Array.from(document.querySelectorAll(
        'article, [data-testid^="conversation-turn-"], div[class*="group/conversation-turn"]'
      )).filter((el) => {
        let p = el.parentElement;
        while (p) {
          if (p.tagName.toLowerCase() === "article" || (p.getAttribute("data-testid") || "").startsWith("conversation-turn-")) {
            return false;
          }
          p = p.parentElement;
        }
        return true;
      });
      if (turns.length > 0) {
        turns.forEach((turn, idx) => {
          const userSubEl = turn.querySelector(
            '[data-message-author-role="user"], [data-testid="user-message"], div.items-end .whitespace-pre-wrap, div[class*="self-end"] .whitespace-pre-wrap, .whitespace-pre-wrap'
          );
          const assistantSubEl = turn.querySelector(
            '[data-message-author-role="assistant"], [data-testid="assistant-message"], [class*="agent-turn"], [class*="markdown"], div.prose'
          );
          const hasUserRole = turn.getAttribute("data-message-author-role") === "user" || turn.querySelector('[data-message-author-role="user"]') !== null || turn.querySelector('div.items-end, div[class*="self-end"]') !== null;
          const hasAssistantRole = turn.getAttribute("data-message-author-role") === "assistant" || turn.querySelector('[data-message-author-role="assistant"]') !== null || turn.querySelector('[class*="markdown"], div.prose, [data-testid*="copy"]') !== null;
          if (userSubEl && assistantSubEl && hasUserRole && hasAssistantRole && userSubEl !== assistantSubEl) {
            const uText = this.extractCleanText(userSubEl);
            if (uText && !uText.includes("What can I help with today?")) {
              rawMessages.push({ role: "user", content: uText, order: idx * 2 });
            }
            const aText = this.extractCleanText(assistantSubEl);
            if (aText && !aText.includes("What can I help with today?")) {
              rawMessages.push({ role: "assistant", content: aText, order: idx * 2 + 1 });
            }
          } else if (hasUserRole && !hasAssistantRole) {
            const target = userSubEl || turn;
            const uText = this.extractCleanText(target);
            if (uText && !uText.includes("What can I help with today?")) {
              rawMessages.push({ role: "user", content: uText, order: idx * 2 });
            }
          } else if (hasAssistantRole && !hasUserRole) {
            const target = assistantSubEl || turn;
            const aText = this.extractCleanText(target);
            if (aText && !aText.includes("What can I help with today?")) {
              rawMessages.push({ role: "assistant", content: aText, order: idx * 2 + 1 });
            }
          } else {
            const isRight = turn.querySelector('div.items-end, div[class*="self-end"], img[alt*="User"]') !== null;
            const hasMd = turn.querySelector('[class*="markdown"], div.prose, pre, code') !== null;
            if (isRight && !hasMd) {
              const uText = this.extractCleanText(userSubEl || turn);
              if (uText && !uText.includes("What can I help with today?")) {
                rawMessages.push({ role: "user", content: uText, order: idx * 2 });
              }
            } else {
              const aText = this.extractCleanText(assistantSubEl || turn);
              if (aText && !aText.includes("What can I help with today?")) {
                rawMessages.push({ role: "assistant", content: aText, order: idx * 2 + 1 });
              }
            }
          }
        });
      }
      const userCount = rawMessages.filter((m) => m.role === "user").length;
      const aiCount = rawMessages.filter((m) => m.role === "assistant").length;
      if (userCount === 0 || aiCount === 0 || rawMessages.length === 0) {
        const directUserNodes = Array.from(document.querySelectorAll(
          '[data-message-author-role="user"], [data-testid="user-message"], div.items-end .whitespace-pre-wrap, div[class*="self-end"] .whitespace-pre-wrap, div.items-end > div'
        )).filter((n) => !n.closest('[data-message-author-role="assistant"], .markdown, div.prose'));
        const directAssistantNodes = Array.from(document.querySelectorAll(
          '[data-message-author-role="assistant"], [data-testid="assistant-message"], div[class*="agent-turn"], div[class*="markdown"], div.prose, [data-testid*="response"]'
        )).filter((n) => !n.closest('[data-message-author-role="user"]'));
        const combined = [
          ...directUserNodes.map((el) => ({ el, role: "user" })),
          ...directAssistantNodes.map((el) => ({ el, role: "assistant" }))
        ];
        combined.sort((a, b) => a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
        if (combined.length > rawMessages.length) {
          rawMessages.length = 0;
          combined.forEach(({ el, role }, i) => {
            const text = this.extractCleanText(el);
            if (text && !text.includes("What can I help with today?")) {
              rawMessages.push({ role, content: text, order: i });
            }
          });
        }
      }
      if (rawMessages.length > 0 && !rawMessages.some((m) => m.role === "user")) {
        const allPreWraps = Array.from(document.querySelectorAll(".whitespace-pre-wrap")).filter(
          (el) => !el.closest('[data-message-author-role="assistant"], .markdown, div.prose')
        );
        if (allPreWraps.length > 0) {
          const uNodes = allPreWraps.map((el) => ({ role: "user", content: this.extractCleanText(el) })).filter((m) => m.content.length > 0 && !m.content.includes("What can I help with today?"));
          if (uNodes.length > 0) {
            uNodes.forEach((un, idx) => {
              rawMessages.splice(idx * 2, 0, { role: "user", content: un.content, order: idx * 2 });
            });
          }
        }
      }
      const cleanMessages = [];
      const seenSignatures = /* @__PURE__ */ new Set();
      rawMessages.forEach((msg, idx) => {
        const norm = msg.content.replace(/\s+/g, " ").trim();
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
          timestamp: Date.now() - (rawMessages.length - idx) * 1e3
        });
      });
      return cleanMessages;
    }
    /**
     * Clean text extractor that preserves code blocks, tables, images, and math
     */
    extractCleanText(node) {
      const clone = node.cloneNode(true);
      const codeBlocks = Array.from(clone.querySelectorAll('pre, [class*="code-block"], [data-testid*="code-block"]'));
      codeBlocks.forEach((codeBlock) => {
        if (codeBlock.parentElement?.closest("pre")) return;
        const codeEl = codeBlock.querySelector("code");
        let lang = "";
        if (codeEl) {
          const langMatch = codeEl.className.match(/language-([a-zA-Z0-9_-]+)/);
          if (langMatch) lang = langMatch[1];
        }
        if (!lang) {
          const header = codeBlock.querySelector("span, .text-xs");
          if (header && header.textContent) {
            const cand = header.textContent.trim().toLowerCase();
            if (["python", "javascript", "typescript", "html", "css", "bash", "json", "sql", "c", "cpp", "rust", "go", "java", "xml", "yaml"].includes(cand)) {
              lang = cand;
            }
          }
        }
        codeBlock.querySelectorAll('button, svg, [aria-label*="Copy"], [aria-label*="copy"]').forEach((b) => b.remove());
        const codeText = (codeEl ? codeEl.textContent : codeBlock.textContent) || "";
        const replacement = document.createTextNode(`
\`\`\`${lang}
${codeText.trim()}
\`\`\`
`);
        codeBlock.replaceWith(replacement);
      });
      clone.querySelectorAll("tr").forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll("th, td")).map((c) => c.textContent?.trim() || "");
        if (cells.length > 0) {
          tr.replaceWith(document.createTextNode("| " + cells.join(" | ") + " |\n"));
        }
      });
      const images = Array.from(clone.querySelectorAll("img"));
      images.forEach((img) => {
        const isAvatar = img.alt && /avatar|user|profile|assistant|chatgpt/i.test(img.alt) || img.className && /avatar/i.test(img.className) || img.width > 0 && img.width <= 28;
        if (isAvatar) {
          img.remove();
          return;
        }
        const src = img.currentSrc || img.src || img.getAttribute("src") || "";
        if (src && !src.startsWith("data:image/svg")) {
          const alt = (img.alt || "Attached Image").trim();
          img.replaceWith(document.createTextNode(`

![${alt}](${src})

`));
        } else {
          img.remove();
        }
      });
      const uiButtons = clone.querySelectorAll(
        'button, svg, .sr-only, [aria-label*="Copy"], [aria-label*="copy"], [aria-label*="Read aloud"], [data-testid*="copy"], [data-testid*="feedback"], .citation, [data-testid*="citation"]'
      );
      uiButtons.forEach((el) => el.remove());
      clone.querySelectorAll("br").forEach((br) => br.replaceWith(document.createTextNode("\n")));
      clone.querySelectorAll("p").forEach((p) => {
        p.appendChild(document.createTextNode("\n\n"));
      });
      clone.querySelectorAll("li").forEach((li) => {
        li.prepend(document.createTextNode("\n\u2022 "));
      });
      const raw = clone.textContent || "";
      return raw.replace(/\n{3,}/g, "\n\n").trim();
    }
    isStreaming() {
      const stopBtn = document.querySelector('button[aria-label="Stop streaming"], button[data-testid="stop-button"], .result-streaming');
      return stopBtn !== null;
    }
    observeMutations(onNewMessageCaptured) {
      this.disconnect();
      const targetNode = document.querySelector("main") || document.body;
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
              platform: "chatgpt",
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
    disconnect() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    }
  };

  // extension/adapters/GeminiAdapter.ts
  var GeminiAdapter = class {
    constructor() {
      this.name = "gemini";
      this.observer = null;
      this.debounceTimer = null;
    }
    matches(url) {
      return url.includes("gemini.google.com");
    }
    getConversationId() {
      const match = window.location.pathname.match(/\/app\/([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        const canonicalId = `gemini-${match[1]}`;
        try {
          sessionStorage.setItem("markbook_gemini_active_id", canonicalId);
        } catch (e) {
        }
        return canonicalId;
      }
      try {
        const existing = sessionStorage.getItem("markbook_gemini_active_id");
        if (existing) return existing;
      } catch (e) {
      }
      const newId = `gemini-tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      try {
        sessionStorage.setItem("markbook_gemini_active_id", newId);
      } catch (e) {
      }
      return newId;
    }
    getConversationTitle() {
      const titleEl = document.querySelector('.conversation-title, [data-test-id="conversation-title"], .recent-conversation-item.active, h1');
      if (titleEl && titleEl.textContent?.trim()) {
        return titleEl.textContent.trim();
      }
      const docTitle = document.title.replace(/ - Gemini/i, "").replace(/Google Gemini/i, "").trim();
      if (docTitle && docTitle.length > 1 && !docTitle.toLowerCase().includes("hello")) {
        return docTitle;
      }
      const firstQuery = document.querySelector("user-query-container, .user-query, .query-text");
      if (firstQuery && firstQuery.textContent?.trim()) {
        const text = firstQuery.textContent.trim();
        return text.slice(0, 42) + (text.length > 42 ? "..." : "");
      }
      return "Google Gemini Conversation";
    }
    extractMessages() {
      const convoId = this.getConversationId();
      const rawMessages = [];
      const userNodes = Array.from(document.querySelectorAll(
        'user-query-container, div[data-test-id="user-query"], .user-query-container, .user-query, div.query-text'
      )).filter((el) => !el.parentElement?.closest('user-query-container, div[data-test-id="user-query"], .user-query'));
      const assistantNodes = Array.from(document.querySelectorAll(
        'model-response, div[data-test-id="model-response"], .model-response, message-content, .response-container'
      )).filter((el) => !el.parentElement?.closest('model-response, div[data-test-id="model-response"], .model-response'));
      const allTurns = [
        ...userNodes.map((el) => ({ el, role: "user" })),
        ...assistantNodes.map((el) => ({ el, role: "assistant" }))
      ];
      allTurns.sort((a, b) => a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
      if (allTurns.length > 0) {
        allTurns.forEach(({ el, role }) => {
          const text = this.extractCleanText(el);
          if (text && text.trim().length > 0) {
            rawMessages.push({ role, content: text.trim() });
          }
        });
      }
      if (rawMessages.length > 0 && !rawMessages.some((m) => m.role === "user")) {
        const fallbackUser = document.querySelector('user-query, .user-query, [class*="query"]');
        if (fallbackUser) {
          const text = this.extractCleanText(fallbackUser);
          if (text) rawMessages.unshift({ role: "user", content: text });
        }
      }
      if (rawMessages.length > 0 && !rawMessages.some((m) => m.role === "assistant")) {
        const fallbackAi = document.querySelector("model-response, .model-response, .message-content");
        if (fallbackAi) {
          const text = this.extractCleanText(fallbackAi);
          if (text) rawMessages.push({ role: "assistant", content: text });
        }
      }
      const cleanMessages = [];
      const seenSignatures = /* @__PURE__ */ new Set();
      rawMessages.forEach((msg, idx) => {
        const norm = msg.content.replace(/\s+/g, " ").trim();
        const signature = `${msg.role}:::${norm.slice(0, 100)}:::${norm.slice(-40)}`;
        if (seenSignatures.has(signature)) {
          return;
        }
        seenSignatures.add(signature);
        cleanMessages.push({
          id: `${convoId}_msg_${cleanMessages.length}`,
          role: msg.role,
          content: msg.content,
          timestamp: Date.now() - (rawMessages.length - idx) * 1e3
        });
      });
      return cleanMessages;
    }
    extractCleanText(node) {
      const clone = node.cloneNode(true);
      const codeBlocks = Array.from(clone.querySelectorAll('pre, code-block, .code-block, [class*="code-block"]'));
      codeBlocks.forEach((codeBlock) => {
        if (codeBlock.parentElement?.closest("pre, code-block")) return;
        const codeEl = codeBlock.querySelector("code, .formatted-code") || codeBlock;
        let lang = codeBlock.getAttribute("language") || codeBlock.getAttribute("data-language") || "";
        if (!lang) {
          const header = codeBlock.querySelector(".code-block-decoration, .header, span");
          if (header && header.textContent) {
            const t = header.textContent.trim().toLowerCase();
            if (["python", "javascript", "typescript", "html", "css", "bash", "json", "sql", "cpp", "java"].includes(t)) {
              lang = t;
            }
          }
        }
        codeBlock.querySelectorAll("button, svg, mat-icon, .code-block-decoration button").forEach((b) => b.remove());
        const text = codeEl.textContent?.trim() || "";
        const replacement = document.createTextNode(`
\`\`\`${lang}
${text}
\`\`\`
`);
        codeBlock.replaceWith(replacement);
      });
      clone.querySelectorAll("tr").forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll("th, td")).map((c) => c.textContent?.trim() || "");
        if (cells.length > 0) {
          tr.replaceWith(document.createTextNode("| " + cells.join(" | ") + " |\n"));
        }
      });
      const images = Array.from(clone.querySelectorAll("img"));
      images.forEach((img) => {
        const isAvatar = img.alt && /avatar|user|profile|assistant|gemini|google/i.test(img.alt) || img.className && /avatar/i.test(img.className) || img.width > 0 && img.width <= 28;
        if (isAvatar) {
          img.remove();
          return;
        }
        const src = img.currentSrc || img.src || img.getAttribute("src") || "";
        if (src && !src.startsWith("data:image/svg")) {
          const alt = (img.alt || "Attached Image").trim();
          img.replaceWith(document.createTextNode(`

![${alt}](${src})

`));
        } else {
          img.remove();
        }
      });
      const buttons = clone.querySelectorAll('button, svg, [role="button"], mat-icon, .action-buttons, [aria-label*="Copy"]');
      buttons.forEach((b) => b.remove());
      clone.querySelectorAll("br").forEach((br) => br.replaceWith(document.createTextNode("\n")));
      clone.querySelectorAll("p").forEach((p) => p.appendChild(document.createTextNode("\n\n")));
      clone.querySelectorAll("li").forEach((li) => {
        li.prepend(document.createTextNode("\n\u2022 "));
      });
      const raw = clone.textContent || "";
      return raw.replace(/\n{3,}/g, "\n\n").trim();
    }
    isStreaming() {
      const stopButton = document.querySelector('button[aria-label*="Stop"], button.stop-button, mat-progress-bar');
      return stopButton !== null;
    }
    observeMutations(onNewMessageCaptured) {
      this.disconnect();
      const targetNode = document.querySelector("chat-window, main") || document.body;
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
              platform: "gemini",
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
    disconnect() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    }
  };

  // extension/adapters/ClaudeAdapter.ts
  var ClaudeAdapter = class {
    constructor() {
      this.name = "claude";
      this.observer = null;
      this.debounceTimer = null;
    }
    matches(url) {
      return url.includes("claude.ai");
    }
    getConversationId() {
      const match = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
      if (match && match[1]) {
        const canonicalId = `claude-${match[1]}`;
        try {
          sessionStorage.setItem("markbook_claude_active_id", canonicalId);
        } catch (e) {
        }
        return canonicalId;
      }
      try {
        const existing = sessionStorage.getItem("markbook_claude_active_id");
        if (existing) return existing;
      } catch (e) {
      }
      const newId = `claude-tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      try {
        sessionStorage.setItem("markbook_claude_active_id", newId);
      } catch (e) {
      }
      return newId;
    }
    getConversationTitle() {
      const headerTitle = document.querySelector('[data-testid="chat-title"], button[aria-label*="Rename"], header h1, h1');
      if (headerTitle && headerTitle.textContent?.trim()) {
        return headerTitle.textContent.trim();
      }
      const docTitle = document.title.replace(/ · Claude/i, "").replace(/Claude/i, "").trim();
      if (docTitle && docTitle.length > 1) {
        return docTitle;
      }
      const firstUserMsg = document.querySelector('[data-testid="user-message"], .font-user-message');
      if (firstUserMsg && firstUserMsg.textContent?.trim()) {
        const text = firstUserMsg.textContent.trim();
        return text.slice(0, 42) + (text.length > 42 ? "..." : "");
      }
      return "Claude Conversation";
    }
    extractMessages() {
      const convoId = this.getConversationId();
      const rawMessages = [];
      const userNodes = Array.from(document.querySelectorAll(
        '[data-testid="user-message"], .font-user-message, div[class*="font-user"]'
      )).filter((el) => !el.parentElement?.closest('[data-testid="user-message"], .font-user-message'));
      const assistantNodes = Array.from(document.querySelectorAll(
        '[data-testid="assistant-message"], .font-claude-message, div[class*="font-claude"], div.font-claude, div.font-tiempos'
      )).filter((el) => !el.parentElement?.closest('[data-testid="assistant-message"], .font-claude-message'));
      const allTurns = [
        ...userNodes.map((el) => ({ el, role: "user" })),
        ...assistantNodes.map((el) => ({ el, role: "assistant" }))
      ];
      allTurns.sort((a, b) => {
        const pos = a.el.compareDocumentPosition(b.el);
        return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
      if (allTurns.length > 0) {
        allTurns.forEach(({ el, role }) => {
          const text = this.extractCleanText(el);
          if (text && text.trim().length > 0) {
            rawMessages.push({ role, content: text.trim() });
          }
        });
      }
      if (rawMessages.length > 0 && !rawMessages.some((m) => m.role === "user")) {
        const fallbackUser = document.querySelector('[class*="font-user"], div.grid-cols-1 .prose');
        if (fallbackUser) {
          const text = this.extractCleanText(fallbackUser);
          if (text) rawMessages.unshift({ role: "user", content: text });
        }
      }
      if (rawMessages.length > 0 && !rawMessages.some((m) => m.role === "assistant")) {
        const fallbackAi = document.querySelector('[class*="font-claude"], div.font-claude');
        if (fallbackAi) {
          const text = this.extractCleanText(fallbackAi);
          if (text) rawMessages.push({ role: "assistant", content: text });
        }
      }
      const cleanMessages = [];
      const seenSignatures = /* @__PURE__ */ new Set();
      rawMessages.forEach((msg, idx) => {
        const norm = msg.content.replace(/\s+/g, " ").trim();
        const signature = `${msg.role}:::${norm.slice(0, 100)}:::${norm.slice(-40)}`;
        if (seenSignatures.has(signature)) {
          return;
        }
        seenSignatures.add(signature);
        cleanMessages.push({
          id: `${convoId}_msg_${cleanMessages.length}`,
          role: msg.role,
          content: msg.content,
          timestamp: Date.now() - (rawMessages.length - idx) * 1e3
        });
      });
      return cleanMessages;
    }
    extractCleanText(node) {
      const clone = node.cloneNode(true);
      const preBlocks = Array.from(clone.querySelectorAll('pre, [data-testid*="artifact-block"]'));
      preBlocks.forEach((pre) => {
        if (pre.parentElement?.closest("pre")) return;
        const codeEl = pre.querySelector("code");
        let lang = "";
        if (codeEl) {
          const langMatch = codeEl.className.match(/language-([a-zA-Z0-9_-]+)/);
          if (langMatch) lang = langMatch[1];
        }
        if (!lang) {
          const header = pre.querySelector('span, .text-xs, [class*="language"]');
          if (header && header.textContent) {
            const t = header.textContent.trim().toLowerCase();
            if (["python", "javascript", "typescript", "html", "css", "bash", "json", "sql", "cpp", "java"].includes(t)) {
              lang = t;
            }
          }
        }
        pre.querySelectorAll('button, svg, [aria-label*="Copy"]').forEach((b) => b.remove());
        const text = (codeEl ? codeEl.textContent : pre.textContent) || "";
        const replacement = document.createTextNode(`
\`\`\`${lang}
${text.trim()}
\`\`\`
`);
        pre.replaceWith(replacement);
      });
      clone.querySelectorAll("tr").forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll("th, td")).map((c) => c.textContent?.trim() || "");
        if (cells.length > 0) {
          tr.replaceWith(document.createTextNode("| " + cells.join(" | ") + " |\n"));
        }
      });
      const images = Array.from(clone.querySelectorAll("img"));
      images.forEach((img) => {
        const isAvatar = img.alt && /avatar|user|profile|assistant|claude|anthropic/i.test(img.alt) || img.className && /avatar/i.test(img.className) || img.width > 0 && img.width <= 28;
        if (isAvatar) {
          img.remove();
          return;
        }
        const src = img.currentSrc || img.src || img.getAttribute("src") || "";
        if (src && !src.startsWith("data:image/svg")) {
          const alt = (img.alt || "Attached Image").trim();
          img.replaceWith(document.createTextNode(`

![${alt}](${src})

`));
        } else {
          img.remove();
        }
      });
      const buttons = clone.querySelectorAll('button, svg, [aria-label*="Copy"], [aria-label*="copy"], .text-text-500');
      buttons.forEach((b) => b.remove());
      clone.querySelectorAll("br").forEach((br) => br.replaceWith(document.createTextNode("\n")));
      clone.querySelectorAll("p").forEach((p) => p.appendChild(document.createTextNode("\n\n")));
      clone.querySelectorAll("li").forEach((li) => {
        li.prepend(document.createTextNode("\n\u2022 "));
      });
      const raw = clone.textContent || "";
      return raw.replace(/\n{3,}/g, "\n\n").trim();
    }
    isStreaming() {
      const streamingEl = document.querySelector('[data-is-streaming="true"], button[aria-label="Stop Response"]');
      return streamingEl !== null;
    }
    observeMutations(onNewMessageCaptured) {
      this.disconnect();
      const targetNode = document.querySelector("main") || document.body;
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
              platform: "claude",
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
    disconnect() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    }
  };

  // extension/storage.ts
  var EXTENSION_STORAGE_KEY_SETTINGS = "memora_settings";
  var EXTENSION_STORAGE_KEY_CONVOS = "memora_local_conversations";
  var EXTENSION_STORAGE_KEY_USER = "memora_user_session";
  var ExtensionStorage = class {
    static async getUserSession() {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.get([EXTENSION_STORAGE_KEY_USER], (res) => {
            resolve(res?.[EXTENSION_STORAGE_KEY_USER] || null);
          });
        });
      }
      const saved = localStorage.getItem(EXTENSION_STORAGE_KEY_USER);
      return saved ? JSON.parse(saved) : null;
    }
    static async setUserSession(session) {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
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
    static async getSettings() {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.get([EXTENSION_STORAGE_KEY_SETTINGS], (res) => {
            const item = res?.[EXTENSION_STORAGE_KEY_SETTINGS];
            resolve(item || {
              autoSaveMode: true,
              activePlatformFilter: "all",
              maxFreeLimit: 100
            });
          });
        });
      }
      const saved = localStorage.getItem(EXTENSION_STORAGE_KEY_SETTINGS);
      return saved ? JSON.parse(saved) : { autoSaveMode: true, activePlatformFilter: "all", maxFreeLimit: 100 };
    }
    static async updateSettings(settings) {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [EXTENSION_STORAGE_KEY_SETTINGS]: updated });
      } else {
        localStorage.setItem(EXTENSION_STORAGE_KEY_SETTINGS, JSON.stringify(updated));
      }
    }
    static async saveCapturedConversation(convo) {
      const dedupedMessages = convo.messages.filter((msg, idx, arr) => {
        const prevIdx = arr.findIndex((m) => m.role === msg.role && m.content.trim() === msg.content.trim());
        return prevIdx === idx;
      });
      const user = await this.getUserSession();
      const cleanConvo = {
        ...convo,
        messages: dedupedMessages,
        createdAt: convo.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      const currentList = await this.getCapturedConversations();
      const cleanFirstUserMsg = cleanConvo.messages.find((m) => m.role === "user")?.content.trim().slice(0, 100);
      const existingIndex = currentList.findIndex((c) => {
        if (c.id === cleanConvo.id) return true;
        if (c.platform !== cleanConvo.platform) return false;
        if (c.url && cleanConvo.url && c.url.includes("/c/") && cleanConvo.url.includes("/c/")) {
          if (c.url.split("?")[0] === cleanConvo.url.split("?")[0]) return true;
        }
        if (cleanFirstUserMsg && c.messages && c.messages.length > 0) {
          const cFirstUser = c.messages.find((m) => m.role === "user")?.content.trim().slice(0, 100);
          if (cFirstUser && cFirstUser === cleanFirstUserMsg) {
            return true;
          }
        }
        return false;
      });
      if (existingIndex >= 0) {
        const existing = currentList[existingIndex];
        const messagesToKeep = cleanConvo.messages.length >= existing.messages.length ? cleanConvo.messages : existing.messages;
        const resolvedId = existing.id && !existing.id.includes("-tab-") ? existing.id : cleanConvo.id;
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
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [EXTENSION_STORAGE_KEY_CONVOS]: currentList.slice(0, 300) });
      } else {
        localStorage.setItem(EXTENSION_STORAGE_KEY_CONVOS, JSON.stringify(currentList.slice(0, 300)));
      }
      return { saved: true };
    }
    static async togglePin(id) {
      const list = await this.getCapturedConversations();
      const item = list.find((c) => c.id === id);
      let newState = false;
      if (item) {
        item.isPinned = !item.isPinned;
        newState = item.isPinned;
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set({ [EXTENSION_STORAGE_KEY_CONVOS]: list });
        } else {
          localStorage.setItem(EXTENSION_STORAGE_KEY_CONVOS, JSON.stringify(list));
        }
      }
      return newState;
    }
    static async updateTitle(id, newTitle) {
      const list = await this.getCapturedConversations();
      const item = list.find((c) => c.id === id);
      if (item) {
        item.title = newTitle.trim();
        item.customTitle = newTitle.trim();
        item.updatedAt = Date.now();
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set({ [EXTENSION_STORAGE_KEY_CONVOS]: list });
        } else {
          localStorage.setItem(EXTENSION_STORAGE_KEY_CONVOS, JSON.stringify(list));
        }
      }
    }
    static async getCapturedConversations() {
      let list = [];
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        list = await new Promise((resolve) => {
          chrome.storage.local.get([EXTENSION_STORAGE_KEY_CONVOS], (res) => {
            resolve(res?.[EXTENSION_STORAGE_KEY_CONVOS] || []);
          });
        });
      } else {
        const saved = localStorage.getItem(EXTENSION_STORAGE_KEY_CONVOS);
        list = saved ? JSON.parse(saved) : [];
      }
      return list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
    }
    static async setAllConversations(list) {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [EXTENSION_STORAGE_KEY_CONVOS]: list });
      } else {
        localStorage.setItem(EXTENSION_STORAGE_KEY_CONVOS, JSON.stringify(list));
      }
    }
  };

  // extension/content-script.ts
  var ContentScriptController = class {
    constructor() {
      this.activeAdapter = null;
      this.isAutoSaveActive = true;
    }
    async init() {
      const currentUrl = window.location.href;
      if (this.isWebDashboard(currentUrl)) {
        this.initWebDashboardBridge();
        return;
      }
      const adapters = [new ChatGPTAdapter(), new GeminiAdapter(), new ClaudeAdapter()];
      for (const adapter of adapters) {
        if (adapter.matches(currentUrl)) {
          this.activeAdapter = adapter;
          break;
        }
      }
      if (!this.activeAdapter) {
        return;
      }
      console.log(`[Markbook Note] Initialized on ${this.activeAdapter.name}`);
      const settings = await ExtensionStorage.getSettings();
      this.isAutoSaveActive = settings.autoSaveMode;
      this.injectInPageWidget();
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
          if (request.action === "MANUAL_CAPTURE") {
            this.performManualCapture().then((res) => sendResponse(res));
            return true;
          } else if (request.action === "CLONE_CHAT") {
            this.deepCloneConversation().then((res) => sendResponse(res));
            return true;
          } else if (request.action === "GET_STATUS") {
            const msgs = this.activeAdapter ? this.activeAdapter.extractMessages() : [];
            sendResponse({
              active: true,
              platform: this.activeAdapter?.name,
              title: this.activeAdapter?.getConversationTitle(),
              messageCount: msgs.length,
              autoSave: this.isAutoSaveActive
            });
            return true;
          } else if (request.action === "SET_AUTO_SAVE") {
            this.isAutoSaveActive = !!request.enabled;
            this.updateWidgetState();
            if (this.isAutoSaveActive) {
              this.startAutoCapture();
            } else {
              this.activeAdapter?.disconnect();
            }
            sendResponse({ success: true, autoSave: this.isAutoSaveActive });
            return true;
          }
        });
      }
      if (this.isAutoSaveActive) {
        this.startAutoCapture();
      }
      setInterval(() => {
        if (this.activeAdapter && !document.getElementById("markbook-inpage-widget")) {
          this.injectInPageWidget();
        }
      }, 2e3);
      window.addEventListener("popstate", () => {
        this.injectInPageWidget();
        if (this.isAutoSaveActive) {
          this.startAutoCapture();
        }
      });
    }
    isWebDashboard(url) {
      return url.includes("run.app") || url.includes("localhost") || url.includes("127.0.0.1") || document.title.toLowerCase().includes("markbook") || document.title.toLowerCase().includes("memora") || document.querySelector('meta[name="application-name"][content*="Markbook"]') !== null;
    }
    /**
     * Bi-directional communication bridge between Chrome Extension and Web Dashboard
     */
    initWebDashboardBridge() {
      console.log("[Markbook Note] Web Dashboard detected! Initializing bridge with extension storage...");
      window.postMessage({
        type: "MARKBOOK_EXTENSION_AVAILABLE",
        version: "1.2.0",
        installed: true
      }, "*");
      const syncToDashboard = async () => {
        try {
          const convos = await ExtensionStorage.getCapturedConversations();
          const settings = await ExtensionStorage.getSettings();
          window.postMessage({
            type: "MARKBOOK_EXTENSION_SYNC",
            conversations: convos,
            settings,
            syncedAt: Date.now()
          }, "*");
          console.log(`[Markbook Note] Bridge successfully sent ${convos.length} conversations to Web Dashboard`);
        } catch (err) {
          console.error("[Markbook Note] Sync bridge error:", err);
        }
      };
      setTimeout(syncToDashboard, 500);
      window.addEventListener("focus", () => {
        syncToDashboard();
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          syncToDashboard();
        }
      });
      window.addEventListener("message", async (event) => {
        if (event.data?.type === "REQUEST_MARKBOOK_EXTENSION_SYNC" || event.data?.type === "REQUEST_MEMORA_EXTENSION_SYNC") {
          await syncToDashboard();
        }
      });
    }
    startAutoCapture() {
      if (!this.activeAdapter) return;
      this.activeAdapter.observeMutations((captured) => {
        this.handleCapturedData(captured, true);
      });
    }
    async handleCapturedData(captured, isAuto) {
      if (!captured.messages || captured.messages.length === 0) return;
      this.showScreenNotification("\u26A1 Markbook Note: Capturing conversation... Please stay on this tab", "copying");
      await ExtensionStorage.saveCapturedConversation(captured);
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        try {
          chrome.runtime.sendMessage({
            action: "CONVERSATION_CAPTURED",
            data: captured
          });
        } catch (err) {
        }
      }
      const uCount = captured.messages.filter((m) => m.role === "user").length;
      const aCount = captured.messages.filter((m) => m.role === "assistant").length;
      this.showScreenNotification(`\u2713 Saved ${captured.messages.length} messages (${uCount} You / ${aCount} AI)`, "done");
      this.showWidgetToast(isAuto ? `Auto-Saved (${captured.messages.length} msgs)` : `Saved (${captured.messages.length} msgs)`);
    }
    async performManualCapture() {
      if (!this.activeAdapter) {
        return { success: false, message: "No supported AI platform active." };
      }
      this.showScreenNotification("\u26A1 Markbook Note: Copying visible chat... Please wait 3-5s", "copying");
      const messages = this.activeAdapter.extractMessages();
      if (messages.length === 0) {
        this.showScreenNotification("\u26A0\uFE0F No conversation messages found on page.", "done");
        return { success: false, message: "No conversation messages found in current chat. Send a prompt first!" };
      }
      const convo = {
        id: this.activeAdapter.getConversationId(),
        platform: this.activeAdapter.name,
        title: this.activeAdapter.getConversationTitle(),
        url: window.location.href,
        messages
      };
      await this.handleCapturedData(convo, false);
      const uCount = messages.filter((m) => m.role === "user").length;
      const aCount = messages.filter((m) => m.role === "assistant").length;
      return { success: true, message: `Done! Saved ${messages.length} messages (${uCount} You / ${aCount} AI).`, conversation: convo };
    }
    /**
     * DEEP CLONE FEATURE:
     * Smoothly auto-scrolls the active conversation from top to bottom,
     * unhiding and rendering all lazy-loaded turns so NO USER OR ASSISTANT MESSAGE IS MISSED.
     */
    async deepCloneConversation() {
      if (!this.activeAdapter) {
        return { success: false, message: "No supported AI platform active." };
      }
      this.showScreenNotification("\u{1F9EC} Markbook Note: Deep Cloning chat... Auto-scrolling from top to bottom.", "copying");
      const scrollContainer = this.findScrollContainer();
      await this.smoothScrollTo(scrollContainer, 0, "up");
      await new Promise((r) => setTimeout(r, 600));
      const maxY = scrollContainer === window ? Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) : scrollContainer.scrollHeight;
      await this.smoothScrollTo(scrollContainer, maxY, "down");
      await new Promise((r) => setTimeout(r, 600));
      const messages = this.activeAdapter.extractMessages();
      if (messages.length === 0) {
        this.showScreenNotification("\u26A0\uFE0F Could not find messages to clone.", "done");
        return { success: false, message: "No messages found." };
      }
      const convo = {
        id: this.activeAdapter.getConversationId(),
        platform: this.activeAdapter.name,
        title: this.activeAdapter.getConversationTitle(),
        url: window.location.href,
        messages
      };
      await this.handleCapturedData(convo, false);
      const userCount = messages.filter((m) => m.role === "user").length;
      const aiCount = messages.filter((m) => m.role === "assistant").length;
      this.showScreenNotification(`\u2713 Complete! Cloned entire conversation: ${messages.length} turns (${userCount} You / ${aiCount} AI)`, "done");
      return {
        success: true,
        message: `Cloned entire conversation: ${messages.length} turns (${userCount} You / ${aiCount} AI)`,
        count: messages.length,
        conversation: convo
      };
    }
    findScrollContainer() {
      const candidates = Array.from(document.querySelectorAll(
        'main, [class*="react-scroll-to-bottom"], div[class*="overflow-y-auto"], chat-window, .chat-history, [data-testid="conversation-container"]'
      ));
      for (const el of candidates) {
        if (el.scrollHeight > el.clientHeight && el.clientHeight > 200) {
          return el;
        }
      }
      return window;
    }
    async smoothScrollTo(container, _targetY, direction) {
      return new Promise((resolve) => {
        const isWindow = container === window;
        const step = 500;
        const intervalMs = 60;
        const timer = setInterval(() => {
          const currentY = isWindow ? window.scrollY : container.scrollTop;
          const maxScroll = isWindow ? document.body.scrollHeight - window.innerHeight : container.scrollHeight - container.clientHeight;
          if (direction === "up") {
            if (currentY <= 60) {
              clearInterval(timer);
              if (isWindow) window.scrollTo(0, 0);
              else container.scrollTop = 0;
              resolve();
              return;
            }
            const next = Math.max(0, currentY - step);
            if (isWindow) window.scrollTo(0, next);
            else container.scrollTop = next;
          } else {
            if (currentY >= maxScroll - 60) {
              clearInterval(timer);
              if (isWindow) window.scrollTo(0, maxScroll);
              else container.scrollTop = maxScroll;
              resolve();
              return;
            }
            const next = Math.min(maxScroll, currentY + step);
            if (isWindow) window.scrollTo(0, next);
            else container.scrollTop = next;
          }
        }, intervalMs);
        setTimeout(() => {
          clearInterval(timer);
          resolve();
        }, 1e4);
      });
    }
    showScreenNotification(message, type) {
      let banner = document.getElementById("markbook-copy-banner");
      if (!banner) {
        banner = document.createElement("div");
        banner.id = "markbook-copy-banner";
        banner.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 600;
        padding: 10px 20px;
        border-radius: 9999px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
        display: flex;
        align-items: center;
        gap: 8px;
      `;
        document.body.appendChild(banner);
      }
      if (type === "copying") {
        banner.style.background = "#1e1b4b";
        banner.style.color = "#c7d2fe";
        banner.style.border = "1px solid #6366f1";
        banner.innerHTML = `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #818cf8; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></span><span>${message}</span>`;
        banner.style.opacity = "1";
      } else {
        banner.style.background = "#064e3b";
        banner.style.color = "#a7f3d0";
        banner.style.border = "1px solid #10b981";
        banner.innerHTML = `<span>${message}</span>`;
        banner.style.opacity = "1";
        setTimeout(() => {
          if (banner) {
            banner.style.opacity = "0";
            setTimeout(() => banner?.remove(), 300);
          }
        }, 4e3);
      }
    }
    /**
     * Injects floating in-page widget with Auto/Manual toggle and Clone button
     */
    injectInPageWidget() {
      if (!document.body || document.getElementById("markbook-inpage-widget")) return;
      const widget = document.createElement("div");
      widget.id = "markbook-inpage-widget";
      widget.style.cssText = `
      position: fixed;
      bottom: 96px;
      right: 24px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      color: #f1f5f9;
      background: rgba(9, 10, 15, 0.95);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(99, 102, 241, 0.4);
      border-radius: 28px;
      box-shadow: 0 10px 36px rgba(0, 0, 0, 0.65), 0 0 16px rgba(99, 102, 241, 0.25);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      cursor: grab;
      user-select: none;
      transition: box-shadow 0.2s ease;
    `;
      widget.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px; cursor: grab;">
        <span style="font-weight: 700; color: #818cf8; font-size: 13px;">\u26A1 Markbook Note</span>
        <button id="markbook-widget-mode-btn" style="
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 6px;
          color: ${this.isAutoSaveActive ? "#34d399" : "#f59e0b"};
          padding: 2px 6px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        " title="Click to toggle Auto / Manual mode">
          ${this.isAutoSaveActive ? "\u26A1 Auto" : "\u{1F446} Manual"}
        </button>
      </div>
      <button id="markbook-widget-save-btn" style="
        background: #4f46e5;
        color: white;
        border: none;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      ">Save</button>
      <button id="markbook-widget-clone-btn" style="
        background: linear-gradient(135deg, #7c3aed, #6366f1);
        color: white;
        border: none;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      " title="Auto-scroll and clone entire conversation">\u{1F9EC} Clone</button>
      <button id="markbook-widget-minimize" style="
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 12px;
        padding: 0 2px;
      " title="Minimize">\u2715</button>
    `;
      document.body.appendChild(widget);
      let isDragging = false;
      let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
      widget.addEventListener("mousedown", (e) => {
        const target = e.target;
        if (target.tagName.toLowerCase() === "button") return;
        isDragging = true;
        widget.style.cursor = "grabbing";
        startX = e.clientX;
        startY = e.clientY;
        const rect = widget.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        widget.style.bottom = "auto";
        widget.style.right = "auto";
        widget.style.left = `${initialLeft}px`;
        widget.style.top = `${initialTop}px`;
        e.preventDefault();
      });
      window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        widget.style.left = `${Math.max(10, Math.min(window.innerWidth - 300, initialLeft + dx))}px`;
        widget.style.top = `${Math.max(10, Math.min(window.innerHeight - 60, initialTop + dy))}px`;
      });
      window.addEventListener("mouseup", () => {
        if (isDragging) {
          isDragging = false;
          widget.style.cursor = "grab";
        }
      });
      const saveBtn = widget.querySelector("#markbook-widget-save-btn");
      saveBtn?.addEventListener("click", async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
        const res = await this.performManualCapture();
        saveBtn.textContent = res.success ? "\u2713 Saved!" : "Failed";
        setTimeout(() => {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save";
        }, 2e3);
      });
      const cloneBtn = widget.querySelector("#markbook-widget-clone-btn");
      cloneBtn?.addEventListener("click", async () => {
        cloneBtn.disabled = true;
        cloneBtn.textContent = "Cloning...";
        const res = await this.deepCloneConversation();
        cloneBtn.textContent = res.success ? "\u2713 Cloned!" : "Failed";
        setTimeout(() => {
          cloneBtn.disabled = false;
          cloneBtn.textContent = "\u{1F9EC} Clone";
        }, 2500);
      });
      const modeBtn = widget.querySelector("#markbook-widget-mode-btn");
      modeBtn?.addEventListener("click", async () => {
        this.isAutoSaveActive = !this.isAutoSaveActive;
        await ExtensionStorage.updateSettings({ autoSaveMode: this.isAutoSaveActive });
        this.updateWidgetState();
        if (this.isAutoSaveActive) {
          this.startAutoCapture();
          this.showWidgetToast("Auto-Capture Enabled");
        } else {
          this.activeAdapter?.disconnect();
          this.showWidgetToast("Manual Mode Enabled");
        }
      });
      const minBtn = widget.querySelector("#markbook-widget-minimize");
      minBtn?.addEventListener("click", () => {
        widget.style.display = "none";
        const floater = document.createElement("div");
        floater.id = "markbook-minimized-bubble";
        floater.style.cssText = `
        position: fixed;
        bottom: 96px;
        right: 24px;
        z-index: 2147483647;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #4f46e5;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4);
      `;
        floater.innerHTML = "\u26A1";
        floater.title = "Open Markbook Note";
        floater.addEventListener("click", () => {
          floater.remove();
          widget.style.display = "flex";
        });
        document.body.appendChild(floater);
      });
    }
    updateWidgetState() {
      const modeBtn = document.getElementById("markbook-widget-mode-btn");
      if (modeBtn) {
        modeBtn.textContent = this.isAutoSaveActive ? "\u26A1 Auto" : "\u{1F446} Manual";
        modeBtn.style.color = this.isAutoSaveActive ? "#34d399" : "#f59e0b";
      }
    }
    showWidgetToast(msg) {
      const toast = document.createElement("div");
      toast.style.cssText = `
      position: fixed;
      bottom: 140px;
      right: 24px;
      z-index: 2147483647;
      background: #11121b;
      border: 1px solid #4f46e5;
      color: #c7d2fe;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 500;
      box-shadow: 0 6px 20px rgba(0,0,0,0.5);
      animation: fadeIn 0.2s;
    `;
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s";
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    }
  };
  var controller = new ContentScriptController();
  controller.init().catch((err) => console.error("[Markbook Note] Controller failed:", err));
})();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
