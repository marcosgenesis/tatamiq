/**
 * TypeScript fallback for the platform-selected implementations. Metro resolves
 * `.native.ts` or `.web.ts` first; this keeps the shared import type-safe.
 */
export async function openExternalUrl(url: string): Promise<void> {
  throw new Error(`External URL opening is not available on this platform: ${url}`);
}
