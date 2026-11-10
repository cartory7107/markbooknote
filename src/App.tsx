/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { ConversationLibrary } from './components/ConversationLibrary';
import { ContextStudio } from './components/ContextStudio';
import { ExtensionSimulator } from './components/ExtensionSimulator';
import { PricingView } from './components/PricingView';
import { AccountSettings } from './components/AccountSettings';
import { OpenSourceDocs } from './components/OpenSourceDocs';
import { AuthGate } from './components/AuthGate';
import { dbService } from './services/storage/indexedDb';
import { licenseService } from './services/licenseService';
import { authService, AuthUser } from './services/authService';
import { generateExtensionZip } from './services/extensionPackager';
import { OpenNoteView } from './components/OpenNoteView';
import { LicenseRecord } from './types';
import { Download, CheckCircle, ExternalLink, X, RefreshCw } from 'lucide-react';

export default function App() {
  // Determine smart initial tab: check URL for shared note first, then user login status
  const [noteParam, setNoteParam] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const note = params.get('note') || params.get('share');
      if (note) return note;
      if (window.location.hash.includes('note=')) {
        return window.location.hash.split('note=')[1]?.split('&')[0] || null;
      }
      if (window.location.pathname.startsWith('/share/')) {
        return window.location.pathname.replace('/share/', '');
      }
    } catch (e) {}
    return null;
  });

  const [currentTab, setCurrentTab] = useState<string>(() => {
    // 1. If note in URL, view note directly
    const params = new URLSearchParams(window.location.search);
    if (params.get('note') || params.get('share') || window.location.pathname.startsWith('/share/') || window.location.hash.includes('note=')) {
      return 'note';
    }
    // 2. If user already logged in or previously visited/downloaded, skip landing and go straight to Dashboard
    const currentUser = authService.getUser();
    const visited = localStorage.getItem('markbook_user_visited');
    const lastTab = localStorage.getItem('markbook_last_tab');
    if (currentUser || visited === 'true') {
      return (lastTab && lastTab !== 'landing' && lastTab !== 'note') ? lastTab : 'dashboard';
    }
    return 'landing';
  });

  const [license, setLicense] = useState<LicenseRecord>(licenseService.getLicense());
  const [user, setUser] = useState<AuthUser | null>(authService.getUser());
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);

  useEffect(() => {
    const unsubLicense = licenseService.subscribe((rec) => {
      setLicense(rec);
    });
    const unsubAuth = authService.subscribe((u) => {
      setUser(u);
    });

    // Check localStorage cache from extension immediately on load
    try {
      const cached = localStorage.getItem('memora_extension_sync_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          dbService.syncExtensionConversations(parsed);
        }
      }
    } catch (e) {
      // ignore
    }

    // Automatic synchronization bridge with Memora Chrome Extension
    const handleExtensionSync = async (event: MessageEvent) => {
      if (event.data?.type === 'MEMORA_EXTENSION_SYNC') {
        const extConvos = event.data.conversations;
        if (Array.isArray(extConvos) && extConvos.length > 0) {
          console.log(`[Dashboard] Received ${extConvos.length} conversations from Memora Extension`);
          const count = await dbService.syncExtensionConversations(extConvos);
          if (count > 0) {
            setDownloadToast(`✓ Synced ${count} conversations from Chrome Extension!`);
            setTimeout(() => setDownloadToast(null), 3500);
          }
        }
      }
    };

    const handleCustomSync = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const extConvos = customEvent.detail?.conversations;
      if (Array.isArray(extConvos) && extConvos.length > 0) {
        const count = await dbService.syncExtensionConversations(extConvos);
        if (count > 0) {
          setDownloadToast(`✓ Synced ${count} conversations from Chrome Extension!`);
          setTimeout(() => setDownloadToast(null), 3500);
        }
      }
    };

    window.addEventListener('message', handleExtensionSync);
    window.addEventListener('memora:extension-sync', handleCustomSync);

    // Request extension to send local conversations
    window.postMessage({ type: 'REQUEST_MEMORA_EXTENSION_SYNC' }, '*');
    const timer1 = setTimeout(() => {
      window.postMessage({ type: 'REQUEST_MEMORA_EXTENSION_SYNC' }, '*');
    }, 800);
    const timer2 = setTimeout(() => {
      window.postMessage({ type: 'REQUEST_MEMORA_EXTENSION_SYNC' }, '*');
    }, 2500);

    return () => {
      unsubLicense();
      unsubAuth();
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('message', handleExtensionSync);
      window.removeEventListener('memora:extension-sync', handleCustomSync);
    };
  }, []);

  async function handleDownloadExtension() {
    try {
      localStorage.setItem('markbook_user_visited', 'true');
      setDownloadToast('Downloading Chrome Extension (Manifest V3)...');
      // Direct download from public/memora-extension.zip or fallback to JSZip generator
      const link = document.createElement('a');
      link.href = '/memora-extension.zip';
      link.download = 'markbook-note-extension.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadToast('Markbook Note Extension downloaded! Extract and load via chrome://extensions');
      setShowDownloadModal(true);
      setTimeout(() => setDownloadToast(null), 4000);
    } catch (err) {
      // Fallback
      const blob = await generateExtensionZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'markbook-note-extension.zip';
      a.click();
      URL.revokeObjectURL(url);
      setShowDownloadModal(true);
    }
  }

  function handleTabChange(tab: string) {
    if (tab !== 'note' && tab !== 'landing') {
      localStorage.setItem('markbook_last_tab', tab);
      localStorage.setItem('markbook_user_visited', 'true');
    }
    setCurrentTab(tab);
  }

  function handleSelectConversation(convoId: string) {
    setSelectedConvoId(convoId);
    handleTabChange('library');
  }

  function handleNavigateToTransfer(convoId: string) {
    setSelectedConvoId(convoId);
    handleTabChange('context-studio');
  }

  function handleSignOut() {
    authService.signOut();
    if (currentTab === 'dashboard' || currentTab === 'library' || currentTab === 'context-studio') {
      // Keep on view to show AuthGate or redirect
    }
  }

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => handleTabChange(tab)}
        license={license}
        onOpenPricing={() => handleTabChange('pricing')}
        onDownloadExtension={handleDownloadExtension}
        user={user}
        onSignOut={handleSignOut}
        onOpenAuth={() => handleTabChange('library')}
      />

      {/* Download Notification Toast */}
      {downloadToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-2xl flex items-center gap-3 animate-fade-in border border-indigo-400/40">
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* Download Instructions Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11121B] border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Extension Downloaded!</h3>
              </div>
              <button onClick={() => setShowDownloadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Your ready-to-use unpacked Chrome Extension package (<code className="text-indigo-300 font-mono">markbook-note-extension.zip</code>) has been downloaded.
            </p>

            <div className="p-4 rounded-xl bg-[#090A0F] border border-white/[0.08] space-y-2.5 text-xs text-slate-300">
              <div className="font-semibold text-white mb-1">Quick 30-Second Setup in Chrome:</div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-mono font-bold">1.</span>
                <span>Unzip <code className="text-indigo-300">markbook-note-extension.zip</code> into any folder.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-mono font-bold">2.</span>
                <span>In Chrome, go to <code className="text-indigo-300">chrome://extensions</code> and turn on <strong>Developer mode</strong> (top right).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-mono font-bold">3.</span>
                <span>Click <strong>Load unpacked</strong> and select the unzipped folder.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-mono font-bold">4.</span>
                <span>Open <strong>ChatGPT</strong>, <strong>Gemini</strong>, or <strong>Claude</strong>. Markbook Note is now active!</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="/memora-extension.zip"
                download="markbook-note-extension.zip"
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-mono"
              >
                <span>Click here if download didn't start</span>
                <Download className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setShowDownloadModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area based on Tab */}
      <main className="flex-1">
        {currentTab === 'note' && (
          <OpenNoteView
            noteDataOrId={noteParam || selectedConvoId || ''}
            onBackToApp={() => {
              setNoteParam(null);
              handleTabChange(user ? 'dashboard' : 'library');
            }}
          />
        )}

        {currentTab === 'landing' && (
          <LandingPage
            onExplore={() => handleTabChange(user ? 'dashboard' : 'library')}
            onDownloadExtension={handleDownloadExtension}
            onOpenPricing={() => handleTabChange('pricing')}
            license={license}
          />
        )}

        {/* AUTH PROTECTED VIEWS: Dashboard, Library, Context Studio */}
        {currentTab === 'dashboard' && (
          user ? (
            <DashboardView
              license={license}
              onOpenPricing={() => handleTabChange('pricing')}
              onNavigateTab={(tab) => handleTabChange(tab)}
              onSelectConversation={handleSelectConversation}
            />
          ) : (
            <AuthGate
              targetViewName="Dashboard & Saved Memory Metrics"
              onSuccess={() => handleTabChange('dashboard')}
            />
          )
        )}

        {currentTab === 'library' && (
          user ? (
            <ConversationLibrary
              initialSelectedId={selectedConvoId}
              onNavigateToTransfer={handleNavigateToTransfer}
            />
          ) : (
            <AuthGate
              targetViewName="Saved Conversations & Transcripts"
              onSuccess={() => handleTabChange('library')}
            />
          )
        )}

        {currentTab === 'context-studio' && (
          user ? (
            <ContextStudio
              initialConvoId={selectedConvoId}
              onOpenPricing={() => handleTabChange('pricing')}
            />
          ) : (
            <AuthGate
              targetViewName="Context Transfer Studio"
              onSuccess={() => handleTabChange('context-studio')}
            />
          )
        )}

        {currentTab === 'simulator' && (
          <ExtensionSimulator
            license={license}
            onOpenPricing={() => handleTabChange('pricing')}
            onNavigateTab={(tab) => handleTabChange(tab)}
          />
        )}

        {currentTab === 'pricing' && (
          <PricingView
            license={license}
            onActivated={() => {
              setLicense(licenseService.getLicense());
            }}
          />
        )}

        {currentTab === 'account' && (
          <AccountSettings
            license={license}
            onOpenPricing={() => handleTabChange('pricing')}
          />
        )}

        {currentTab === 'docs' && <OpenSourceDocs />}
      </main>
    </div>
  );
}
