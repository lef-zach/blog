"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const CONSENT_COOKIE = 'analytics_consent';
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

const getCookieValue = (name: string) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

const setCookieValue = (name: string, value: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${CONSENT_MAX_AGE}; samesite=lax`;
};

export function AnalyticsConsentBanner() {
  const requireConsent = process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT !== 'false';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!requireConsent) return;
    const existing = getCookieValue(CONSENT_COOKIE);
    if (!existing) {
      setVisible(true);
    }
  }, [requireConsent]);

  if (!requireConsent || !visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] border-t border-border/60 bg-background/95 p-4 backdrop-blur">
      <div className="container flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted-foreground">
          We use cookies for basic analytics to understand readership. No ads or tracking pixels.
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setCookieValue(CONSENT_COOKIE, '0');
              setVisible(false);
            }}
          >
            Decline
          </Button>
          <Button
            onClick={() => {
              setCookieValue(CONSENT_COOKIE, '1');
              setVisible(false);
            }}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
