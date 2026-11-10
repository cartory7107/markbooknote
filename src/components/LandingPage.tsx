/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Download,
  ArrowRight,
  Database,
  Lock,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronDown,
  Check,
  Zap,
  Globe,
  Sliders,
  Sparkles
} from 'lucide-react';
import { LicenseRecord } from '../types';

interface LandingPageProps {
  onExplore: () => void;
  onDownloadExtension: () => void;
  onOpenPricing: () => void;
  license: LicenseRecord;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onExplore,
  onDownloadExtension,
  onOpenPricing,
  license: _license
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activePlatformTab, setActivePlatformTab] = useState<'chatgpt' | 'gemini' | 'claude'>('chatgpt');

  const faqs = [
    {
      q: 'Where are my AI conversations actually stored?',
      a: '100% inside your local browser via IndexedDB. Markbook Note does not send your chat prompts or assistant responses to any remote server by default. Your private queries and proprietary work stay strictly on your device.'
    },
    {
      q: 'What happens when I reach the 100 free conversations limit?',
      a: 'The 100 conversation limit applies only to the Free tier\'s automatic saving entitlement. When reached, automatic background capture pauses, but all previously saved conversations remain completely accessible, searchable, and exportable forever. We never delete or lock your data.'
    },
    {
      q: 'How does cross-platform context transfer work?',
      a: 'Markbook Note packages any prior conversation into an optimized, structured context prompt. With one click, you can copy the context and paste it directly into Claude, ChatGPT, or Gemini to continue your deep work without re-typing context.'
    },
    {
      q: 'Which browsers are supported?',
      a: 'Markbook Note is built on standard Chrome Extension Manifest V3 and runs seamlessly on Google Chrome, Brave, Microsoft Edge, Opera, and Arc browser.'
    },
    {
      q: 'How do I pay for Premium in Bangladesh or internationally?',
      a: 'We support local mobile financial services including bKash and Nagad at ৳40/month, as well as international debit/credit cards through our secure payment gateway.'
    }
  ];

  return (
    <div className="w-full min-h-screen bg-[#090A0F] text-slate-100 flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center flex flex-col items-center">
        {/* Subtle atmospheric glow behind hero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[340px] bg-gradient-to-tr from-indigo-600/15 via-violet-600/10 to-transparent blur-3xl pointer-events-none -z-10" />

        {/* Quiet headline kicker */}
        <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-6">
          <span>Open Source AI Memory Hub</span>
          <span aria-hidden="true">·</span>
          <span>Manifest V3</span>
          <span aria-hidden="true">·</span>
          <span>Zero-Knowledge Local Storage</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl font-sans text-balance">
          Your AI Conversations.{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-300 bg-clip-text text-transparent">
            One Memory.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed text-balance">
          Never lose your AI conversations. Save, organize, and continue your thinking across ChatGPT, Gemini, and Claude.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onDownloadExtension}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            <span>Download Extension</span>
          </button>
          <button
            onClick={onExplore}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] transition-all hover:-translate-y-0.5"
          >
            <span>Explore Markbook Note</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Platform Availability Strip */}
        <div className="mt-16 pt-8 border-t border-white/[0.08] w-full max-w-3xl flex flex-wrap items-center justify-around gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="font-medium text-slate-200">ChatGPT (GPT-4o, o1, o3)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span className="font-medium text-slate-200">Google Gemini (1.5, 2.0 Pro)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
            <span className="font-medium text-slate-200">Claude (3.5, 3.7 Sonnet)</span>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section className="py-20 border-t border-white/[0.06] bg-[#0c0d14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-medium tracking-wider text-indigo-400 uppercase">
              How It Works
            </h2>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-white font-sans">
              Effortless Memory Across Every Model
            </h3>
            <p className="mt-3 text-slate-400 text-sm">
              Markbook Note runs silently in your browser, keeping your cross-model workflows coherent and permanently saved.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-[#11121b] border border-white/[0.07] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm mb-5">
                  01
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Install Chrome Extension</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Add the lightweight Manifest V3 extension to Chrome or any Chromium browser. Enable Auto Mode for passive background storage or Manual Mode for on-demand saving.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.05] text-xs font-mono text-slate-500">
                Single-click install · Manifest V3
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#11121b] border border-white/[0.07] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-sm mb-5">
                  02
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Chat Naturally on Any Platform</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Continue using ChatGPT, Gemini, or Claude as usual. Markbook Note's dedicated DOM adapters detect message turns, capture full markdown code blocks, and index titles.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.05] text-xs font-mono text-slate-500">
                Streaming deduplication · Zero delay
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#11121b] border border-white/[0.07] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm mb-5">
                  03
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Search, Transfer & Hand Off</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Search all your conversations in milliseconds. Copy clean linear context or hand off an entire ChatGPT brainstorm into Claude 3.7 with a single click.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.05] text-xs font-mono text-slate-500">
                Cross-AI handoff · Markdown/JSON
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE FEATURES BENTO GRID */}
      <section className="py-20 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-medium tracking-wider text-indigo-400 uppercase">
              Core Capabilities
            </h2>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-white font-sans">
              Engineered for Privacy & Power Users
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1: 2-column span */}
            <div className="md:col-span-2 p-8 rounded-2xl bg-[#11121b] border border-white/[0.07] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-indigo-500/15 text-indigo-400">
                    <Database className="w-5 h-5" />
                  </div>
                  <h4 className="text-xl font-bold text-white">Pure Local-First IndexedDB Storage</h4>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                  Your thoughts, code snippets, confidential documents, and creative ideas are never synchronized to our servers. All conversation entities and message histories reside in client-side IndexedDB with sub-millisecond search capability.
                </p>
              </div>
              <div className="mt-8 p-4 rounded-xl bg-[#090A0F] border border-white/[0.06] font-mono text-xs text-slate-400 flex items-center justify-between">
                <span>Database: memora_db</span>
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Local Sandboxed
                </span>
              </div>
            </div>

            {/* Bento Card 2: 1-column span */}
            <div className="p-8 rounded-2xl bg-[#11121b] border border-white/[0.07] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-violet-500/15 text-violet-400">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <h4 className="text-xl font-bold text-white">Cross-Model Handoff</h4>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Ever had ChatGPT run into a wall on complex math or Claude hit a token wall on large codebases? Hand off the complete conversation context directly to another AI model in one tap.
                </p>
              </div>
              <div className="mt-8 text-xs font-mono text-indigo-400">
                ChatGPT ⇄ Gemini ⇄ Claude
              </div>
            </div>

            {/* Bento Card 3: 1-column span */}
            <div className="p-8 rounded-2xl bg-[#11121b] border border-white/[0.07] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-amber-500/15 text-amber-400">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <h4 className="text-xl font-bold text-white">Auto & Manual Modes</h4>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Choose between automatic silent background capture that listens for completed responses, or manual capture mode where you snapshot only intentional conversations.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs font-mono text-slate-500">
                <span>Controlled via Extension Popup</span>
              </div>
            </div>

            {/* Bento Card 4: 2-column span */}
            <div className="md:col-span-2 p-8 rounded-2xl bg-[#11121b] border border-white/[0.07] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-indigo-500/15 text-indigo-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <h4 className="text-xl font-bold text-white">Universal Search & Multi-format Export</h4>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                  Quickly query through thousands of prompts across all platforms with instant keyword matching. Export your entire library or individual sessions as clean Markdown, JSON, or Linear Context.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="text-xs font-mono text-slate-300 bg-white/[0.04] px-3 py-1.5 rounded-md border border-white/[0.08]">
                  Export Markdown (.md)
                </span>
                <span className="text-xs font-mono text-slate-300 bg-white/[0.04] px-3 py-1.5 rounded-md border border-white/[0.08]">
                  Backup JSON (.json)
                </span>
                <span className="text-xs font-mono text-slate-300 bg-white/[0.04] px-3 py-1.5 rounded-md border border-white/[0.08]">
                  Clean Text Format
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SUPPORTED AI PLATFORMS INTERACTIVE SHOWCASE */}
      <section className="py-20 border-t border-white/[0.06] bg-[#0c0d14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-mono font-medium tracking-wider text-indigo-400 uppercase">
              Supported Platforms
            </h2>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-white font-sans">
              Tailored DOM Adapters for Every Platform
            </h3>
            <p className="mt-3 text-slate-400 text-sm">
              Each AI provider implements unique UI patterns. Markbook Note uses dedicated, isolated DOM adapters to guarantee clean capture.
            </p>
          </div>

          {/* Platform Segmented Tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl">
              <button
                onClick={() => setActivePlatformTab('chatgpt')}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                  activePlatformTab === 'chatgpt'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ChatGPT (OpenAI)
              </button>
              <button
                onClick={() => setActivePlatformTab('gemini')}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                  activePlatformTab === 'gemini'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Google Gemini
              </button>
              <button
                onClick={() => setActivePlatformTab('claude')}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                  activePlatformTab === 'claude'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Anthropic Claude
              </button>
            </div>
          </div>

          {/* Active Platform Card */}
          <div className="max-w-3xl mx-auto p-8 rounded-2xl bg-[#11121b] border border-white/[0.08]">
            {activePlatformTab === 'chatgpt' && (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
                  <div>
                    <h4 className="text-lg font-bold text-white">ChatGPT Adapter</h4>
                    <p className="text-xs text-slate-400">Target: chatgpt.com & chat.openai.com</p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                    Production Verified
                  </span>
                </div>
                <div className="space-y-4 text-sm text-slate-300">
                  <div className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Captures both user prompt turns and assistant markdown outputs.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Preserves nested syntax-highlighted code blocks and mathematical LaTeX formulas.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Debounces live token streaming so records are only finalized when generation finishes.</span>
                  </div>
                </div>
              </div>
            )}

            {activePlatformTab === 'gemini' && (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
                  <div>
                    <h4 className="text-lg font-bold text-white">Google Gemini Adapter</h4>
                    <p className="text-xs text-slate-400">Target: gemini.google.com</p>
                  </div>
                  <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/20">
                    Production Verified
                  </span>
                </div>
                <div className="space-y-4 text-sm text-slate-300">
                  <div className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>Hooks into web component structures (`user-query-container` & `model-response`).</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>Extracts conversation titles directly from the session top navigation header.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>Resilient against UI layout updates with fallback selector chaining.</span>
                  </div>
                </div>
              </div>
            )}

            {activePlatformTab === 'claude' && (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
                  <div>
                    <h4 className="text-lg font-bold text-white">Anthropic Claude Adapter</h4>
                    <p className="text-xs text-slate-400">Target: claude.ai</p>
                  </div>
                  <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded border border-orange-500/20">
                    Production Verified
                  </span>
                </div>
                <div className="space-y-4 text-sm text-slate-300">
                  <div className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <span>Captures `.font-claude-message` and user prompts cleanly.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <span>Supports multi-artifact outputs and long-form analytical reasoning transcripts.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <span>Deduplicates message index mutations during chat switching.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. PRICING & TIER ARCHITECTURE (FREE VS PREMIUM) */}
      <section className="py-20 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-medium tracking-wider text-indigo-400 uppercase">
              Subscription
            </h2>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-white font-sans">
              Transparent, Ethical Pricing
            </h3>
            <p className="mt-3 text-slate-400 text-sm">
              Your data is never held hostage. Free tier users retain access to all saved data forever.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier Card */}
            <div className="p-8 rounded-2xl bg-[#11121b] border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Free Plan
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-extrabold text-white">৳0</span>
                  <span className="text-xs text-slate-500 font-mono">/ Forever</span>
                </div>
                <p className="text-sm text-slate-400 mb-6">
                  Perfect for testing Markbook Note and organizing your core daily AI interactions.
                </p>

                <ul className="space-y-3.5 text-sm text-slate-300">
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>First 100 saved conversations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Local IndexedDB browser storage</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Basic conversation management</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Basic context export & copy</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>No recurring credit card required</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-white/[0.08]">
                <button
                  onClick={onExplore}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-slate-200 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] transition-colors"
                >
                  Start with Free Tier
                </button>
              </div>
            </div>

            {/* Premium Tier Card */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-[#181628] to-[#11121b] border border-indigo-500/30 flex flex-col justify-between relative shadow-xl shadow-indigo-950/30">
              <div className="absolute top-4 right-4">
                <span className="text-[11px] font-mono font-semibold text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-500/30">
                  Recommended
                </span>
              </div>

              <div>
                <div className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-2">
                  Markbook Note Pro
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-extrabold text-white">৳40</span>
                  <span className="text-xs text-slate-400 font-mono">/ per month</span>
                </div>
                <p className="text-sm text-slate-300 mb-6">
                  For engineers, researchers, and creators who need unlimited automated capture.
                </p>

                <ul className="space-y-3.5 text-sm text-slate-200">
                  <li className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="font-semibold text-white">Unlimited conversation saving</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="font-semibold text-white">Unlimited automatic capture</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Advanced cross-model context transfer</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Advanced export tools (Markdown, JSON, Raw)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Multi-device license key activation</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Pay with bKash, Nagad, or Card</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-indigo-500/20">
                <button
                  onClick={onOpenPricing}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-colors"
                >
                  Upgrade to Premium (৳40/mo)
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PRIVACY GUARANTEE */}
      <section className="py-16 border-t border-white/[0.06] bg-[#0c0d14]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">
            Our Strict Privacy Commitment
          </h3>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
            Markbook Note never transmits, reads, or mines your conversation content on any remote cloud database. All dialogue remains encrypted in your local browser sandbox. Shared links are generated only upon explicit user instruction with client-side revocation keys.
          </p>
        </div>
      </section>

      {/* 7. FAQ SECTION */}
      <section className="py-20 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xs font-mono font-medium tracking-wider text-indigo-400 uppercase">
              Questions & Answers
            </h2>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-white font-sans">
              Frequently Asked Questions
            </h3>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-[#11121b] border border-white/[0.07] overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between text-sm font-semibold text-slate-200 hover:text-white"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      activeFaq === idx ? 'rotate-180 text-indigo-400' : ''
                    }`}
                  />
                </button>
                {activeFaq === idx && (
                  <div className="px-6 pb-5 text-sm text-slate-400 leading-relaxed border-t border-white/[0.04] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. QUIET FOOTER */}
      <footer className="mt-auto border-t border-white/[0.08] bg-[#07080c] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              ⚡
            </div>
            <span className="font-bold text-white text-sm">Markbook Note</span>
            <span className="text-xs text-slate-500 font-mono">
              · Open Source AI Conversation Memory
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <button onClick={onExplore} className="hover:text-white transition-colors">
              Web Dashboard
            </button>
            <button onClick={onDownloadExtension} className="hover:text-white transition-colors">
              Chrome Extension
            </button>
            <button onClick={onOpenPricing} className="hover:text-white transition-colors">
              Pricing (৳40/mo)
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            MIT Licensed · {new Date().getFullYear()} Markbook Note
          </div>
        </div>
      </footer>
    </div>
  );
};
