import React, { useState } from 'react';
import { X, Mail, Lock, User, Sparkles, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import { ANIME_AVATARS, UserProfile, saveStoredUser } from '../services/store';
import { fetchDbUserProfile, upsertDbUserProfile } from '../services/supabase';
import { getApiUrl } from '../services/api';

const PorscheIcon = () => (
  <svg className="w-5 h-3.5 inline-block align-middle mr-1.5 text-rose-500" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 9C1.5 9 1.8 8.8 2.2 8.4C2.5 8 3.5 6 4.5 5.5C5.5 5 7.5 4.8 10 2.5C11 1.5 13 1 15.5 1.2C17.5 1.5 18 2.5 19 3.2C20 4 21.5 4.8 22.5 5.2C23 5.5 23.5 6 23.5 6.8C23.5 7.5 22.5 8 20.5 8.2C19.5 8.3 19 9 18.2 9C17.5 9 17 8.2 16 8.2C15 8.2 14.5 9 13.5 9H1" fill="currentColor" fillOpacity="0.15" />
    <path d="M1 9H5.5C5.8 8.2 6.5 7.5 7.5 7.5C8.5 7.5 9.2 8.2 9.5 9H14.5C14.8 8.2 15.5 7.5 16.5 7.5C17.5 7.5 18.2 8.2 18.5 9H23.5V8.5C23.5 7.5 22.8 7 22 6.8C21.2 6.5 19.5 5.5 18.8 4.8C18 4 17.5 2.5 15.5 2C13.5 1.5 11 2 10 3.2C7.5 5.5 5.5 5.8 4.5 6.2C3.5 6.5 2.5 8.2 2.2 8.5C1.8 8.8 1.5 9 1 9Z" fill="currentColor" fillOpacity="0.25" />
    <path d="M9.8 4.2C11 3.2 12.8 2.8 14.5 3.2C15.5 3.5 16 4.2 16.5 4.8" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="7.5" cy="9" r="1.8" fill="#040405" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="7.5" cy="9" r="0.6" fill="currentColor" />
    <circle cx="16.5" cy="9" r="1.8" fill="#040405" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="16.5" cy="9" r="0.6" fill="currentColor" />
  </svg>
);

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }: AuthModalProps) {
   const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(ANIME_AVATARS[0]);
  const [selectedTag, setSelectedTag] = useState<'Otaku' | 'Kuudere' | 'Tsundere' | 'Sirsilvex'>('Otaku');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dual OTP verify system
  const [showVerification, setShowVerification] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifiedUser, setVerifiedUser] = useState<UserProfile | null>(null);

  // Real-time backend states
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [serverFallbackCode, setServerFallbackCode] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSendingCode(true);

    if (!email || !password) {
      setErrorMsg('All credential fields must be filled');
      setIsSendingCode(false);
      return;
    }

    if (mode === 'signup') {
      if (!username) {
        setErrorMsg('Please specify a username');
        setIsSendingCode(false);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        setIsSendingCode(false);
        return;
      }

      try {
        const extProfile = await fetchDbUserProfile(email);
        if (extProfile) {
          setErrorMsg('An account with this email address already exists. Please log in instead.');
          setIsSendingCode(false);
          return;
        }

        const extUser = await fetchDbUserProfile(username);
        if (extUser) {
          setErrorMsg('This username is already taken. Please choose another.');
          setIsSendingCode(false);
          return;
        }
      } catch (e) {}

      const newUser: UserProfile = {
        email,
        username,
        avatar: selectedAvatar,
        bio: 'Freshly registered otaku explorer ready to browse the seasonal catalogs!',
        website: '',
        status: 'Online',
        tag: selectedTag
      };

      try {
        const res = await fetch(getApiUrl('/api/auth/send-otp'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, username, mode: 'signup' })
        });
        const data = await res.json();
        
        if (data.success) {
          setServerFallbackCode(data.fallbackCode || '');
          setIsEmailSent(data.emailSent);
          setVerifiedUser(newUser);
          setShowVerification(true);
        } else {
          setErrorMsg(data.error || 'Failed to dispatch security access code.');
        }
      } catch (err) {
        setErrorMsg('Connection to server failed. Please ensure your backend is active.');
      } finally {
        setIsSendingCode(false);
      }
    } else {
      let targetUser: UserProfile | null = null;
      try {
        const dbUser = await fetchDbUserProfile(email);
        if (dbUser && dbUser.pwd === password) {
          targetUser = {
            email: dbUser.email,
            username: dbUser.username,
            avatar: dbUser.avatar,
            bio: dbUser.bio,
            website: dbUser.website,
            status: dbUser.status || 'Online',
            tag: dbUser.tag
          };
        }
      } catch (e) {}

      if (!targetUser) {
        const existsUser = localStorage.getItem(`user_${email}`);
        const savedPwd = localStorage.getItem(`pwd_${email}`);
        if (existsUser && savedPwd === password) {
          targetUser = JSON.parse(existsUser);
        } else if (email === 'otaku@anipr8v.com' && password === 'otaku123') {
          targetUser = {
            email: 'otaku@anipr8v.com',
            username: 'OtakuSupreme',
            avatar: ANIME_AVATARS[1],
            bio: 'Legendary Otaku. Collector of physical light novels and figures.',
            website: 'https://anipr8v.com',
            status: 'Online',
            tag: 'Sirsilvex'
          };
        } else if (existsUser && savedPwd !== password) {
          setErrorMsg('Incorrect password. Please verify your credentials.');
          setIsSendingCode(false);
          return;
        } else {
          setErrorMsg('Account with this email does not exist. Please sign up free first.');
          setIsSendingCode(false);
          return;
        }
      }

      try {
        const res = await fetch(getApiUrl('/api/auth/send-otp'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, mode: 'login' })
        });
        const data = await res.json();
        
        if (data.success) {
          setServerFallbackCode(data.fallbackCode || '');
          setIsEmailSent(data.emailSent);
          setVerifiedUser(targetUser);
          setShowVerification(true);
        } else {
          setErrorMsg(data.error || 'Failed to dispatch secure access code.');
        }
      } catch (err) {
        setErrorMsg('Connection to dev server failed. Please try again.');
      } finally {
        setIsSendingCode(false);
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setIsVerifyingCode(true);

    if (!verifiedUser) {
      setIsVerifyingCode(false);
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/auth/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otpCode })
      });
      const data = await res.json();

      if (res.status === 200 && data.success) {
        saveStoredUser(verifiedUser);
        localStorage.setItem(`pwd_${email}`, password);
        localStorage.setItem(`user_${email}`, JSON.stringify(verifiedUser));
        await upsertDbUserProfile(verifiedUser, password).catch(() => {});

        setSuccessMsg(mode === 'signup' ? 'Card fully activated! Profile card initialized.' : `Welcome back, @${verifiedUser.username}!`);
        setTimeout(() => {
          onSuccess(verifiedUser);
          onClose();
          // Reset states cleanly
          setShowVerification(false);
          setOtpCode('');
          setVerifiedUser(null);
          setServerFallbackCode('');
          setIsEmailSent(false);
          setSuccessMsg('');
        }, 1200);
      } else {
        setOtpError(data.error || 'Incorrect security code. Confirm details.');
      }
    } catch (err) {
      setOtpError('Failed to verify OTP code on server. Please try again.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-[#08080a] border border-red-950/70 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col">
        
        {/* Decorative Top Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-red-650 via-red-550 to-red-650" />

        {/* Close Icon Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer p-1"
        >
          <X className="w-4 h-4" />
        </button>

        {showVerification ? (
          <>
            {/* Verification Header component */}
            <div className="p-6 pb-2 text-center mt-2">
              <div className="inline-flex p-3 rounded-full bg-red-950/20 border border-red-900/30 text-red-500 mb-2">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                Security Verification
              </h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Multi-factor authentication is active. We have dispatched a security access code.
              </p>
            </div>

            {/* Verification Form */}
            <form onSubmit={handleVerifyOtp} className="p-6 pt-2 flex flex-col gap-4">
              <div className="p-3.5 bg-red-950/10 border border-red-900/35 rounded-xl text-center">
                <span className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block mb-1 font-mono">
                  {isEmailSent ? 'SMTP Email Dispatched' : 'Local Fallback Simulator'}
                </span>
                <span className="text-xs text-zinc-400">
                  {isEmailSent ? 'Security access token sent to:' : 'SMTP settings not configured. Your login code is:'}
                </span>
                <span className="block text-xs font-black text-red-400 font-mono mt-0.5">{email}</span>
                
                {serverFallbackCode && (
                  <>
                    <span className="block mt-3 text-[9.5px] text-zinc-500 font-bold uppercase font-mono">Simulated OTP Token Code:</span>
                    <b className="inline-block mt-0.5 text-white bg-zinc-900 border border-zinc-850 px-3.5 py-1 rounded-lg text-xs font-mono tracking-widest leading-none">
                      {serverFallbackCode}
                    </b>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">6-Digit Verification Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-black border border-zinc-900 focus:border-red-650 text-base text-red-500 text-center font-mono font-extrabold tracking-widest py-2.5 rounded-xl outline-none transition-colors"
                />
                {otpError && (
                  <span className="text-[10px] text-red-500 font-bold font-mono text-center block mt-1">{otpError}</span>
                )}
              </div>

              <button
                type="submit"
                disabled={isVerifyingCode}
                className="w-full py-2.5 bg-[#ef4444] hover:bg-red-700 active:scale-98 transition-all text-white rounded-xl text-xs font-black uppercase tracking-widest font-mono mt-2 cursor-pointer shadow-lg shadow-red-500/10 disabled:opacity-50 disabled:cursor-wait"
              >
                {isVerifyingCode ? 'Authenticating...' : 'Confirm Verification & Auth'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowVerification(false);
                  setOtpCode('');
                  setOtpError('');
                }}
                className="text-[11px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer text-center"
              >
                ← Back to Credentials Editor
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Header content */}
            <div className="p-6 pb-2 text-center mt-2">
              <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono">
                {mode === 'signup' ? 'Create Otaku Deck' : 'Otaku Registration'}
              </h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {mode === 'signup' 
                  ? 'Join free to leave reviews, replies, sync watchlists, and earn custom visual user tags.' 
                  : 'Log in to authorize your streaming credentials and access the direct community hub.'}
              </p>
            </div>

            {/* Content body form */}
            <form onSubmit={handleSubmit} className="p-6 pt-2 flex flex-col gap-4">
              
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-950/10 border border-red-900/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-lg bg-red-950/10 border border-red-900/30 text-red-400 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Form fields */}
              <div className="flex flex-col gap-3">
                {/* Email field */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@streamer.com"
                      className="w-full bg-black border border-zinc-900 focus:border-red-650 text-xs text-zinc-300 px-3 py-2.5 rounded-xl outline-none transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Username block (Signup only) */}
                {mode === 'signup' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Choose Username</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        maxLength={15}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="saitama_punch"
                        className="w-full bg-black border border-zinc-900 focus:border-red-650 text-xs text-zinc-300 px-3 py-2.5 rounded-xl outline-none transition-colors font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Password block */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black border border-zinc-900 focus:border-red-650 text-xs text-zinc-300 px-3 py-2.5 rounded-xl outline-none transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Confirm Password (Signup only) */}
                {mode === 'signup' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Confirm Password</label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-black border border-zinc-900 focus:border-red-650 text-xs text-zinc-300 px-3 py-2.5 rounded-xl outline-none transition-colors font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Customize avatar & tag selector (Signup only) */}
                {mode === 'signup' && (
                  <div className="flex flex-col gap-3.5 border-t border-zinc-900/60 pt-3 mt-1 mr-1">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono block mb-1.5">Select Avatar Card</span>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[340px] scrollbar-thin">
                        {ANIME_AVATARS.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedAvatar(url)}
                            className={`w-8 h-8 rounded-lg overflow-hidden border shrink-0 transition-all ${
                              selectedAvatar === url 
                                ? 'border-red-650 scale-105 shadow shadow-red-500/20' 
                                : 'border-zinc-900 hover:border-zinc-700'
                            }`}
                          >
                            <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono block mb-1.5 font-bold">Select Visual Badge</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['Otaku', 'Kuudere', 'Tsundere', 'Sirsilvex'] as const).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setSelectedTag(tag)}
                            className={`py-1 rounded text-[9.5px] uppercase font-bold font-mono border transition-all truncate text-center cursor-pointer inline-flex items-center justify-center ${
                              selectedTag === tag
                                ? tag === 'Sirsilvex'
                                  ? 'bg-white/10 text-white border-white/40 shadow-sm shadow-white/5 font-black'
                                  : tag === 'Kuudere'
                                  ? 'bg-sky-500/10 text-sky-450 border-sky-500/30'
                                  : tag === 'Tsundere'
                                  ? 'bg-pink-500/10 text-pink-450 border-pink-500/30'
                                  : 'bg-purple-500/10 text-purple-450 border-purple-500/30'
                                : 'bg-transparent border-zinc-900 text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {tag === 'Sirsilvex' && <PorscheIcon />}
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="w-full py-2.5 bg-[#ef4444] hover:bg-red-700 active:scale-98 transition-all text-white rounded-xl text-xs font-black uppercase tracking-widest font-mono mt-2 cursor-pointer shadow-lg shadow-red-500/10"
              >
                {mode === 'signup' ? 'Activate Otaku Card' : 'Authenticate Identity'}
              </button>

              {/* Prompt to swap mode */}
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setSuccessMsg('');
                    setMode(mode === 'signup' ? 'login' : 'signup');
                  }}
                  className="text-[11px] font-bold text-zinc-500 hover:text-red-500 transition-colors cursor-pointer"
                >
                  {mode === 'signup' 
                    ? 'Already have an anime profile? Log In' 
                    : 'Need a customizable otaku identity? Sign Up Free'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
