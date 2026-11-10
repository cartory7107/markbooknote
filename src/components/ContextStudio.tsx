/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  Sliders,
  FileText,
  Download,
  Share2,
  CheckSquare,
  Square
} from 'lucide-react';
import { Conversation, Message, Platform } from '../types';
import { dbService } from '../services/storage/indexedDb';
import { ContextTransferService } from '../services/contextTransfer';

interface ContextStudioProps {
  initialConvoId?: string | null;
  onOpenPricing: () => void;
}

export const ContextStudio: React.FC<ContextStudioProps> = ({ initialConvoId }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<string>('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [targetPlatform, setTargetPlatform] = useState<Platform>('claude');
  const [formatMode, setFormatMode] = useState<'linear' | 'handoff_prompt' | 'markdown' | 'json'>('handoff_prompt');
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const [previewText, setPreviewText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadList();
  }, []);

  async function loadList() {
    const list = await dbService.getAllConversations({ sortBy: 'newest' });
    setConversations(list);
    const targetId = initialConvoId || (list.length > 0 ? list[0].id : '');
    if (targetId) {
      setSelectedConvoId(targetId);
      loadConversationDetails(targetId);
    }
  }

  async function loadConversationDetails(id: string) {
    const data = await dbService.getConversationWithMessages(id);
    if (data) {
      setConversation(data.conversation);
      setMessages(data.messages);
      // Select all messages by default
      setSelectedMsgIds(new Set(data.messages.map(m => m.id)));
    }
  }

  function handleConvoChange(id: string) {
    setSelectedConvoId(id);
    loadConversationDetails(id);
  }

  function toggleMessageSelection(id: string) {
    const next = new Set(selectedMsgIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedMsgIds(next);
  }

  function toggleSelectAll() {
    if (selectedMsgIds.size === messages.length) {
      setSelectedMsgIds(new Set());
    } else {
      setSelectedMsgIds(new Set(messages.map(m => m.id)));
    }
  }

  // Update preview when options change
  useEffect(() => {
    if (!conversation) return;

    const filteredMessages = messages.filter(m => selectedMsgIds.has(m.id));

    if (formatMode === 'linear') {
      const text = ContextTransferService.formatLinearContext(
        conversation,
        messages,
        Array.from(selectedMsgIds)
      );
      setPreviewText(text);
    } else if (formatMode === 'handoff_prompt') {
      const text = ContextTransferService.formatCrossPlatformPrompt(
        targetPlatform,
        conversation,
        filteredMessages
      );
      setPreviewText(text);
    } else if (formatMode === 'markdown') {
      const text = ContextTransferService.formatMarkdown(conversation, filteredMessages);
      setPreviewText(text);
    } else if (formatMode === 'json') {
      const obj = {
        platform: conversation.platform,
        title: conversation.title,
        exportedAt: new Date().toISOString(),
        messages: filteredMessages
      };
      setPreviewText(JSON.stringify(obj, null, 2));
    }
  }, [conversation, messages, targetPlatform, formatMode, selectedMsgIds]);

  async function handleCopy() {
    await navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div className="pb-4 border-b border-white/[0.08]">
        <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
          Memory Context Transfer Studio
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Package and re-inject conversation context across different AI platforms without losing conclusions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Configuration & Message Turn Selector (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Source Conversation Picker */}
          <div className="p-5 rounded-2xl bg-[#11121b] border border-white/[0.07] space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              1. Select Source Conversation
            </label>
            <select
              value={selectedConvoId}
              onChange={(e) => handleConvoChange(e.target.value)}
              className="w-full bg-[#090A0F] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {conversations.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.platform.toUpperCase()}] {c.title} ({c.messageCount} msgs)
                </option>
              ))}
            </select>
          </div>

          {/* Target AI Platform Picker */}
          <div className="p-5 rounded-2xl bg-[#11121b] border border-white/[0.07] space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              2. Target Destination AI
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTargetPlatform('claude')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  targetPlatform === 'claude'
                    ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                    : 'bg-[#090A0F] border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                Claude
              </button>
              <button
                onClick={() => setTargetPlatform('chatgpt')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  targetPlatform === 'chatgpt'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-[#090A0F] border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                ChatGPT
              </button>
              <button
                onClick={() => setTargetPlatform('gemini')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  targetPlatform === 'gemini'
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                    : 'bg-[#090A0F] border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                Gemini
              </button>
            </div>
          </div>

          {/* Format Mode Picker */}
          <div className="p-5 rounded-2xl bg-[#11121b] border border-white/[0.07] space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              3. Context Format Style
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setFormatMode('handoff_prompt')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  formatMode === 'handoff_prompt'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-[#090A0F] border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-xs mb-0.5">Cross-AI Prompt</div>
                <div className="text-[11px] text-slate-500">Injects with instructions</div>
              </button>
              <button
                onClick={() => setFormatMode('linear')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  formatMode === 'linear'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-[#090A0F] border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-xs mb-0.5">Linear Text</div>
                <div className="text-[11px] text-slate-500">Platform & turns formatted</div>
              </button>
              <button
                onClick={() => setFormatMode('markdown')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  formatMode === 'markdown'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-[#090A0F] border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-xs mb-0.5">Markdown (.md)</div>
                <div className="text-[11px] text-slate-500">Structured document</div>
              </button>
              <button
                onClick={() => setFormatMode('json')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  formatMode === 'json'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-[#090A0F] border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-xs mb-0.5">JSON Payload</div>
                <div className="text-[11px] text-slate-500">API/developer structure</div>
              </button>
            </div>
          </div>

          {/* Message Selection Checklist */}
          <div className="p-5 rounded-2xl bg-[#11121b] border border-white/[0.07] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Include Specific Message Turns ({selectedMsgIds.size}/{messages.length})
              </label>
              <button
                onClick={toggleSelectAll}
                className="text-[11px] font-medium text-indigo-400 hover:underline"
              >
                {selectedMsgIds.size === messages.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {messages.map((m, idx) => {
                const isSelected = selectedMsgIds.has(m.id);
                return (
                  <div
                    key={m.id || idx}
                    onClick={() => toggleMessageSelection(m.id)}
                    className="p-2 rounded-lg bg-[#090A0F] border border-white/[0.06] hover:border-white/[0.12] cursor-pointer flex items-center gap-2.5 text-xs"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className="font-mono text-slate-400 text-[11px] shrink-0">
                      {m.role === 'user' ? 'User:' : 'AI:'}
                    </span>
                    <span className="text-slate-300 truncate">
                      {m.content}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Context Preview & One-Click Copy (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#11121b] border border-white/[0.07] p-6 flex flex-col min-h-[620px]">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
            <div>
              <span className="text-xs font-mono uppercase text-indigo-400 font-medium">
                Engineered Prompt Preview
              </span>
              <h2 className="text-sm font-semibold text-white mt-0.5">
                Ready for paste into {targetPlatform.toUpperCase()}
              </h2>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Ready Prompt</span>
                </>
              )}
            </button>
          </div>

          {/* Readonly preview box */}
          <textarea
            readOnly
            value={previewText}
            className="w-full flex-1 min-h-[460px] bg-[#090A0F] border border-white/[0.08] rounded-xl p-4 font-mono text-xs text-slate-300 leading-relaxed focus:outline-none resize-none"
          />

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500">
            <span>Character count: {previewText.length.toLocaleString()}</span>
            <span>Est. tokens: ~{Math.round(previewText.length / 4).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
