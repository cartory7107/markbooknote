/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Copy,
  Download,
  Share2,
  ArrowLeft,
  Check,
  ExternalLink,
  Bot,
  User,
  Sparkles,
  FileText,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { Conversation, Message, Platform } from '../types';
import { dbService } from '../services/storage/indexedDb';
import { ContextTransferService } from '../services/contextTransfer';

interface OpenNoteViewProps {
  noteDataOrId: string;
  onBackToApp: () => void;
}

export const OpenNoteView: React.FC<OpenNoteViewProps> = ({ noteDataOrId, onBackToApp }) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  useEffect(() => {
    loadNote();
  }, [noteDataOrId]);

  async function loadNote() {
    setLoading(true);
    try {
      // 1. Check if noteDataOrId is a base64 encoded payload
      if (noteDataOrId.startsWith('payload_') || noteDataOrId.startsWith('data_') || noteDataOrId.length > 60) {
        try {
          const rawB64 = noteDataOrId.replace(/^(payload_|data_)/, '');
          const jsonStr = decodeURIComponent(escape(atob(rawB64)));
          const parsed = JSON.parse(jsonStr);
          if (parsed.conversation && Array.isArray(parsed.messages)) {
            setConversation(parsed.conversation);
            setMessages(parsed.messages);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Could not decode base64 note payload, falling back to db lookup', e);
        }
      }

      // 2. Check IndexedDB
      const directConvo = await dbService.getConversationWithMessages(noteDataOrId);
      if (directConvo) {
        setConversation(directConvo.conversation);
        setMessages(directConvo.messages);
        setLoading(false);
        return;
      }

      // 3. Check share records in IndexedDB
      const shareRecord = await dbService.getShareRecord(noteDataOrId);
      if (shareRecord) {
        const convo: Conversation = {
          id: shareRecord.conversationId,
          platform: shareRecord.platform,
          title: shareRecord.title,
          createdAt: shareRecord.createdAt,
          updatedAt: shareRecord.createdAt,
          messageCount: shareRecord.messages.length,
          isFavorite: false
        };
        setConversation(convo);
        setMessages(shareRecord.messages);
        setLoading(false);
        return;
      }

      // 4. Check all conversations as fallback
      const all = await dbService.getAllConversations();
      if (all.length > 0) {
        const found = all.find(c => c.id === noteDataOrId || c.title.toLowerCase().includes(noteDataOrId.toLowerCase()));
        if (found) {
          const withMsgs = await dbService.getConversationWithMessages(found.id);
          if (withMsgs) {
            setConversation(withMsgs.conversation);
            setMessages(withMsgs.messages);
            setLoading(false);
            return;
          }
        }
      }
    } catch (err) {
      console.error('Error loading note:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyTranscript() {
    if (!conversation || messages.length === 0) return;
    const text = ContextTransferService.formatLinearContext(conversation, messages);
    await navigator.clipboard.writeText(text);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  }

  async function handleCopyShareLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function handleDownloadMarkdown() {
    if (!conversation || messages.length === 0) return;
    const md = ContextTransferService.formatMarkdown(conversation, messages);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(conversation.title || 'chat-note').toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleCopySingle(msgId: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090A0F] text-slate-200 flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-slate-400">Loading Markbook Note...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-[#090A0F] text-slate-200 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Note Not Found</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            This conversation note may have expired or is stored only in the author's local browser storage.
          </p>
          <button
            onClick={onBackToApp}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Markbook Note Hub</span>
          </button>
        </div>
      </div>
    );
  }

  const userMessagesCount = messages.filter(m => m.role === 'user').length;
  const aiMessagesCount = messages.filter(m => m.role === 'assistant').length;
  const platformLabel = conversation.platform === 'chatgpt' ? 'ChatGPT' : conversation.platform === 'gemini' ? 'Google Gemini' : 'Anthropic Claude';

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#090A0F]/90 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToApp}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-xs font-bold tracking-tight text-white font-sans">
              Markbook Open Note
            </span>
            <span className="text-xs text-slate-600">/</span>
            <span className="text-xs font-mono text-slate-400 uppercase">
              {conversation.platform}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyTranscript}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition-colors flex items-center gap-1.5"
            title="Copy formatted dialogue for pasting into ChatGPT or Claude"
          >
            {copiedTranscript ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Copied for ChatGPT!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy for ChatGPT</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopyShareLink}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition-colors flex items-center gap-1.5"
            title="Copy shareable note link"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition-colors items-center gap-1.5"
            title="Download Markdown note file"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export .md</span>
          </button>
        </div>
      </header>

      {/* Main Document Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Note Metadata Banner */}
        <div className="pb-6 border-b border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{platformLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{new Date(conversation.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            <span aria-hidden="true">·</span>
            <span>{messages.length} messages ({userMessagesCount} You / {aiMessagesCount} AI)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
            {conversation.title}
          </h1>

          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            This is an open-source, read-only Markdown transcript captured via Markbook Note.
            You can copy the raw text to continue this conversation inside ChatGPT, Claude, or any AI assistant.
          </p>
        </div>

        {/* Conversation Turns List */}
        <div className="space-y-6">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <article
                key={msg.id || index}
                className={`rounded-2xl p-5 sm:p-6 transition-all ${
                  isUser
                    ? 'bg-[#12131D] border border-indigo-500/20 shadow-sm'
                    : 'bg-[#0E0F17] border border-white/[0.06]'
                }`}
              >
                {/* Turn Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06] text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs ${
                        isUser
                          ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold'
                          : 'bg-white/[0.06] text-slate-300 border border-white/[0.08]'
                      }`}
                    >
                      {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`font-semibold ${isUser ? 'text-indigo-300' : 'text-slate-200'}`}>
                      {isUser ? 'User Prompt' : `${platformLabel} Response`}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => handleCopySingle(msg.id, msg.content)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                      title="Copy turn content"
                    >
                      {copiedMsgId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap font-sans selection:bg-indigo-500/30">
                  {msg.content}
                </div>
              </article>
            );
          })}
        </div>

        {/* Bottom CTA for ChatGPT or Returning */}
        <div className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <span>Open Source AI Conversation Memory Platform · </span>
            <button onClick={onBackToApp} className="text-indigo-400 hover:underline font-semibold">
              Open Markbook Note Hub
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyTranscript}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all inline-flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Full Context for AI</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
