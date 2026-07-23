# Client-side QR scanning via JS library, not native BarcodeDetector

For the in-app **Confirmação de Presença** scanner (student PWA reads the instructor's **QR Code Dinâmico da Aula**), we decode the camera stream with a JS library (`qr-scanner`, nimiq) instead of the browser-native `BarcodeDetector` API. The native API is zero-dependency and faster, but Safari/iOS — where most students run the portal as a standalone PWA — does not support it, so a native-only path would leave iPhone students unable to scan at all. The library is headless, so it fits the existing custom `CheckInShell` UI rather than injecting its own.

## Considered Options

- **`BarcodeDetector` only** — rejected: unsupported on iOS Safari/PWA, the primary target.
- **`BarcodeDetector` + dynamic-import library fallback on iOS** — rejected for now: two code paths to maintain for a marginal bundle saving on the Android path; revisit if scanner performance on Android becomes a concern.
- **`html5-qrcode`** — rejected: ships its own styled UI that conflicts with the custom dark viewfinder and is heavier.

## Consequences

- Adds ~45KB (worker-based) to the student bundle, loaded on the check-in route.
- The scanner extracts `?token=` from any decoded URL and lets the backend validate the token — origin is intentionally ignored so QRs generated on a different web origin (cross-site staging/custom domains) still work.
- Requires a secure context (HTTPS ✓ in prod) and iOS 14.3+ for `getUserMedia` in standalone PWA; validate on a real iPhone added to the home screen.
