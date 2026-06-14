'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dumbbell, Mail, Lock, Eye, EyeOff, AlertCircle, LogIn, ArrowLeft, Send, CheckCircle, ShieldAlert } from 'lucide-react';
import { getRemainingLockoutSeconds } from '@/lib/auth';

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
}

export default function LoginView({ onLogin, onResetPassword }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Rate limiting UI
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Update lockout timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getRemainingLockoutSeconds();
      setLockoutSeconds(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (lockoutSeconds > 0) {
      setError(`Account temporarily locked. Please wait ${lockoutSeconds} seconds.`);
      return;
    }

    setIsLoading(true);

    try {
      await onLogin(email, password);
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';
      
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait and try again.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection and try again.');
      } else if (msg.startsWith('Too many failed attempts')) {
        // Our custom rate limiting message
        setError(msg);
      } else {
        setError('Login failed. Please try again.');
      }

      // Refresh lockout timer
      setLockoutSeconds(getRemainingLockoutSeconds());
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);

    try {
      await onResetPassword(resetEmail);
      setResetSent(true);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        // Don't reveal whether email exists — security best practice
        setResetSent(true);
      } else if (code === 'auth/too-many-requests') {
        setResetError('Too many reset requests. Please wait before trying again.');
      } else {
        setResetError('Unable to send reset email. Please try again later.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const goBackToLogin = () => {
    setShowForgotPassword(false);
    setResetSent(false);
    setResetError('');
    setResetEmail('');
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-[#0D0D0D] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/3 rounded-full blur-3xl pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[420px] mx-4"
      >
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4"
          >
            <Dumbbell size={32} className="text-primary" />
          </motion.div>
          <h1 className="font-heading text-3xl font-black text-white uppercase tracking-[2px]">
            Corenix Club
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            Staff Management Portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border-color rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
          <AnimatePresence mode="wait">
            {!showForgotPassword ? (
              /* ─── Login Form ─── */
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="px-8 py-8"
              >
                <h2 className="text-lg font-heading font-bold text-white mb-1">Welcome Back</h2>
                <p className="text-sm text-text-secondary mb-6">Sign in to access the dashboard</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        autoComplete="email"
                        className="w-full bg-[#0D0D0D] border border-border-color rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder:text-text-secondary/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className="w-full bg-[#0D0D0D] border border-border-color rounded-lg pl-10 pr-12 py-3 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder:text-text-secondary/50 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Forgot Password Link */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setResetEmail(email); // Pre-fill with current email
                      }}
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Rate Limit Warning */}
                  {lockoutSeconds > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg"
                    >
                      <ShieldAlert size={16} className="text-orange-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-orange-400 font-medium leading-relaxed">
                        Account temporarily locked. Try again in {lockoutSeconds}s
                      </span>
                    </motion.div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg"
                    >
                      <AlertCircle size={16} className="text-primary shrink-0 mt-0.5" />
                      <span className="text-xs text-primary font-medium leading-relaxed">{error}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || lockoutSeconds > 0}
                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <LogIn size={16} />
                        Sign In
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              /* ─── Forgot Password Form ─── */
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="px-8 py-8"
              >
                <button
                  onClick={goBackToLogin}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-white transition-colors mb-5 group"
                >
                  <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                  Back to login
                </button>

                {!resetSent ? (
                  <>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Lock size={20} className="text-primary" />
                      </div>
                      <div>
                        <h2 className="text-lg font-heading font-bold text-white">Reset Password</h2>
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary mb-6">
                      Enter your email address and we&apos;ll send you a link to reset your password.
                    </p>

                    <form onSubmit={handleForgotPassword} className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                          <input
                            type="email"
                            required
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="Enter your registered email"
                            autoComplete="email"
                            className="w-full bg-[#0D0D0D] border border-border-color rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder:text-text-secondary/50 transition-all"
                          />
                        </div>
                      </div>

                      {resetError && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg"
                        >
                          <AlertCircle size={16} className="text-primary shrink-0 mt-0.5" />
                          <span className="text-xs text-primary font-medium leading-relaxed">{resetError}</span>
                        </motion.div>
                      )}

                      <button
                        type="submit"
                        disabled={resetLoading}
                        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
                      >
                        {resetLoading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Send size={16} />
                            Send Reset Link
                          </>
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  /* ─── Reset Email Sent Confirmation ─── */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-5">
                      <CheckCircle size={32} className="text-green-400" />
                    </div>
                    <h3 className="text-lg font-heading font-bold text-white mb-2">Check Your Email</h3>
                    <p className="text-sm text-text-secondary mb-1">
                      If an account exists for <span className="text-white font-medium">{resetEmail}</span>,
                    </p>
                    <p className="text-sm text-text-secondary mb-6">
                      you&apos;ll receive a password reset link shortly.
                    </p>
                    <div className="p-3 bg-[#0D0D0D] border border-border-color rounded-lg text-xs text-text-secondary space-y-1">
                      <p>• Check your spam/junk folder if you don&apos;t see it</p>
                      <p>• The link expires in 1 hour</p>
                      <p>• Only the most recent link will work</p>
                    </div>
                    <button
                      onClick={goBackToLogin}
                      className="mt-6 text-sm text-primary hover:text-primary/80 font-bold transition-colors"
                    >
                      Return to Login →
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-text-secondary mt-6 tracking-[1px] uppercase">
          Powered by Fit United
        </p>
      </motion.div>
    </div>
  );
}
