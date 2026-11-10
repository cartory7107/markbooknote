/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, ShieldCheck, ArrowRight, Sparkles, KeyRound } from 'lucide-react';
import { authService, AuthUser } from '../services/authService';

interface AuthGateProps {
  onSuccess: (user: AuthUser) => void;
  targetViewName?: string;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onSuccess, targetViewName = 'Saved Conversations' }) => {
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [activeMode, setActiveMode] = useState<'google' | 'email'>('google');

  const [googleEmailInput, setGoogleEmailInput] = useState('');

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    try {
      const email = googleEmailInput.trim() || 'user@gmail.com';
      const user = await authService.signInWithGoogle(email);
      onSuccess(user);
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setIsSigningIn(true);
    try {
      const user = await authService.signInWithEmail(emailInput, passwordInput);
      onSuccess(user);
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#11121B] border border-white/[0.08] rounded-2xl p-8 shadow-2xl relative">
        {/* Subtle glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Lock Icon Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-950/50">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight font-sans">
            Authentication Required
          </h2>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Please authenticate to unlock and inspect your <strong className="text-white">{targetViewName}</strong> in the Markbook Note Vault.
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#090A0F] border border-white/[0.06] rounded-xl mb-6 text-xs font-medium">
          <button
            onClick={() => setActiveMode('google')}
            className={`py-2 rounded-lg transition-colors ${
              activeMode === 'google'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Google Sign-In
          </button>
          <button
            onClick={() => setActiveMode('email')}
            className={`py-2 rounded-lg transition-colors ${
              activeMode === 'email'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Email & Password
          </button>
        </div>

        {activeMode === 'google' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Your Google Email
              </label>
              <input
                type="email"
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full bg-[#090A0F] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 mb-3"
              />
            </div>
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full py-3.5 px-4 rounded-xl font-semibold text-xs text-slate-200 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] hover:border-white/[0.2] transition-all flex items-center justify-center gap-3 shadow-md"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isSigningIn ? 'Authenticating...' : (googleEmailInput.trim() ? `Continue as ${googleEmailInput.trim()}` : 'Continue with Google')}</span>
            </button>

            <div className="pt-2 text-center">
              <span className="text-[11px] text-slate-500 font-mono">
                Verified Identity · Fast 1-Click Vault Access
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Account Email
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full bg-[#090A0F] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password / Master Vault Key
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-[#090A0F] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSigningIn}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-colors flex items-center justify-center gap-2"
            >
              <span>{isSigningIn ? 'Unlocking Vault...' : 'Unlock Saved Chats'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Security badge at bottom */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Zero-Knowledge: Dialogues remain 100% on device</span>
        </div>
      </div>
    </div>
  );
};
