import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Mail, RefreshCcw, X } from 'lucide-react';

import { BrandWordmark } from '@/components/branding/BrandWordmark';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/context/AppContext';

export function LoginModal() {
  const {
    showLoginModal,
    toggleLoginModal,
    sendOtp,
    verifyOtp,
    isSendingOtp,
    isVerifyingOtp,
    errorMessage,
    otpPreviewCode,
    siteConfig,
  } = useApp();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');

  useEffect(() => {
    if (!showLoginModal) {
      setEmail('');
      setOtp('');
      setStep('email');
    }
  }, [showLoginModal]);

  useEffect(() => {
    if (!showLoginModal) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        toggleLoginModal();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [showLoginModal, toggleLoginModal]);

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await sendOtp(email);
      setStep('otp');
    } catch {
      // The context already surfaces the error in the modal and toast.
    }
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await verifyOtp(email, otp);
      setEmail('');
      setOtp('');
      setStep('email');
    } catch {
      // The context already surfaces the error in the modal and toast.
    }
  };

  const handleResendOtp = async () => {
    try {
      await sendOtp(email);
    } catch {
      // The context already surfaces the error in the modal and toast.
    }
  };

  if (!showLoginModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6">
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.62)] backdrop-blur-md" onClick={toggleLoginModal} />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-[8%] top-[12%] h-56 w-56 rounded-full blur-3xl"
          style={{ background: `${siteConfig.branding.primaryColor}14` }}
        />
        <div
          className="absolute bottom-[10%] right-[12%] h-64 w-64 rounded-full blur-3xl"
          style={{ background: `${siteConfig.branding.secondaryColor}16` }}
        />
      </div>

      <div className="relative w-full max-w-[520px] overflow-hidden rounded-[28px] border border-white/50 bg-white text-slate-950 shadow-[0_36px_120px_rgba(15,23,42,0.24)] animate-fade-in">
          <button
            type="button"
            onClick={toggleLoginModal}
            className="absolute right-4 top-4 z-20 rounded-full border border-slate-200 bg-white/90 p-2 text-slate-500 transition hover:bg-white hover:text-slate-950"
            aria-label="Close login modal"
          >
            <X className="h-5 w-5" />
          </button>

      <div className="border-b border-slate-200 bg-white px-6 py-6 sm:px-7 sm:py-7">
        <BrandWordmark
          siteName={siteConfig.siteName}
          branding={siteConfig.branding}
          size="sm"
          className="w-fit"
        />
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          {step === 'email' ? 'Step 01 / Email' : 'Step 02 / Verify'}
        </p>
        <h2 className="mt-2 text-[1.85rem] font-semibold tracking-[-0.03em] text-slate-950">
          {step === 'email' ? 'Send a secure login code' : 'Verify your 6-digit code'}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-7 text-slate-500">
          {step === 'email'
            ? 'Enter your email address. We will send the one-time code there.'
            : `The OTP was sent to ${email}. The code stays valid for 5 minutes.`}
        </p>
      </div>

      <div className="bg-white px-6 py-6 sm:px-7 sm:py-7">
        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="otp-email" className="text-slate-700">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="otp-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-[52px] rounded-2xl border-slate-200 bg-slate-50 pl-10 text-slate-950 placeholder:text-slate-400"
                  autoFocus
                  required
                />
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <p className="text-sm text-slate-500">
              No password is needed. Your workspace state and saved papers will be restored after login.
            </p>

            <Button
              type="submit"
              className="h-12 w-full rounded-2xl bg-[#dd2d3c] text-white hover:bg-[#c72735]"
              disabled={isSendingOtp || !email.trim()}
            >
              {isSendingOtp ? 'Sending OTP...' : 'Send OTP'}
              {!isSendingOtp ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="otp-code" className="text-slate-700">6 digit OTP</Label>
              <InputOTP
                id="otp-code"
                maxLength={6}
                value={otp}
                onChange={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
                containerClassName="justify-between"
                className="w-full"
              >
                <InputOTPGroup className="w-full justify-between gap-2 sm:gap-3">
                  {Array.from({ length: 6 }, (_, index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="h-12 w-12 rounded-[18px] border border-slate-200 bg-slate-50 text-base font-semibold text-slate-950 shadow-none first:rounded-[18px] first:border last:rounded-[18px] data-[active=true]:border-blue-500 data-[active=true]:ring-blue-100 sm:h-14 sm:w-14 sm:text-lg"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {otpPreviewCode ? (
              <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Preview OTP: <span className="font-mono font-semibold tracking-[0.25em] text-slate-950">{otpPreviewCode}</span>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <Button
              type="submit"
              className="h-12 w-full rounded-2xl bg-[#dd2d3c] text-white hover:bg-[#c72735]"
              disabled={isVerifyingOtp || otp.length !== 6}
            >
              {isVerifyingOtp ? 'Verifying...' : 'Verify and Continue'}
              {!isVerifyingOtp ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
              <button type="button" onClick={() => setStep('email')} className="transition hover:text-slate-950">
                Change email
              </button>
              <button type="button" onClick={() => void handleResendOtp()} className="inline-flex items-center gap-2 transition hover:text-slate-950" disabled={isSendingOtp}>
                <RefreshCcw className="h-4 w-4" />
                {isSendingOtp ? 'Sending...' : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}
      </div>
      </div>
    </div>
  );
}
