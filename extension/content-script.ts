/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatGPTAdapter } from './adapters/ChatGPTAdapter';
import { GeminiAdapter } from './adapters/GeminiAdapter';
import { ClaudeAdapter } from './adapters/ClaudeAdapter';
import { PlatformAdapter, CapturedConversation } from './adapters/BaseAdapter';
import { ExtensionStorage } from './storage';

class ContentScriptController {
  private activeAdapter: PlatformAdapter | null = null;
  private isAutoSaveActive = true;

  public async init() {
    const currentUrl = window.location.href;

    // Check if running on Markbook Note Web Dashboard
    if (this.isWebDashboard(currentUrl)) {
      this.initWebDashboardBridge();
      return;
    }

    // Otherwise, check AI platform adapters
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

    // Load initial settings
    const settings = await ExtensionStorage.getSettings();
    this.isAutoSaveActive = settings.autoSaveMode;

    // Inject in-page floating widget
    this.injectInPageWidget();

    // Listen for runtime messages from Popup
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
        if (request.action === 'MANUAL_CAPTURE') {
          this.performManualCapture().then(res => sendResponse(res));
          return true;
        } else if (request.action === 'CLONE_CHAT') {
          this.deepCloneConversation().then(res => sendResponse(res));
          return true;
        } else if (request.action === 'GET_STATUS') {
          const msgs = this.activeAdapter ? this.activeAdapter.extractMessages() : [];
          sendResponse({
            active: true,
            platform: this.activeAdapter?.name,
            title: this.activeAdapter?.getConversationTitle(),
            messageCount: msgs.length,
            autoSave: this.isAutoSaveActive
          });
          return true;
        } else if (request.action === 'SET_AUTO_SAVE') {
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

    // Start auto capture if enabled
    if (this.isAutoSaveActive) {
      this.startAutoCapture();
    }

    // Periodically ensure widget is present (persists through React SPA navigation)
    setInterval(() => {
      if (this.activeAdapter && !document.getElementById('markbook-inpage-widget')) {
        this.injectInPageWidget();
      }
    }, 2000);

    // Reconnect observer on client-side route navigation
    window.addEventListener('popstate', () => {
      this.injectInPageWidget();
      if (this.isAutoSaveActive) {
        this.startAutoCapture();
      }
    });
  }

  private isWebDashboard(url: string): boolean {
    return url.includes('run.app') ||
           url.includes('localhost') ||
           url.includes('127.0.0.1') ||
           document.title.toLowerCase().includes('markbook') ||
           document.title.toLowerCase().includes('memora') ||
           document.querySelector('meta[name="application-name"][content*="Markbook"]') !== null;
  }

  /**
   * Bi-directional communication bridge between Chrome Extension and Web Dashboard
   */
  private initWebDashboardBridge() {
    console.log('[Markbook Note] Web Dashboard detected! Initializing bridge with extension storage...');

    window.postMessage({
      type: 'MARKBOOK_EXTENSION_AVAILABLE',
      version: '1.2.0',
      installed: true
    }, '*');

    const syncToDashboard = async () => {
      try {
        const convos = await ExtensionStorage.getCapturedConversations();
        const settings = await ExtensionStorage.getSettings();

        window.postMessage({
          type: 'MARKBOOK_EXTENSION_SYNC',
          conversations: convos,
          settings,
          syncedAt: Date.now()
        }, '*');

        console.log(`[Markbook Note] Bridge successfully sent ${convos.length} conversations to Web Dashboard`);
      } catch (err) {
        console.error('[Markbook Note] Sync bridge error:', err);
      }
    };

    setTimeout(syncToDashboard, 500);

    window.addEventListener('focus', () => {
      syncToDashboard();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        syncToDashboard();
      }
    });

    window.addEventListener('message', async (event) => {
      if (event.data?.type === 'REQUEST_MARKBOOK_EXTENSION_SYNC' || event.data?.type === 'REQUEST_MEMORA_EXTENSION_SYNC') {
        await syncToDashboard();
      }
    });
  }

  private startAutoCapture() {
    if (!this.activeAdapter) return;
    this.activeAdapter.observeMutations((captured: CapturedConversation) => {
      this.handleCapturedData(captured, true);
    });
  }

