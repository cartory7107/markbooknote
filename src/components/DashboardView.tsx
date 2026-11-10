/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Zap,
  CheckCircle2,
  Copy,
  ExternalLink,
  Download,
  Upload,
  ArrowRight,
  ShieldCheck,
  Check,
  Star
} from 'lucide-react';
import { Conversation, LicenseRecord } from '../types';
import { dbService } from '../services/storage/indexedDb';
import { ContextTransferService } from '../services/contextTransfer';

interface DashboardViewProps {
  license: LicenseRecord;
  onOpenPricing: () => void;
  onNavigateTab: (tab: string) => void;
  onSelectConversation: (convoId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  license,
  onOpenPricing,
  onNavigateTab,
  onSelectConversation
}) => {
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    platformCounts: { chatgpt: 0, gemini: 0, claude: 0 },
    favoritesCount: 0
  });
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isPremium = license.plan === 'premium' && license.status === 'active';
  const freeCap = license.maxFreeConversations || 100;
  const currentCount = stats.totalConversations;
  const percentUsed = isPremium ? 100 : Math.min(100, Math.round((currentCount / freeCap) * 100));

  useEffect(() => {
    loadData();
    const unsubscribe = dbService.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  async function loadData() {
    const s = await dbService.getStats();
    setStats(s);
    const convos = await dbService.getAllConversations({ sortBy: 'newest' });
    setRecentConversations(convos.slice(0, 6));
  }

  async function handleQuickCopyContext(convo: Conversation, e: React.MouseEvent) {
    e.stopPropagation();
    const data = await dbService.getConversationWithMessages(convo.id);
    if (!data) return;
    const text = ContextTransferService.formatLinearContext(data.conversation, data.messages);
    await navigator.clipboard.writeText(text);
    setCopiedId(convo.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleExportJson() {
    const jsonStr = await dbService.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `markbook-note-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const res = await dbService.importData(text);
      alert(`Successfully imported ${res.importedConversations} conversations and ${res.importedMessages} messages!`);
      loadData();
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    }
  }

  function getPlatformBadge(platform: string) {
    switch (platform) {
      case 'chatgpt':
        return <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">ChatGPT</span>;
      case 'gemini':
        return <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Gemini</span>;
      case 'claude':
        return <span className="text-[11px] font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">Claude</span>;
      default:
        return null;
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Welcome / Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
            Dashboard Overview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Universal memory hub syncing local browser storage with supported AI adapters.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('simulator')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-200 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Launch Extension Simulator</span>
          </button>
          <button
            onClick={() => onNavigateTab('context-studio')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-600/30 transition-colors"
          >
            <span>Transfer Context</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Total Conversations */}
        <div className="p-5 rounded-2xl bg-[#11121b] border border-white/[0.07] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Conversations</span>
            <MessageSquare className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white font-mono tabular-nums">
              {stats.totalConversations}
            </span>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
              <span>{stats.favoritesCount} favorited</span>
              <span aria-hidden="true">·</span>
              <span>100% on device</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Saved Messages */}
        <div className="p-5 rounded-2xl bg-[#11121b] border border-white/[0.07] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Saved Messages</span>
            <Zap className="w-4 h-4 text-violet-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white font-mono tabular-nums">
              {stats.totalMessages}
            </span>
            <div className="mt-2 text-xs text-slate-500">
              User prompts & AI turns indexed
            </div>
          </div>
        </div>

        {/* Metric 3: Active Subscription */}
        <div className="p-5 rounded-2xl bg-[#11121b] border border-white/[0.07] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Subscription</span>
            {isPremium ? (
              <ShieldCheck className="w-4 h-4 text-violet-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
            )}
          </div>
          <div className="mt-4">
            <div className="text-xl font-bold text-white flex items-center gap-2">
              {isPremium ? (
                <span className="text-violet-300">Markbook Note Premium</span>
              ) : (
                <span className="text-slate-200">Free Tier</span>
              )}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {isPremium ? (
                <span>Unlimited automatic capture</span>
              ) : (
                <button
                  onClick={onOpenPricing}
                  className="text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Upgrade (৳40/mo)</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Metric 4: Monthly Usage Gauge */}
        <div className="p-5 rounded-2xl bg-[#11121b] border border-white/[0.07] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Storage Entitlement</span>
            <span className="text-xs font-mono text-indigo-400">
              {isPremium ? 'Unlimited' : `${currentCount}/${freeCap}`}
            </span>
          </div>
          <div className="mt-4">
            <div className="w-full bg-white/[0.06] rounded-full h-2 mb-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isPremium ? 'bg-violet-500' : currentCount >= freeCap ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {isPremium
                ? 'All automatic capture limits unlocked.'
                : currentCount >= freeCap
                ? 'Free limit reached. Existing data remains accessible.'
                : `${freeCap - currentCount} auto-save slots remaining.`}
            </p>
          </div>
        </div>
      </div>

      {/* Free limit advisory banner if reached */}
      {!isPremium && currentCount >= freeCap && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/30 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs sm:text-sm">
            <span className="font-semibold">Notice:</span> Your 100 free conversations have been used. Upgrade to Markbook Note Premium for unlimited automatic saving. (Your existing data remains 100% accessible).
          </div>
          <button
            onClick={onOpenPricing}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500 shrink-0"
          >
            Upgrade to Premium (৳40/mo)
          </button>
        </div>
      )}

      {/* 2-COLUMN VIEW: Recent Conversations + Extension Status & Backup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Conversations */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight">
              Recent Conversations
            </h2>
            <button
              onClick={() => onNavigateTab('library')}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View All ({stats.totalConversations})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {recentConversations.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#11121b] border border-white/[0.07] text-center text-slate-400 text-sm">
                No conversations saved yet. Chat on ChatGPT, Gemini, or Claude to start saving!
              </div>
            ) : (
              recentConversations.map((convo) => (
                <div
                  key={convo.id}
                  onClick={() => onSelectConversation(convo.id)}
                  className="p-4 rounded-xl bg-[#11121b] border border-white/[0.07] hover:border-indigo-500/40 hover:bg-[#151722] cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">{getPlatformBadge(convo.platform)}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white truncate max-w-md">
                          {convo.title}
                        </h3>
                        {convo.isFavorite && (
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <span>{convo.messageCount} messages</span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(convo.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleQuickCopyContext(convo, e)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors flex items-center gap-1.5"
                      title="Quick Copy Context for another AI"
                    >
                      {copiedId === convo.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Context</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectConversation(convo.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                      title="Open in Library"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Extension Status & Backup Tools */}
        <div className="space-y-6">
          {/* Extension Status Card */}
          <div className="p-6 rounded-2xl bg-[#11121b] border border-white/[0.07] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-indigo-400">
                Extension Status
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            </div>
            <h3 className="text-base font-bold text-white">
              Markbook Note Chrome MV3
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Equipped with real-time DOM mutation observers for ChatGPT, Google Gemini, and Claude. Runs without remote server dependencies.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => onNavigateTab('simulator')}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Test in Interactive Simulator</span>
              </button>
            </div>
          </div>

          {/* Backup & Portability Card */}
          <div className="p-6 rounded-2xl bg-[#11121b] border border-white/[0.07] space-y-4">
            <span className="text-xs font-mono font-medium uppercase tracking-wider text-slate-400">
              Data Sovereignty
            </span>
            <h3 className="text-base font-bold text-white">
              Local Backup & Restore
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export your full conversation database as JSON at any time, or import conversations from another device.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleExportJson}
                className="w-full py-2 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export All Data (.json)</span>
              </button>
              <label className="w-full py-2 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
