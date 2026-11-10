/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Star,
  Copy,
  Trash2,
  Edit2,
  Share2,
  Download,
  Check,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ArrowUpDown,
  Lock,
  X,
  RefreshCw,
  Upload
} from 'lucide-react';
import { Conversation, Message, Platform } from '../types';
import { dbService } from '../services/storage/indexedDb';
import { ContextTransferService } from '../services/contextTransfer';

interface ConversationLibraryProps {
  initialSelectedId?: string | null;
  onNavigateToTransfer?: (convoId: string) => void;
}

export const ConversationLibrary: React.FC<ConversationLibraryProps> = ({
  initialSelectedId,
  onNavigateToTransfer
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'messages'>('newest');

  // Modals & Feedback states
  const [renamingConvo, setRenamingConvo] = useState<Conversation | null>(null);
  const [newTitleInput, setNewTitleInput] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shareModalConvo, setShareModalConvo] = useState<Conversation | null>(null);
  const [generatedShare, setGeneratedShare] = useState<{ url: string; key: string } | null>(null);
  const [copiedContext, setCopiedContext] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
    const unsubscribe = dbService.subscribe(loadConversations);
    return () => unsubscribe();
  }, [platformFilter, searchTerm, favoriteOnly, sortBy]);

  useEffect(() => {
    if (initialSelectedId) {
      loadSpecificConversation(initialSelectedId);
    }
  }, [initialSelectedId]);

  async function loadConversations() {
    const list = await dbService.getAllConversations({
      platform: platformFilter,
      search: searchTerm,
      isFavoriteOnly: favoriteOnly,
      sortBy
    });
    setConversations(list);

    if (list.length > 0 && !selectedConversation && !initialSelectedId) {
      loadSpecificConversation(list[0].id);
    } else if (selectedConversation) {
      // Refresh current conversation
      loadSpecificConversation(selectedConversation.id);
    }
  }

  async function loadSpecificConversation(id: string) {
    const data = await dbService.getConversationWithMessages(id);
    if (data) {
      setSelectedConversation(data.conversation);
      setSelectedMessages(data.messages);
    }
  }

  async function handleToggleFavorite(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    await dbService.toggleFavorite(id);
  }

  async function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!renamingConvo || !newTitleInput.trim()) return;
    await dbService.updateTitle(renamingConvo.id, newTitleInput.trim());
    setRenamingConvo(null);
  }

  async function handleDeleteConfirm() {
    if (!deletingId) return;
    await dbService.deleteConversation(deletingId);
    if (selectedConversation?.id === deletingId) {
      setSelectedConversation(null);
      setSelectedMessages([]);
    }
    setDeletingId(null);
  }

  async function handleCopyContext() {
    if (!selectedConversation) return;
    const text = ContextTransferService.formatLinearContext(selectedConversation, selectedMessages);
    await navigator.clipboard.writeText(text);
    setCopiedContext(true);
    setTimeout(() => setCopiedContext(false), 2000);
  }

  async function handleCopySingleMessage(msg: Message) {
    await navigator.clipboard.writeText(msg.content);
    setCopiedMessageId(msg.id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  }

  async function handleExportMarkdown() {
    if (!selectedConversation) return;
    const md = ContextTransferService.formatMarkdown(selectedConversation, selectedMessages);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedConversation.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportSingleJson() {
    if (!selectedConversation) return;
    const data = {
      conversation: selectedConversation,
      messages: selectedMessages,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedConversation.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleGenerateShareLink() {
    if (!selectedConversation) return;
    const result = await ContextTransferService.createShareLink(selectedConversation, selectedMessages, 7);
    setGeneratedShare({ url: result.shareUrl, key: result.revocationKey });
  }

  const [quickCopiedLink, setQuickCopiedLink] = useState(false);

  async function handleQuickCopyNoteLink(convo?: Conversation, msgs?: Message[]) {
    const targetConvo = convo || selectedConversation;
    const targetMsgs = msgs || selectedMessages;
    if (!targetConvo) return;

    const res = await ContextTransferService.createShareLink(targetConvo, targetMsgs);
    await navigator.clipboard.writeText(res.shareUrl);
    setQuickCopiedLink(true);
    setSyncFeedback('✓ Note link copied to clipboard! (Readable by ChatGPT & anyone)');
    setTimeout(() => {
      setQuickCopiedLink(false);
      setSyncFeedback(null);
    }, 3500);
  }

  function getPlatformPill(platform: Platform) {
    const color = platform === 'chatgpt' ? 'text-emerald-400' : platform === 'gemini' ? 'text-blue-400' : 'text-orange-400';
    const label = platform === 'chatgpt' ? 'ChatGPT' : platform === 'gemini' ? 'Gemini' : 'Claude';
    return (
      <span className={`text-xs font-semibold ${color}`}>
        {label}
      </span>
    );
  }

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  async function handleSyncFromExtension() {
    setIsSyncing(true);
    // 1. Check if localStorage has cache from extension
    try {
      const cached = localStorage.getItem('memora_extension_sync_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const count = await dbService.syncExtensionConversations(parsed);
          await loadConversations();
          setSyncFeedback(`✓ Synced ${count} conversation${count === 1 ? '' : 's'} from extension!`);
          setTimeout(() => setSyncFeedback(null), 3000);
          setIsSyncing(false);
          return;
        }
      }
    } catch (e) {
      // ignore
    }

    // 2. Send postMessage request to content-script.js
    window.postMessage({ type: 'REQUEST_MEMORA_EXTENSION_SYNC' }, '*');
    setTimeout(async () => {
      await loadConversations();
      setIsSyncing(false);
      setSyncFeedback('✓ Extension storage refreshed');
      setTimeout(() => setSyncFeedback(null), 2500);
    }, 900);
  }

  function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const raw = evt.target?.result as string;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const count = await dbService.syncExtensionConversations(parsed);
          await loadConversations();
          setSyncFeedback(`✓ Imported ${count} conversations from backup!`);
          setTimeout(() => setSyncFeedback(null), 3500);
        }
      } catch (err) {
        alert('Could not parse JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
              Conversation Library
            </h1>
            {syncFeedback && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-fade-in">
                {syncFeedback}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Search, filter, inspect, and export your captured thinking sessions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sync with Extension Button */}
          <button
            onClick={handleSyncFromExtension}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 bg-[#11121b] hover:bg-white/[0.08] border border-white/[0.1] hover:border-white/[0.2] transition-colors shadow-sm"
            title="Sync all captured conversations from your installed Chrome Extension"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync from Extension'}</span>
          </button>

          {/* Import JSON Backup */}
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-[#11121b] hover:bg-white/[0.08] border border-white/[0.1] hover:border-white/[0.2] cursor-pointer transition-colors shadow-sm">
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Import Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>

          {selectedConversation && onNavigateToTransfer && (
            <button
              onClick={() => onNavigateToTransfer(selectedConversation.id)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-600/30 transition-colors shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Transfer to Another AI</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations, tags, or topics..."
            className="w-full bg-[#11121b] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Platform Tabs & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Platform Filter Buttons */}
          <div className="inline-flex p-1 bg-[#11121b] border border-white/[0.08] rounded-xl">
            <button
              onClick={() => setPlatformFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                platformFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setPlatformFilter('chatgpt')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                platformFilter === 'chatgpt' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ChatGPT
            </button>
            <button
              onClick={() => setPlatformFilter('gemini')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                platformFilter === 'gemini' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Gemini
            </button>
            <button
              onClick={() => setPlatformFilter('claude')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                platformFilter === 'claude' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Claude
            </button>
          </div>

          {/* Favorite Toggle */}
          <button
            onClick={() => setFavoriteOnly(!favoriteOnly)}
            className={`p-2 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1.5 ${
              favoriteOnly
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-[#11121b] border-white/[0.08] text-slate-400 hover:text-white'
            }`}
            title="Show Favorites Only"
          >
            <Star className={`w-4 h-4 ${favoriteOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#11121b] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="messages">Most Messages</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2-PANE WORKSPACE: List on Left, Detail Viewer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Conversation List (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
          {conversations.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#11121b] border border-white/[0.07] text-center text-slate-400 text-xs">
              No conversations found matching filters.
            </div>
          ) : (
            conversations.map((convo) => {
              const isSelected = selectedConversation?.id === convo.id;
              return (
                <div
                  key={convo.id}
                  onClick={() => loadSpecificConversation(convo.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-[#161725] border-indigo-500/60 shadow-md shadow-indigo-950/40'
                      : 'bg-[#11121b] border-white/[0.07] hover:border-white/[0.15] hover:bg-[#141520]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        {getPlatformPill(convo.platform)}
                        <span className="text-[11px] font-mono text-slate-500">
                          {new Date(convo.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-200 line-clamp-1 leading-snug">
                        {convo.title}
                      </h3>
                      {convo.summary && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {convo.summary}
                        </p>
                      )}
                      <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                        <span>{convo.messageCount} messages</span>
                        {convo.tags && convo.tags.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{convo.tags[0]}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => handleToggleFavorite(convo.id, e)}
                        className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                        title={convo.isFavorite ? 'Unfavorite' : 'Favorite'}
                      >
                        <Star className={`w-4 h-4 ${convo.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                      <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-indigo-400 translate-x-0.5' : 'text-slate-600'}`} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Pane: Transcript Inspector & Actions (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#11121b] border border-white/[0.07] p-6 flex flex-col min-h-[580px]">
          {selectedConversation ? (
            <div className="space-y-6 flex-1 flex flex-col">
              {/* Header Details & Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {getPlatformPill(selectedConversation.platform)}
                    <span className="text-xs font-mono text-slate-500">
                      ID: {selectedConversation.id}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-tight leading-snug">
                    {selectedConversation.title}
                  </h2>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleQuickCopyNoteLink()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-600/30 transition-colors"
                    title="Copy Open Source Shareable Note Link (Readable by ChatGPT or anyone)"
                  >
                    {quickCopiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span className="text-white">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Copy Note Link</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCopyContext}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-colors"
                    title="Copy Linear Context"
                  >
                    {copiedContext ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Context</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleExportMarkdown}
                    className="p-2 rounded-lg text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
                    title="Export Markdown File"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setRenamingConvo(selectedConversation);
                      setNewTitleInput(selectedConversation.title);
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
                    title="Rename"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeletingId(selectedConversation.id)}
                    className="p-2 rounded-lg text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                    title="Delete Conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Messages Transcript Scroll Area */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {selectedMessages.map((msg, index) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id || index}
                      className={`p-4 rounded-xl border transition-all ${
                        isUser
                          ? 'bg-[#151624] border-indigo-500/20 text-slate-200'
                          : 'bg-[#0E0F17] border-white/[0.06] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/[0.04]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold ${
                              isUser ? 'text-indigo-400' : 'text-violet-400'
                            }`}
                          >
                            {isUser ? '👤 User' : `🤖 ${selectedConversation.platform.toUpperCase()} (${msg.model || 'Model'})`}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopySingleMessage(msg)}
                          className="text-slate-500 hover:text-slate-300 p-1 transition-colors"
                          title="Copy this message turn"
                        >
                          {copiedMessageId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {/* Content with whitespace pre-wrap for code and formatting */}
                      <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Original Session External Link if available */}
              {selectedConversation.externalUrl && (
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500">
                  <span>Source URL detected</span>
                  <a
                    href={selectedConversation.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>Reopen in {selectedConversation.platform.toUpperCase()}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-500">
              <MessageSquare className="w-10 h-10 stroke-1 mb-3 text-slate-600" />
              <p className="text-sm">Select a conversation from the list to view its complete memory transcript.</p>
            </div>
          )}
        </div>
      </div>

      {/* RENAME MODAL */}
      {renamingConvo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11121b] border border-white/[0.1] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Rename Conversation</h3>
            <p className="text-xs text-slate-400 mb-4">
              Update the title of this saved conversation in your local database.
            </p>
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <input
                type="text"
                value={newTitleInput}
                onChange={(e) => setNewTitleInput(e.target.value)}
                autoFocus
                className="w-full bg-[#090A0F] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRenamingConvo(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
                >
                  Save Title
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11121b] border border-white/[0.1] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Delete Conversation?</h3>
            <p className="text-xs text-slate-400 mb-4">
              This will permanently delete this conversation and its indexed messages from your device's IndexedDB. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL WITH EXPLICIT CONSENT & REVOCATION */}
      {shareModalConvo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11121b] border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Generate Share Link</h3>
              </div>
              <button onClick={() => setShareModalConvo(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5">
              <Lock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                <strong>Privacy Notice:</strong> By default, conversations never leave your computer. Generating a share link uploads only this single conversation to an encrypted public URL. Anyone with this link can view the transcript.
              </span>
            </div>

            {!generatedShare ? (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-slate-400">
                  Sharing conversation: <span className="text-white font-medium">"{shareModalConvo.title}"</span>
                </p>
                <button
                  onClick={handleGenerateShareLink}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                >
                  Confirm & Create Encrypted Share Link
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Shareable URL:</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedShare.url}
                      className="flex-1 bg-[#090A0F] border border-white/[0.1] rounded-lg px-3 py-2 text-xs font-mono text-indigo-300"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedShare.url)}
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
                    >
                      Copy URL
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Revocation Key:</span>{' '}
                  <code className="text-indigo-300 font-mono text-[11px]">{generatedShare.key}</code>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Keep this key to invalidate or destroy this shared conversation at any time.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
