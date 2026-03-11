/**
 * PostHog analytics — initializes posthog-js with build-time config.
 *
 * Import this module only from main.tsx (for PostHogProvider).
 * Everywhere else, use the usePostHog() hook from @posthog/react.
 */

import posthog from 'posthog-js';

const token = import.meta.env.VITE_PUBLIC_POSTHOG_TOKEN as string | undefined;
const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined;
const apiHost = import.meta.env.VITE_PUBLIC_POSTHOG_API_HOST as string | undefined;

if (token && host) {
  posthog.init(token, {
    ui_host: host,
    api_host: apiHost || host,
    // Capture page views, clicks, etc. automatically
    autocapture: true,
    // Don't send IP — no PII
    ip: false,
    // Use localStorage for persistence (works in Electron)
    persistence: 'localStorage',
    // Disable session recording by default (opt-in later if needed)
    disable_session_recording: true,
  });
}

export default posthog;
