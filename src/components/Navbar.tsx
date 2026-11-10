/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, Sparkles, User, ShieldCheck, Lock, Unlock, LogOut } from 'lucide-react';
import { LicenseRecord } from '../types';
import { AuthUser } from '../services/authService';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  license: LicenseRecord;
  onOpenPricing: () => void;
  onDownloadExtension: () => void;
  user: AuthUser | null;
  onSignOut: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  license,
  onOpenPricing,
  onDownloadExtension,
  user,
  onSignOut,
  onOpenAuth
}) => {
  const isPremium = license.plan === 'premium' && license.status === 'active';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#090A0F]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab(user ? 'dashboard' : 'landing')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight text-white font-sans">
                Markbook Note
              </span>
              <span className="text-[10px] font-mono font-medium text-indigo-400">
                v1.0
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`whitespace-nowrap transition-colors hover:text-white ${
              currentTab === 'dashboard' ? 'text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onSelectTab('library')}
            className={`whitespace-nowrap transition-colors hover:text-white ${
              currentTab === 'library' ? 'text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Conversation Library
          </button>
          <button
            onClick={() => onSelectTab('context-studio')}
            className={`whitespace-nowrap transition-colors hover:text-white ${
              currentTab === 'context-studio' ? 'text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Context Transfer
          </button>
          <button
            onClick={() => onSelectTab('simulator')}
            className={`whitespace-nowrap transition-colors hover:text-white ${
              currentTab === 'simulator' ? 'text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Extension Simulator
          </button>
          <button
            onClick={() => onSelectTab('pricing')}
            className={`whitespace-nowrap transition-colors hover:text-white ${
              currentTab === 'pricing' ? 'text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Pricing & Plan
          </button>
          <button
            onClick={() => onSelectTab('docs')}
            className={`whitespace-nowrap transition-colors hover:text-white ${
              currentTab === 'docs' ? 'text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Open Source Docs
          </button>
        </nav>

        {/* Zone 3: Primary Action & Plan Indicator */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Plan Indicator */}
          <button
            onClick={onOpenPricing}
            className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              isPremium
                ? 'bg-violet-950/40 text-violet-300 border-violet-700/50 hover:bg-violet-900/40'
                : 'bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]'
            }`}
          >
            {isPremium ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                <span>Premium</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>Free (100)</span>
              </>
            )}
          </button>

          {/* User Vault State */}
          {user ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onSelectTab('account')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 hover:border-indigo-400 transition-colors"
                title={`Signed in as ${user.email}`}
              >
                <div className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline font-mono text-[11px] max-w-[100px] truncate">{user.name}</span>
                <Unlock className="w-3 h-3 text-emerald-400" />
              </button>

              <button
                onClick={onSignOut}
                className="p-1.5 rounded-lg border border-white/[0.08] text-slate-400 hover:text-rose-400 hover:bg-white/[0.06] transition-colors"
                title="Lock Vault / Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-colors"
              title="Sign in to unlock saved chats"
            >
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Unlock Vault</span>
            </button>
          )}

          {/* Download Extension Primary CTA */}
          <button
            onClick={onDownloadExtension}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Get Extension</span>
            <span className="sm:hidden">Extension</span>
          </button>
        </div>
      </div>
    </header>
  );
};
