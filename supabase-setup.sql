-- ================================================================
-- FlowDance 액세스 코드 시스템 — Supabase SQL 설정
-- Supabase 대시보드 > SQL Editor 에서 실행하세요
-- https://supabase.com/dashboard/project/uiroeugeyfgdwqbvuitj/sql/new
-- ================================================================

-- 1. access_codes 테이블 생성 (없으면 새로 생성)
CREATE TABLE IF NOT EXISTS public.access_codes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT        UNIQUE NOT NULL,
  user_email  TEXT,
  label       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- user_email 컬럼이 없는 경우 추가
ALTER TABLE public.access_codes
  ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 이메일 인덱스
CREATE INDEX IF NOT EXISTS idx_access_codes_email
  ON public.access_codes(user_email);

-- RLS 활성화 (직접 접근 차단)
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- 2. 내부용 코드 생성 헬퍼 (XXXX-XXXX-XXXX 형식)
CREATE OR REPLACE FUNCTION private_generate_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars  TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT;
  i      INT;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..12 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      IF i IN (4, 8) THEN result := result || '-'; END IF;
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.access_codes WHERE code = result
    );
  END LOOP;
  RETURN result;
END;
$$;

-- 3. 댄스하이브 로그인 회원 전용 코드 발급 함수
--    auth.uid() 로 인증된 사용자만 호출 가능
CREATE OR REPLACE FUNCTION public.request_my_flowdance_code()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_email TEXT;
  v_code  TEXT;
BEGIN
  -- 로그인하지 않은 경우 거부
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- 사용자 이메일 조회
  SELECT lower(email) INTO v_email
  FROM auth.users
  WHERE id = v_uid;

  -- 기존에 발급된 코드가 있으면 그대로 반환
  SELECT code INTO v_code
  FROM public.access_codes
  WHERE user_email = v_email
  LIMIT 1;

  -- 없으면 신규 생성
  IF v_code IS NULL THEN
    v_code := private_generate_code();
    INSERT INTO public.access_codes (code, user_email, label)
    VALUES (v_code, v_email, v_email);
  END IF;

  RETURN jsonb_build_object('success', true, 'code', v_code);
END;
$$;

-- authenticated 역할에만 실행 권한 부여 (로그인 회원만)
GRANT EXECUTE ON FUNCTION public.request_my_flowdance_code() TO authenticated;

-- 4. FlowDance 앱에서 코드 유효성 검증 함수 (anon 접근 허용)
CREATE OR REPLACE FUNCTION public.verify_access_code(input_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.access_codes
    WHERE UPPER(TRIM(code)) = UPPER(TRIM(input_code))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_access_code(TEXT) TO anon;
