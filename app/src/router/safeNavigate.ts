import type { RouteLocationRaw } from 'vue-router';
import { isNavigationFailure, NavigationFailureType } from 'vue-router';
import router from './index';

export function isValidLocation(to: RouteLocationRaw): boolean {
  if (!to) return false;
  if (typeof to === 'string') return to.length > 0 && to !== '#';
  
  const named = (to as any).name;
  const path = (to as any).path;
  
  // For named routes, ensure required params exist (no undefined)
  if (named && (to as any).params) {
    const params = (to as any).params as Record<string, unknown>;
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') return false;
    }
  }
  
  // For path routes, ensure non-empty
  if (!named && !path) return false;
  
  return true;
}

export async function safePush(to: RouteLocationRaw) {
  if (!isValidLocation(to)) {
    console.warn('[router] Ignoring invalid navigation:', to);
    return;
  }
  
  try {
    const res = await router.push(to);
    if (isNavigationFailure(res, NavigationFailureType.aborted)) return;
  } catch (e) {
    // swallow only known router errors; rethrow others
    console.error('[router] push failed', to, e);
  }
}

export function safeResolve(to: RouteLocationRaw) {
  if (!isValidLocation(to)) return null;
  
  try {
    return router.resolve(to);
  } catch (e) {
    console.error('[router] resolve failed', to, e);
    return null;
  }
}
