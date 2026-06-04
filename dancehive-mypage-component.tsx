/**
 * 댄스하이브 마이페이지 — FlowDance 코드 발급 섹션
 *
 * 설치:
 *   npm install @supabase/supabase-js
 *
 * 사용법:
 *   댄스하이브 마이페이지 컴포넌트에 <FlowDanceCodeSection /> 을 추가하세요.
 *   supabase 클라이언트는 이미 사용 중인 댄스하이브 프로젝트 것을 그대로 사용합니다.
 */

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// ── 댄스하이브 Supabase 설정 (기존 프로젝트 클라이언트로 교체 가능) ──
const supabase = createClient(
  'https://uiroeugeyfgdwqbvuitj.supabase.co',
  'sb_publishable_sTuwOHjPsQEpFGM4jPeL_w_4ykw0kif'
);

export function FlowDanceCodeSection() {
  const [code,    setCode]    = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [error,   setError]   = useState('');

  // 기존 발급 코드 불러오기
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('access_codes')
        .select('code')
        .eq('user_email', user.email!.toLowerCase())
        .maybeSingle();

      if (data) setCode(data.code);
      setLoading(false);
    })();
  }, []);

  const handleRequest = async () => {
    setRequesting(true);
    setError('');

    const { data, error: rpcError } = await supabase.rpc('request_my_flowdance_code');

    setRequesting(false);

    if (rpcError || !data?.success) {
      setError('코드 발급에 실패했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setCode(data.code);
  };

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── UI ──────────────────────────────────────────────────────────
  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      padding: '24px',
      background: 'rgba(17,24,39,0.8)',
      maxWidth: '480px',
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(59,130,246,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px'
        }}>
          💃
        </div>
        <div>
          <div style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '15px' }}>
            FlowDance 공연동선 편집기
          </div>
          <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>
            PC 전용 공연 동선 편집 프로그램
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
          불러오는 중...
        </div>
      ) : code ? (
        /* 코드 발급 완료 상태 */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>
            내 라이선스 코드
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', padding: '12px 16px',
          }}>
            <span style={{
              flex: 1, fontFamily: 'monospace', fontSize: '18px',
              fontWeight: 700, color: '#e0e7ff', letterSpacing: '0.1em',
            }}>
              {code}
            </span>
            <button
              onClick={handleCopy}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600, transition: 'all 0.15s',
                background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)',
                color: copied ? '#34d399' : '#93c5fd',
              }}
            >
              {copied ? '✓ 복사됨' : '복사'}
            </button>
          </div>

          {/* 사용 방법 안내 */}
          <div style={{
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '10px', padding: '12px 14px',
          }}>
            <div style={{ color: '#93c5fd', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              💡 사용 방법
            </div>
            <ol style={{ color: '#9ca3af', fontSize: '12px', margin: 0, paddingLeft: '16px', lineHeight: '1.8' }}>
              <li>FlowDance 설치 프로그램을 다운로드하여 설치합니다</li>
              <li>프로그램 실행 후 위 코드를 입력합니다</li>
              <li>이 코드는 영구적으로 사용 가능합니다</li>
            </ol>
          </div>
        </div>
      ) : (
        /* 코드 미발급 상태 */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
            FlowDance 공연동선 편집기를 이용하려면 라이선스 코드가 필요합니다.
            아래 버튼을 클릭하면 코드가 즉시 발급됩니다.
          </p>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '8px', padding: '10px 14px',
              color: '#fca5a5', fontSize: '12px',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleRequest}
            disabled={requesting}
            style={{
              padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: requesting ? 'rgba(59,130,246,0.3)' : '#2563eb',
              color: '#fff', fontSize: '14px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 0.15s', opacity: requesting ? 0.7 : 1,
            }}
          >
            {requesting ? '발급 중...' : '🔑 FlowDance 코드 발급 요청'}
          </button>
        </div>
      )}
    </div>
  );
}
