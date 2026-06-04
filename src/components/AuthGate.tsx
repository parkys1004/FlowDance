import { useState, type FormEvent } from 'react';
import { verifyCode, saveCode } from '../lib/accessCode';
import { KeyRound, Loader2, ArrowRight } from 'lucide-react';

export function AuthGate() {
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleInput = (v: string) => {
    // 영숫자만 허용, 대문자 변환, 4자마다 - 자동 삽입
    const raw = v.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join('-') ?? raw;
    setCode(formatted);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const raw = code.replace(/-/g, '');
    if (!raw) return;

    setLoading(true);
    setError('');

    const valid = await verifyCode(raw);
    setLoading(false);

    if (valid) {
      saveCode(raw);
      window.location.reload(); // 인증 상태 새로고침
    } else {
      setError('유효하지 않은 코드입니다. 댄스하이브에서 발급받은 코드를 확인해주세요.');
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

      {/* 코드 입력 카드 */}
      <div className="w-full max-w-sm bg-[#111827]/90 border border-white/10 rounded-2xl p-7 shadow-2xl backdrop-blur-md">

        <div className="flex flex-col items-center gap-1.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-1">
            <KeyRound className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-sm font-bold text-neutral-100">라이선스 코드 입력</h2>
          <p className="text-xs text-neutral-500 text-center leading-relaxed">
            댄스하이브에서 발급받은 코드를 입력해주세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={code}
            onChange={e => handleInput(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            required
            autoComplete="off"
            autoFocus
            spellCheck={false}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-center text-neutral-100 font-mono tracking-widest placeholder:text-neutral-700 placeholder:tracking-widest outline-none focus:border-blue-500/60 focus:bg-white/8 transition"
          />

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 leading-relaxed text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || code.replace(/-/g, '').length < 4}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> 확인 중...</>
              : <><ArrowRight className="w-4 h-4" /> 시작하기</>
            }
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-white/8 text-center">
          <p className="text-xs text-neutral-500">
            코드가 없으신가요?{' '}
            <a
              href="https://dancehive.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              댄스하이브에서 발급받기 →
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
