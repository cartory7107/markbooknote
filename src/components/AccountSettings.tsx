/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  KeyRound,
  Download,
  Trash2,
  Lock,
  ExternalLink,
  Check,
  Chrome,
  AlertTriangle
} from 'lucide-react';
import { LicenseRecord } from '../types';
import { licenseService } from '../services/licenseService';
import { dbService } from '../services/storage/indexedDb';

interface AccountSettingsProps {
  license: LicenseRecord;
  onOpenPricing: () => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ license, onOpenPricing }) => {
  const [userProfile, setUserProfile] = useState({
    name: 'Cartory Developer',
    email: 'cartory7107@gmail.com',
    provider: 'Google Workspace',
    memberSince: 'March 2026'
  });

  const [copiedKey, setCopiedKey] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isPremium = license.plan === 'premium' && license.status === 'active';

  async function handleCopyLicense() {
    await navigator.clipboard.writeText(license.licenseKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  async function handleExportAll() {
    const jsonStr = await dbService.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `markbook-note-full-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handlePurgeLocalData() {
    if (confirm('Are you sure you want to erase all locally stored conversations? This cannot be undone.')) {
      await dbService.clearAllData();
      alert('Local IndexedDB storage cleared.');
    }
  }

  async function handleAccountDeleteConfirm() {
    setIsDeleting(true);
    await dbService.clearAllData();
    licenseService.downgradeToFree();
    setIsDeleting(false);
    setShowDeleteModal(false);
    alert('Account data purged and reset to default free tier.');
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title */}
      <div className="pb-4 border-b border-white/[0.08]">
        <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
          Account & Device Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your subscription entitlements, device pairings, license keys, and privacy boundaries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Col: Profile & Identity */}
        <div className="p-6 rounded-2xl bg-[#11121B] border border-white/[0.07] space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-600/30">
              {userProfile.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{userProfile.name}</h2>
              <p className="text-xs text-slate-400 truncate max-w-[160px]">{userProfile.email}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] space-y-3 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Auth Provider</span>
              <span className="text-slate-200 font-medium">{userProfile.provider}</span>
            </div>
            <div className="flex justify-between">
              <span>Member Since</span>
              <span className="text-slate-200 font-medium">{userProfile.memberSince}</span>
            </div>
            <div className="flex justify-between">
              <span>Paired Device</span>
              <span className="text-slate-200 font-mono text-[11px]">{license.activeDeviceId || 'dev-chrome-01'}</span>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: License, Extension Connection, Privacy */}
        <div className="md:col-span-2 space-y-6">
          {/* Subscription & License Key Card */}
          <div className="p-6 rounded-2xl bg-[#11121B] border border-white/[0.07] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-indigo-400">
                Subscription & License Key
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full border font-mono ${
                  isPremium
                    ? 'text-violet-300 bg-violet-500/20 border-violet-500/30'
                    : 'text-slate-300 bg-white/[0.05] border-white/[0.08]'
                }`}
              >
                {isPremium ? 'Premium (Active)' : 'Free Tier'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#090A0F] border border-white/[0.08]">
              <div>
                <div className="text-[11px] text-slate-500">Access License Key:</div>
                <div className="font-mono text-xs text-indigo-300 font-semibold tracking-wider">
                  {license.licenseKey}
                </div>
              </div>
              <button
                onClick={handleCopyLicense}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-colors flex items-center gap-1.5 shrink-0"
              >
                {copiedKey ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <span>Copy Key</span>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <span>
                {isPremium
                  ? `Renews / Expires: ${new Date(license.expiresAt || 0).toLocaleDateString()}`
                  : `Free auto-saves: ${license.savedCount || 4} / 100`}
              </span>
              {!isPremium && (
                <button
                  onClick={onOpenPricing}
                  className="text-indigo-400 font-semibold hover:underline"
                >
                  Upgrade to Unlimited (৳40/mo)
                </button>
              )}
            </div>
          </div>

          {/* Extension Connection Card */}
          <div className="p-6 rounded-2xl bg-[#11121B] border border-white/[0.07] space-y-3">
            <div className="flex items-center gap-2">
              <Chrome className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Chrome Extension Connection</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Markbook Note Chrome Extension syncs with your local browser IndexedDB directly through browser storage protocols without intermediate servers.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Extension paired with local storage hub</span>
            </div>
          </div>

          {/* Privacy & Data Ownership Card */}
          <div className="p-6 rounded-2xl bg-[#11121B] border border-white/[0.07] space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Privacy Controls & Data Ownership</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Markbook Note provides zero-knowledge custody. Your conversations are never saved to our servers, never mined for advertising, and never indexed for telemetry.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={handleExportAll}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-colors flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Complete Archive</span>
              </button>

              <button
                onClick={handlePurgeLocalData}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
              >
                Clear Local IndexedDB
              </button>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DELETE ACCOUNT MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11121B] border border-white/[0.1] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Delete Account & Data?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will completely erase all your saved conversations from this browser and reset your license entitlement. This operation cannot be reversed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAccountDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
