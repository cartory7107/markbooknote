/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Check,
  Zap,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Lock,
  ArrowRight,
  Sparkles,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { LicenseRecord } from '../types';
import { licenseService } from '../services/licenseService';

interface PricingViewProps {
  license: LicenseRecord;
  onActivated: () => void;
}

export const PricingView: React.FC<PricingViewProps> = ({ license, onActivated }) => {
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<'bkash' | 'nagad' | 'card'>('bkash');
  const [phoneNumberOrCard, setPhoneNumberOrCard] = useState('01700000000');
  const [pinOrOtp, setPinOrOtp] = useState('1234');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{ key: string; msg: string } | null>(null);

  // Manual key entry state
  const [manualKey, setManualKey] = useState('');
  const [manualKeyMsg, setManualKeyMsg] = useState<{ success: boolean; text: string } | null>(null);

  const isPremium = license.plan === 'premium' && license.status === 'active';

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await licenseService.processPayment(paymentProvider, {
        mobileOrCardNumber: phoneNumberOrCard,
        pinOrOtp: pinOrOtp
      });
      setPaymentSuccessData({ key: res.licenseKey, msg: res.message });
      onActivated();
    } catch (err: any) {
      alert(err.message || 'Payment simulation failed.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleManualKeySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualKey.trim()) return;
    const res = await licenseService.activateLicenseKey(manualKey.trim());
    setManualKeyMsg({ success: res.success, text: res.message });
    if (res.success) {
      onActivated();
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
          Simple, Fair Subscription
        </h1>
        <p className="text-slate-400 text-sm">
          Keep your thoughts secure with local-first storage. Upgrade to Premium for unlimited automated capture.
        </p>
      </div>

      {/* Free Limit Rule Banner */}
      <div className="max-w-3xl mx-auto p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed flex items-start gap-3">
        <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Lifetime Access Guarantee:</span>{' '}
          Existing locally stored data always remains accessible. If your subscription expires or you reach the 100-conversation free threshold, your saved conversations are never deleted or locked.
        </div>
      </div>

      {/* PRICING CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
        {/* FREE CARD */}
        <div className="p-8 rounded-2xl bg-[#11121B] border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Free Tier
              </span>
              {!isPremium && (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Current Plan
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-extrabold text-white">৳0</span>
              <span className="text-xs text-slate-500 font-mono">/ Forever</span>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Ideal for personal exploration and archiving your key AI interactions.
            </p>

            <ul className="space-y-3.5 text-sm text-slate-300">
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>First 100 saved conversations</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Client-side IndexedDB local storage</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Basic conversation management</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Basic context export</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>No recurring subscription</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-white/[0.06]">
            <div className="text-xs text-slate-500 text-center">
              Active by default on installation
            </div>
          </div>
        </div>

        {/* PREMIUM CARD */}
        <div className="p-8 rounded-2xl bg-gradient-to-b from-[#181628] to-[#11121B] border border-indigo-500/30 flex flex-col justify-between relative shadow-xl shadow-indigo-950/30">
          <div className="absolute top-4 right-4">
            <span className="text-[11px] font-mono font-semibold text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-500/30">
              Most Popular
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
                Markbook Note Premium
              </span>
              {isPremium && (
                <span className="text-[11px] font-mono text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded border border-violet-500/30">
                  Active
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-extrabold text-white">৳40</span>
              <span className="text-xs text-slate-400 font-mono">/ per month</span>
            </div>
            <p className="text-sm text-slate-300 mb-6">
              Complete freedom for engineers, power researchers, and daily AI users.
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
                <span>Advanced cross-AI context transfer</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Advanced export tools (Markdown, JSON, Raw)</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Premium conversation organization</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Instant bKash, Nagad, and Card checkout</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-indigo-500/20">
            {isPremium ? (
              <div className="text-center py-2 text-xs font-mono text-violet-300 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Premium active until {new Date(license.expiresAt || 0).toLocaleDateString()}</span>
              </div>
            ) : (
              <button
                onClick={() => setShowCheckoutModal(true)}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Upgrade to Premium (৳40/mo)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MANUAL LICENSE KEY ACTIVATION FORM */}
      <div className="max-w-xl mx-auto p-6 rounded-2xl bg-[#11121B] border border-white/[0.08] space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Have an Access License Key?</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          If you received an access key via purchase or organization license, enter it below to activate Premium on this device.
        </p>

        <form onSubmit={handleManualKeySubmit} className="flex gap-2">
          <input
            type="text"
            value={manualKey}
            onChange={(e) => setManualKey(e.target.value)}
            placeholder="MEMORA-PREM-XXXX-XXXX"
            className="flex-1 bg-[#090A0F] border border-white/[0.1] rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 uppercase"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-semibold text-white transition-colors"
          >
            Activate Key
          </button>
        </form>

        {manualKeyMsg && (
          <div
            className={`text-xs p-3 rounded-xl ${
              manualKeyMsg.success
                ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/30 border border-rose-500/30 text-rose-300'
            }`}
          >
            {manualKeyMsg.text}
          </div>
        )}
      </div>

      {/* MULTI-CHANNEL CHECKOUT MODAL (bKash / Nagad / Card) */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11121B] border border-white/[0.1] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            {!paymentSuccessData ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Markbook Note Premium Checkout
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Amount: <strong className="text-white">৳40 BDT</strong> (1-Month Unlimited Pass)
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCheckoutModal(false)}
                    className="text-slate-400 hover:text-white text-sm"
                  >
                    ✕
                  </button>
                </div>

                {/* Gateway Selector Tabs */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentProvider('bkash');
                      setPhoneNumberOrCard('01700000000');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentProvider === 'bkash'
                        ? 'bg-pink-950/30 border-pink-500 text-pink-300'
                        : 'bg-[#090A0F] border-white/[0.08] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs">bKash</div>
                    <div className="text-[10px] text-slate-400">Mobile Wallet</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentProvider('nagad');
                      setPhoneNumberOrCard('01800000000');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentProvider === 'nagad'
                        ? 'bg-orange-950/30 border-orange-500 text-orange-300'
                        : 'bg-[#090A0F] border-white/[0.08] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs">Nagad</div>
                    <div className="text-[10px] text-slate-400">Mobile Wallet</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentProvider('card');
                      setPhoneNumberOrCard('4242 •••• •••• 4242');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentProvider === 'card'
                        ? 'bg-indigo-950/30 border-indigo-500 text-indigo-300'
                        : 'bg-[#090A0F] border-white/[0.08] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs">Card</div>
                    <div className="text-[10px] text-slate-400">Debit / Credit</div>
                  </button>
                </div>

                {/* Form fields */}
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {paymentProvider === 'card' ? 'Card Number' : `${paymentProvider.toUpperCase()} Account Number`}
                    </label>
                    <input
                      type="text"
                      value={phoneNumberOrCard}
                      onChange={(e) => setPhoneNumberOrCard(e.target.value)}
                      required
                      className="w-full bg-[#090A0F] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {paymentProvider === 'card' ? 'CVC / Expiry (MM/YY)' : 'PIN / Verification Code'}
                    </label>
                    <input
                      type="password"
                      value={pinOrOtp}
                      onChange={(e) => setPinOrOtp(e.target.value)}
                      required
                      className="w-full bg-[#090A0F] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCheckoutModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-colors"
                    >
                      {isProcessing ? 'Verifying Payment...' : 'Pay ৳40 & Activate'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center space-y-4 py-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Payment Confirmed!</h3>
                <p className="text-xs text-slate-300">
                  {paymentSuccessData.msg}
                </p>
                <div className="p-3 rounded-xl bg-[#090A0F] border border-white/[0.08] font-mono text-xs text-indigo-300">
                  License: {paymentSuccessData.key}
                </div>
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
