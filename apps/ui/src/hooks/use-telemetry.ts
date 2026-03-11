/**
 * useTelemetry — identify user and respect telemetry opt-out.
 *
 * Reads telemetryId and telemetryDisabled from daemon config,
 * calls posthog.identify() once, and manages opt-out state.
 */

import { useEffect, useRef } from 'react';
import { usePostHog } from '@posthog/react';
import { useConfig } from './use-config';

export function useTelemetry() {
  const posthog = usePostHog();
  const { data: config } = useConfig();
  const identifiedRef = useRef(false);
  const launchTrackedRef = useRef(false);

  useEffect(() => {
    if (!posthog || !config) return;

    const settings = config.settings || config;
    const telemetryId = settings.telemetryId;
    const disabled = settings.telemetryDisabled === 'true';

    // Apply opt-out / opt-in
    if (disabled) {
      posthog.opt_out_capturing();
      return;
    } else {
      posthog.opt_in_capturing();
    }

    // Identify user once
    if (telemetryId && !identifiedRef.current) {
      posthog.identify(telemetryId);
      identifiedRef.current = true;
    }

    // Track first launch (once per session)
    if (!launchTrackedRef.current) {
      posthog.capture('app_launched', {
        version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown',
      });
      launchTrackedRef.current = true;
    }
  }, [posthog, config]);
}

declare const __APP_VERSION__: string;
