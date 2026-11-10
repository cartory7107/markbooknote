/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Download,
  Sparkles,
  Bot,
  User,
  Send,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Check
} from 'lucide-react';
import { Conversation, Message, Platform, LicenseRecord } from '../types';
import { dbService } from '../services/storage/indexedDb';
import { licenseService } from '../services/licenseService';
import { generateExtensionZip } from '../services/extensionPackager';

interface ExtensionSimulatorProps {
  license: LicenseRecord;
  onOpenPricing: () => void;
  onNavigateTab: (tab: string) => void;
}

export const ExtensionSimulator: React.FC<ExtensionSimulatorProps> = ({
  license,
  onOpenPricing,
  onNavigateTab
}) => {
  // Extension State
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const [activePlatform, setActivePlatform] = useState<Platform>('chatgpt');
  const [extensionBadge, setExtensionBadge] = useState<string>('ON');
  const [recentExtensionClips, setRecentExtensionClips] = useState<Conversation[]>([]);
  const [manualCaptureSuccess, setManualCaptureSuccess] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Simulated Web Chat State
  const [chatInput, setChatInput] = useState('');
  const [simulatedChatMessages, setSimulatedChatMessages] = useState<{ role: 'user' | 'assistant'; text: string; time: string }[]>([
    {
      role: 'user',
      text: 'How should we handle state synchronization between browser extensions and local IndexedDB?',
      time: '10:14 AM'
    },
    {
      role: 'assistant',
      text: 'To ensure seamless synchronization, rely on a content script mutation observer that signals the background service worker via `chrome.runtime.sendMessage()`. The service worker manages an offscreen IndexedDB instance or delegates directly to the host application frame.',
      time: '10:15 AM'
    }
  ]);
  const [isSimulatingResponse, setIsSimulatingResponse] = useState(false);
  const [lastAutoCapturedTurn, setLastAutoCapturedTurn] = useState<string | null>(null);

  const isPremium = license.plan === 'premium' && license.status === 'active';

  useEffect(() => {
    loadRecent();
  }, []);

  async function loadRecent() {
    const list = await dbService.getAllConversations({ sortBy: 'newest' });
    setRecentExtensionClips(list.slice(0, 4));
  }

  async function handleDownloadZip() {
    try {
      setIsDownloadingZip(true);
      // Directly download the compiled production extension zip from public folder
      const a = document.createElement('a');
      a.href = '/memora-extension.zip';
      a.download = 'markbook-note-extension.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download extension zip', err);
      alert('Failed to download extension. Please try again.');
    } finally {
      setIsDownloadingZip(false);
    }
  }

  async function handleSendSimulatedMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!chatInput.trim() || isSimulatingResponse) return;

    const userText = chatInput.trim();
    setChatInput('');
    const newHistory = [
      ...simulatedChatMessages,
      { role: 'user' as const, text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ];
    setSimulatedChatMessages(newHistory);
    setIsSimulatingResponse(true);

    // Simulate AI thinking and response
    setTimeout(async () => {
      let aiText = '';
      if (activePlatform === 'chatgpt') {
        aiText = `[ChatGPT Response]\nHere is an analysis regarding "${userText}": In distributed architectures, cache stamps are best alleviated through lock-stepped background invalidation or probabilistic early refresh (XFetch algorithm).`;
      } else if (activePlatform === 'gemini') {
        aiText = `[Gemini Response]\nAnalyzing your query "${userText}": With Gemini 2.0 Pro multimodal reasoning, contextual embeddings can be extracted directly alongside structural tokens for instant search indexing.`;
      } else {
        aiText = `[Claude Response]\nReflecting on "${userText}": For maximum reliability and zero cloud privacy exposure, ensure pure client-side custody where prompt tokens never traverse an untrusted gateway.`;
      }

      const updatedHistory = [
        ...newHistory,
        { role: 'assistant' as const, text: aiText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ];
      setSimulatedChatMessages(updatedHistory);
      setIsSimulatingResponse(false);

      // If Auto Mode is ON, trigger automatic capture into Memora IndexedDB
      if (autoCaptureEnabled) {
        await captureCurrentChatToMemora(updatedHistory, true);
      }
    }, 1200);
  }

  async function captureCurrentChatToMemora(
    messagesToSave: { role: 'user' | 'assistant'; text: string; time: string }[],
    isAuto: boolean
  ) {
    const convoId = `convo-sim-${activePlatform}-${Date.now().toString(36)}`;
    const title = messagesToSave[0]?.text.slice(0, 48) + '...';

    // Verify storage entitlement limit
    const currentStats = await dbService.getStats();
    const check = licenseService.canSaveNewConversation(currentStats.totalConversations);

    if (!check.allowed && check.isLimitReached) {
      alert(check.reason);
      return;
    }

    const conversation: Conversation = {
      id: convoId,
      platform: activePlatform,
      title: title || `${activePlatform.toUpperCase()} Discussion`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: messagesToSave.length,
      isFavorite: false,
      summary: messagesToSave[messagesToSave.length - 1]?.text.slice(0, 100)
    };

    const messages: Message[] = messagesToSave.map((m, idx) => ({
      id: `msg-sim-${idx}-${Date.now().toString(36)}`,
      conversationId: convoId,
      role: m.role,
      content: m.text,
      timestamp: Date.now() - (messagesToSave.length - idx) * 1000,
      model: activePlatform === 'chatgpt' ? 'GPT-4o' : activePlatform === 'gemini' ? 'Gemini 2.0 Pro' : 'Claude 3.7 Sonnet'
    }));

    await dbService.saveConversation(conversation, messages);
    await loadRecent();

    setExtensionBadge(String(messagesToSave.length));
    setTimeout(() => setExtensionBadge('ON'), 2500);

    if (isAuto) {
      setLastAutoCapturedTurn(title);
      setTimeout(() => setLastAutoCapturedTurn(null), 3500);
    } else {
      setManualCaptureSuccess(true);
      setTimeout(() => setManualCaptureSuccess(false), 2500);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner: Download Extension Package */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-[#11121b] to-violet-950/40 border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
              Chrome Extension Manifest V3
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Tested & Ready
            </span>
          </div>
          <h2 className="text-lg font-bold text-white">
            Download Production Extension or Test in Live Simulator
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            You can test the exact popup and auto-capture behavior in the split view below, or download the full unpacked extension zip to load into Chrome via <code>chrome://extensions</code>.
          </p>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isDownloadingZip}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{isDownloadingZip ? 'Generating Zip...' : 'Download Extension (.zip)'}</span>
        </button>
      </div>

      {/* SPLIT VIEW PLAYGROUND */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Faithful Extension Popup Replica (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="text-center mb-3">
            <span className="text-xs font-mono text-slate-400">
              Simulated Extension Popup (380px frame)
            </span>
          </div>

          {/* Chrome Popup Frame */}
          <div className="w-full max-w-[380px] bg-[#090A0F] border border-white/[0.12] rounded-2xl shadow-2xl p-5 text-slate-100 space-y-4">
            {/* Popup Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                  ⚡
                </div>
                <span className="font-bold text-sm tracking-tight text-white">
                  Markbook Note
                </span>
              </div>
              <span
                className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                  isPremium
                    ? 'text-violet-300 bg-violet-500/20 border-violet-500/40'
                    : 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30'
                }`}
              >
                {isPremium ? 'Premium (Unlimited)' : 'Free (100 Cap)'}
              </span>
            </div>

            {/* Mode Selector Segment (Auto vs Manual) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-400">Capture Mode</label>
              <div className="grid grid-cols-2 p-1 bg-[#11121B] border border-white/[0.08] rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setAutoCaptureEnabled(true)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    autoCaptureEnabled
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>⚡ Auto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAutoCaptureEnabled(false)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    !autoCaptureEnabled
                      ? 'bg-slate-700 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>👆 Manual</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                {autoCaptureEnabled
                  ? '⚡ Auto Mode: Automatically captures every user prompt and AI response in real time.'
                  : '👆 Manual Mode: Passive mode. Captures only when you click Save or Clone.'}
              </p>
            </div>

            {/* Status Card */}
            <div className="p-3.5 rounded-xl bg-[#11121B] border border-white/[0.08] space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Active on{' '}
                  <strong className="text-white uppercase font-sans">
                    {activePlatform}
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1">
                <button
                  onClick={() => captureCurrentChatToMemora(simulatedChatMessages, false)}
                  className="w-full py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-1.5"
                >
                  {manualCaptureSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Saved Visible Chat!</span>
                    </>
                  ) : (
                    <>
                      <span>📥 Save Visible Chat</span>
                    </>
                  )}
                </button>

                <button
                  onClick={async () => {
                    // Simulate auto-scroll and cloning
                    setManualCaptureSuccess(true);
                    await captureCurrentChatToMemora(simulatedChatMessages, false);
                    setTimeout(() => setManualCaptureSuccess(false), 2500);
                  }}
                  className="w-full py-2 rounded-lg text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>🧬 Clone Entire Chat (Auto-Scroll)</span>
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigateTab('context-studio')}
                className="py-2 px-3 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Context</span>
              </button>
              <button
                onClick={() => onNavigateTab('dashboard')}
                className="py-2 px-3 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Web Dashboard</span>
              </button>
            </div>

            {/* Recent Captured Memories in Popup */}
            <div>
              <div className="text-xs font-medium text-slate-400 mb-2">
                Recent Saved Sessions ({recentExtensionClips.length})
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {recentExtensionClips.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onNavigateTab('library')}
                    className="p-2 rounded-lg bg-[#11121B] border border-white/[0.04] hover:border-white/[0.1] cursor-pointer flex items-center justify-between text-xs"
                  >
                    <span className="truncate max-w-[200px] text-slate-200">{c.title}</span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{c.platform}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Popup Footer */}
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500">
              <button
                onClick={() => onNavigateTab('account')}
                className="text-indigo-400 hover:underline"
              >
                License & Settings
              </button>
              <span className="font-mono">Badge: [{extensionBadge}]</span>
            </div>
          </div>
        </div>

        {/* Right Side: Active AI Platform Chat Mockup (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#11121B] border border-white/[0.08] p-6 flex flex-col min-h-[580px]">
          {/* Platform Switcher & Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08] mb-4">
            <div>
              <span className="text-xs font-mono text-indigo-400 font-medium uppercase">
                Simulated AI Browser Tab
              </span>
              <h3 className="text-sm font-semibold text-white mt-0.5">
                Interact to trigger Memora's DOM adapter
              </h3>
            </div>

            {/* Platform Selector */}
            <div className="inline-flex p-1 bg-[#090A0F] border border-white/[0.08] rounded-xl">
              <button
                onClick={() => setActivePlatform('chatgpt')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activePlatform === 'chatgpt' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                ChatGPT
              </button>
              <button
                onClick={() => setActivePlatform('gemini')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activePlatform === 'gemini' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Gemini
              </button>
              <button
                onClick={() => setActivePlatform('claude')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activePlatform === 'claude' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Claude
              </button>
            </div>
          </div>

          {/* Toast / Notification when auto captured */}
          {lastAutoCapturedTurn && (
            <div className="mb-4 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-indigo-200 text-xs flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Memora Auto-Captured:</strong> Saved turn into IndexedDB!
                </span>
              </div>
              <button
                onClick={() => onNavigateTab('library')}
                className="underline text-indigo-300 font-semibold"
              >
                View Library
              </button>
            </div>
          )}

          {/* Chat Transcript Area */}
          <div className="flex-1 space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {simulatedChatMessages.map((msg, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#161726] border-indigo-500/20 text-slate-200 ml-6'
                    : 'bg-[#090A0F] border-white/[0.06] text-slate-300 mr-6'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1.5">
                  <span className={msg.role === 'user' ? 'text-indigo-400 font-medium' : 'text-violet-400 font-medium'}>
                    {msg.role === 'user' ? 'You' : activePlatform.toUpperCase()}
                  </span>
                  <span>{msg.time}</span>
                </div>
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>
            ))}

            {isSimulatingResponse && (
              <div className="p-3.5 rounded-xl bg-[#090A0F] border border-white/[0.06] text-xs text-slate-400 flex items-center gap-2 mr-6">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Generating response from {activePlatform}...</span>
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendSimulatedMessage} className="mt-4 pt-3 border-t border-white/[0.08] flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Send a prompt to ${activePlatform}...`}
              disabled={isSimulatingResponse}
              className="flex-1 bg-[#090A0F] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isSimulatingResponse}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
