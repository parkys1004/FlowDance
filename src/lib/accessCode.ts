import { supabase } from './supabase';

const STORAGE_KEY = 'flowdance-access-code';

export async function verifyCode(code: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('verify_access_code', {
      input_code: code.trim().toUpperCase(),
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

export function getSavedCode(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function saveCode(code: string) {
  localStorage.setItem(STORAGE_KEY, code.trim().toUpperCase());
}

export function clearCode() {
  localStorage.removeItem(STORAGE_KEY);
}
