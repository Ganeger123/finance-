
import React, { useState } from 'react';
import { User, UserStatus } from '../types';
import { authApi } from '../api';
import { useLanguage } from '../context/LanguageContext';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState('hachllersocials@gmail.com');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingAccount, setPendingAccount] = useState<{ email: string; name: string } | null>(null);

  const decodeToken = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isRegistering) {
        await authApi.register({
          email,
          password,
          full_name: fullName,
          role: 'user'
        });
        setSuccess('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
        setIsRegistering(false);
        setPassword('');
      } else {
        const data = new URLSearchParams();
        data.append('username', email);
        data.append('password', password);

        const response = await authApi.login(data);
        const { access_token, refresh_token } = response.data;

        localStorage.setItem('token', access_token);
        localStorage.setItem('refreshToken', refresh_token);

        const decoded = decodeToken(access_token);
        if (!decoded) throw new Error("Invalid response from server");

        // Extract display name from email
        const emailParts = email.split('@');
        const displayName = fullName || (emailParts.length > 0 && emailParts[0]
          ? emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1)
          : 'User');

        const user: User = {
          id: decoded.sub || 'unknown',
          full_name: displayName,
          email: email,
          role: decoded.role || 'user',
          status: decoded.status || 'pending'
        };

        if (user.status === 'pending' && user.role !== 'admin') {
          setPendingAccount({ email: user.email, name: user.full_name || 'User' });
          setIsLoading(false);
          return;
        }

        if (user.status === 'rejected') {
          setError("Your account has been rejected. Please contact support.");
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setIsLoading(false);
          return;
        }

        onLogin(user);
      }
    } catch (err: any) {
      console.error('Login error detail:', err);
      console.error('Axios Error Code:', err.code);
      console.error('Axios Config URL:', err.config?.baseURL, err.config?.url);
      console.error('Error Response:', err.response?.status, err.response?.data);

      let message = 'Une erreur est survenue.';

      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || !err.response) {
        const isRender = typeof window !== 'undefined' && window.location.hostname.includes('onrender.com');
        const apiUrl = err.config?.baseURL || 'backend server';
        message = isRender
          ? `Cannot reach the server at ${apiUrl}. On free hosting the backend may be waking up—wait 30–60 seconds and try again.`
          : `Cannot reach the server at ${apiUrl}. Ensure the backend is running on port 8000 and is accessible from your browser.`;
      } else if (err.code === 'ECONNABORTED') {
        message = 'Request timed out. The server may be starting up—wait a moment and try again.';
      } else if (err.response?.data?.detail) {
        const serverDetail = err.response.data.detail;
        message = typeof serverDetail === 'string' ? serverDetail : JSON.stringify(serverDetail);
      } else if (err.response?.status === 401) {
        message = 'Invalid email or password. Please try again.';
      } else if (err.response?.status) {
        message = `Request failed (${err.response.status}). ${err.message || 'Please try again.'}`;
      } else if (err.message) {
        message = err.message;
      }

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingAccount) {
    return (
      <div className="min-h-screen flex bg-[#0d1421] items-center justify-center p-6 font-['Inter']">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="bg-white max-w-lg w-full p-12 sm:p-16 rounded-[3.5rem] shadow-2xl space-y-10 text-center relative z-10">
          <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center text-4xl mx-auto animate-bounce">
            ⏳
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Account Pending</h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              Hello <span className="text-slate-900 font-black">{pendingAccount.name}</span>, your account is currently being reviewed by our administrators.
            </p>
          </div>
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notification Email</div>
            <div className="font-bold text-slate-800">{pendingAccount.email}</div>
          </div>
          <p className="text-sm text-slate-400 font-medium italic">
            You will receive full access once your registration is approved.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
              setPendingAccount(null);
            }}
            className="w-full py-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen flex bg-[#0d1421] relative overflow-hidden font-['Inter'] selection:bg-blue-500/30 selection:text-white">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full"></div>

      {/* Left Side: Branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative z-10 border-r border-slate-800/30">
        <div className="max-w-xl space-y-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Enterprise Secured</span>
          </div>
          <h1 className="text-7xl font-black text-white leading-[1.1] tracking-tighter">
            The next generation of <span className="text-blue-500 italic block">financial</span> management.
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed font-medium max-w-lg">
            Streamline your company's income and expenses with Panacée FinSys. Clean, fast, and Haitian Gourde-native.
          </p>

          <div className="flex gap-16 pt-12 border-t border-slate-800/50">
            <div>
              <div className="text-3xl font-black text-white tracking-tighter">100%</div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Accuracy</div>
            </div>
            <div>
              <div className="text-3xl font-black text-white tracking-tighter">256-bit</div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Encryption</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form Box */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10 w-full">
        <div className="w-full max-w-lg animate-in fade-in slide-in-from-right-8 duration-1000">
          <div className="bg-white p-6 sm:p-16 rounded-[2rem] sm:rounded-[3.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] space-y-8 sm:space-y-10">
            <div className="space-y-3">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">{isRegistering ? t('create_account') : 'Sign In'}</h2>
              <p className="text-sm font-medium text-slate-400">
                {isRegistering ? 'Join Panacée FinSys today.' : 'Welcome back! Please enter your details.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                {isRegistering && (
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold text-slate-800"
                      placeholder="Jean Dupont"
                    />
                  </div>
                )}

                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 uppercase">Work Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold text-slate-800"
                    placeholder="admin@finsys.ht"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Password</label>
                    {!isRegistering && <button type="button" className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors font-black">Forgot?</button>}
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold text-slate-800"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 animate-in shake space-y-2">
                  <p>{error}</p>
                  {(error.includes('waking up') || error.includes('try again') || error.includes('timed out')) && (
                    <p className="text-slate-500 font-medium">Click &quot;Sign In&quot; again to retry.</p>
                  )}
                </div>
              )}
              {success && <div className="p-4 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-2xl border border-emerald-100 animate-in zoom-in">{success}</div>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 bg-[#0d1421] hover:bg-slate-800 text-white font-black rounded-2xl transition-all shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>{isRegistering ? t('create_account') : (language === 'fr' ? 'Se Connecter' : 'Sign In')}</span>
                    <span className="text-xl">→</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 space-y-8">
              {!(import.meta as any).env.PROD && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em]"><span className="bg-white px-4 text-slate-300">Internal Demo Access</span></div>
                </div>
              )}

              {/* Demo Access - Hidden in Production-like environments or via flag */}
              {!(import.meta as any).env.PROD && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-2 duration-700">
                  <button
                    onClick={() => { setEmail('hachllersocials@gmail.com'); setPassword('12122007'); }}
                    className="px-4 py-4 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 hover:border-slate-200 transition-all"
                  >
                    Admin Role
                  </button>
                  <button
                    onClick={() => { setEmail('staff@finsys.ht'); setPassword('staff123'); }}
                    className="px-4 py-4 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 hover:border-slate-200 transition-all"
                  >
                    Staff Role
                  </button>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-[11px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
                >
                  {isRegistering ? 'Back to login' : 'New here? Create corporate account'}
                </button>
              </div>
            </div>
          </div>

          <p className="mt-10 text-center text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] opacity-60">
            © 2024 Panacée Financial Systems • HTG Support Active
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
