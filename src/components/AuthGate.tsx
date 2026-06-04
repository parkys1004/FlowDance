import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';

export function AuthGate() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (authError) {
      if (authError.message.includes('Invalid login')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (authError.message.includes('Email not confirmed')) {
        setError('이메일 인증이 완료되지 않았습니다. 댄스하이브 가입 이메일을 확인해주세요.');
      } else {
        setError('로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        backgroundColor: '#080b14',
        backgroundImage: 'radial-gradient(#1a1f35 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    >
      {/* 로고 */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <img
          src="/icon.png"
          alt="FlowDance"
          className="w-20 h-20 rounded-2xl shadow-2xl"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">FlowDance</h1>
          <p className="text-sm text-neutral-400 mt-0.5">공연동선 편집기</p>
        </div>
      </div>

      {/* 로그인 카드 */}
      <div className="w-full max-w-sm bg-[#111827]/90 border border-white/10 rounded-2xl p-7 shadow-2xl backdrop-blur-md">

        {/* 회원 전용 배지 */}
        <div className="flex items-center justify-center mb-6">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/15 border border-blue-500/30 text-blue-300 text-xs font-semibold">
            <span>🐝</span>
            댄스하이브 회원 전용
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* 이메일 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-400">이메일</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="댄스하이브 가입 이메일"
              required
              autoComplete="email"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-blue-500/60 focus:bg-white/8 transition"
            />
          </div>

          {/* 비밀번호 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-400">비밀번호</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="댄스하이브 비밀번호"
                required
                autoComplete="current-password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-blue-500/60 focus:bg-white/8 transition"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 leading-relaxed">
              {error}
            </p>
          )}

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="mt-1 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> 로그인 중...</>
              : <><LogIn className="w-4 h-4" /> 로그인</>
            }
          </button>
        </form>

        {/* 회원가입 안내 */}
        <div className="mt-5 pt-5 border-t border-white/8 text-center">
          <p className="text-xs text-neutral-500">
            아직 회원이 아니신가요?{' '}
            <a
              href="https://dancehive.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              댄스하이브에서 가입하기 →
            </a>
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-neutral-700">
        FlowDance 공연동선 편집기 · powered by DanceHive
      </p>
    </div>
  );
}