  private async handleCapturedData(captured: CapturedConversation, isAuto: boolean) {
    if (!captured.messages || captured.messages.length === 0) return;

    this.showScreenNotification('⚡ Markbook Note: Capturing conversation... Please stay on this tab', 'copying');

    await ExtensionStorage.saveCapturedConversation(captured);

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage({
          action: 'CONVERSATION_CAPTURED',
          data: captured
        });
      } catch (err) {
        // Ignored if background worker is resting
      }
    }

    const uCount = captured.messages.filter(m => m.role === 'user').length;
    const aCount = captured.messages.filter(m => m.role === 'assistant').length;

    this.showScreenNotification(`✓ Saved ${captured.messages.length} messages (${uCount} You / ${aCount} AI)`, 'done');
    this.showWidgetToast(isAuto ? `Auto-Saved (${captured.messages.length} msgs)` : `Saved (${captured.messages.length} msgs)`);
  }

  public async performManualCapture(): Promise<{ success: boolean; message: string; conversation?: CapturedConversation }> {
    if (!this.activeAdapter) {
      return { success: false, message: 'No supported AI platform active.' };
    }

    this.showScreenNotification('⚡ Markbook Note: Copying visible chat... Please wait 3-5s', 'copying');

    const messages = this.activeAdapter.extractMessages();
    if (messages.length === 0) {
      this.showScreenNotification('⚠️ No conversation messages found on page.', 'done');
      return { success: false, message: 'No conversation messages found in current chat. Send a prompt first!' };
    }

    const convo: CapturedConversation = {
      id: this.activeAdapter.getConversationId(),
      platform: this.activeAdapter.name,
      title: this.activeAdapter.getConversationTitle(),
      url: window.location.href,
      messages
    };

    await this.handleCapturedData(convo, false);
    const uCount = messages.filter(m => m.role === 'user').length;
    const aCount = messages.filter(m => m.role === 'assistant').length;
    return { success: true, message: `Done! Saved ${messages.length} messages (${uCount} You / ${aCount} AI).`, conversation: convo };
  }

  /**
   * DEEP CLONE FEATURE:
   * Smoothly auto-scrolls the active conversation from top to bottom,
   * unhiding and rendering all lazy-loaded turns so NO USER OR ASSISTANT MESSAGE IS MISSED.
   */
  public async deepCloneConversation(): Promise<{ success: boolean; message: string; count?: number; conversation?: CapturedConversation }> {
    if (!this.activeAdapter) {
      return { success: false, message: 'No supported AI platform active.' };
    }

    this.showScreenNotification('🧬 Markbook Note: Deep Cloning chat... Auto-scrolling from top to bottom.', 'copying');

    const scrollContainer = this.findScrollContainer();

    // 1. Scroll smoothly to the very top to mount oldest turns
    await this.smoothScrollTo(scrollContainer, 0, 'up');
    await new Promise(r => setTimeout(r, 600));

    // 2. Scroll smoothly down to the bottom
    const maxY = scrollContainer === window
      ? Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
      : scrollContainer.scrollHeight;

    await this.smoothScrollTo(scrollContainer, maxY, 'down');
    await new Promise(r => setTimeout(r, 600));

    // 3. Extract all messages now rendered in the DOM
    const messages = this.activeAdapter.extractMessages();
    if (messages.length === 0) {
      this.showScreenNotification('⚠️ Could not find messages to clone.', 'done');
      return { success: false, message: 'No messages found.' };
    }

    const convo: CapturedConversation = {
      id: this.activeAdapter.getConversationId(),
      platform: this.activeAdapter.name,
      title: this.activeAdapter.getConversationTitle(),
      url: window.location.href,
      messages
    };

    await this.handleCapturedData(convo, false);

    const userCount = messages.filter(m => m.role === 'user').length;
    const aiCount = messages.filter(m => m.role === 'assistant').length;

    this.showScreenNotification(`✓ Complete! Cloned entire conversation: ${messages.length} turns (${userCount} You / ${aiCount} AI)`, 'done');
    return {
      success: true,
      message: `Cloned entire conversation: ${messages.length} turns (${userCount} You / ${aiCount} AI)`,
      count: messages.length,
      conversation: convo
    };
  }

  private findScrollContainer(): any {
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

  private async smoothScrollTo(container: any, _targetY: number, direction: 'up' | 'down'): Promise<void> {
    return new Promise((resolve) => {
      const isWindow = container === window;
      const step = 500;
      const intervalMs = 60;

      const timer = setInterval(() => {
        const currentY = isWindow ? window.scrollY : container.scrollTop;
        const maxScroll = isWindow
          ? (document.body.scrollHeight - window.innerHeight)
          : (container.scrollHeight - container.clientHeight);

        if (direction === 'up') {
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

      // Max timeout of 10s so it never freezes
      setTimeout(() => {
        clearInterval(timer);
        resolve();
      }, 10000);
    });
  }

  private showScreenNotification(message: string, type: 'copying' | 'done') {
    let banner = document.getElementById('markbook-copy-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'markbook-copy-banner';
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

    if (type === 'copying') {
      banner.style.background = '#1e1b4b';
      banner.style.color = '#c7d2fe';
      banner.style.border = '1px solid #6366f1';
      banner.innerHTML = `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #818cf8; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></span><span>${message}</span>`;
      banner.style.opacity = '1';
    } else {
      banner.style.background = '#064e3b';
      banner.style.color = '#a7f3d0';
      banner.style.border = '1px solid #10b981';
      banner.innerHTML = `<span>${message}</span>`;
      banner.style.opacity = '1';
      setTimeout(() => {
        if (banner) {
          banner.style.opacity = '0';
          setTimeout(() => banner?.remove(), 300);
        }
      }, 4000);
    }
  }

  /**
   * Injects floating in-page widget with Auto/Manual toggle and Clone button
   */
  private injectInPageWidget() {
    if (!document.body || document.getElementById('markbook-inpage-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'markbook-inpage-widget';
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
        <span style="font-weight: 700; color: #818cf8; font-size: 13px;">⚡ Markbook Note</span>
        <button id="markbook-widget-mode-btn" style="
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 6px;
          color: ${this.isAutoSaveActive ? '#34d399' : '#f59e0b'};
          padding: 2px 6px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        " title="Click to toggle Auto / Manual mode">
          ${this.isAutoSaveActive ? '⚡ Auto' : '👆 Manual'}
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
      " title="Auto-scroll and clone entire conversation">🧬 Clone</button>
      <button id="markbook-widget-minimize" style="
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 12px;
        padding: 0 2px;
      " title="Minimize">✕</button>
    `;

    document.body.appendChild(widget);

    // Make Draggable
    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    widget.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'button') return;

      isDragging = true;
      widget.style.cursor = 'grabbing';
      startX = e.clientX;
      startY = e.clientY;

      const rect = widget.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      widget.style.bottom = 'auto';
      widget.style.right = 'auto';
      widget.style.left = `${initialLeft}px`;
      widget.style.top = `${initialTop}px`;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      widget.style.left = `${Math.max(10, Math.min(window.innerWidth - 300, initialLeft + dx))}px`;
      widget.style.top = `${Math.max(10, Math.min(window.innerHeight - 60, initialTop + dy))}px`;
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        widget.style.cursor = 'grab';
      }
    });

    // Wire Buttons
    const saveBtn = widget.querySelector('#markbook-widget-save-btn') as HTMLButtonElement;
    saveBtn?.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      const res = await this.performManualCapture();
      saveBtn.textContent = res.success ? '✓ Saved!' : 'Failed';
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }, 2000);
    });

    const cloneBtn = widget.querySelector('#markbook-widget-clone-btn') as HTMLButtonElement;
    cloneBtn?.addEventListener('click', async () => {
      cloneBtn.disabled = true;
      cloneBtn.textContent = 'Cloning...';
      const res = await this.deepCloneConversation();
      cloneBtn.textContent = res.success ? '✓ Cloned!' : 'Failed';
      setTimeout(() => {
        cloneBtn.disabled = false;
        cloneBtn.textContent = '🧬 Clone';
      }, 2500);
    });

    const modeBtn = widget.querySelector('#markbook-widget-mode-btn') as HTMLButtonElement;
    modeBtn?.addEventListener('click', async () => {
      this.isAutoSaveActive = !this.isAutoSaveActive;
      await ExtensionStorage.updateSettings({ autoSaveMode: this.isAutoSaveActive });
      this.updateWidgetState();
      if (this.isAutoSaveActive) {
        this.startAutoCapture();
        this.showWidgetToast('Auto-Capture Enabled');
      } else {
        this.activeAdapter?.disconnect();
        this.showWidgetToast('Manual Mode Enabled');
      }
    });

    const minBtn = widget.querySelector('#markbook-widget-minimize') as HTMLButtonElement;
    minBtn?.addEventListener('click', () => {
      widget.style.display = 'none';
      const floater = document.createElement('div');
      floater.id = 'markbook-minimized-bubble';
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
      floater.innerHTML = '⚡';
      floater.title = 'Open Markbook Note';
      floater.addEventListener('click', () => {
        floater.remove();
        widget.style.display = 'flex';
      });
      document.body.appendChild(floater);
    });
  }

  private updateWidgetState() {
    const modeBtn = document.getElementById('markbook-widget-mode-btn');
    if (modeBtn) {
      modeBtn.textContent = this.isAutoSaveActive ? '⚡ Auto' : '👆 Manual';
      modeBtn.style.color = this.isAutoSaveActive ? '#34d399' : '#f59e0b';
    }
  }

  private showWidgetToast(msg: string) {
    const toast = document.createElement('div');
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
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
}

const controller = new ContentScriptController();
controller.init().catch(err => console.error('[Markbook Note] Controller failed:', err));
