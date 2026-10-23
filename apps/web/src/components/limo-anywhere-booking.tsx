'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ORES_ALIAS, ORES_WIDGET_LOADER_URL } from '@/lib/booking';

const SCRIPT_ID = 'limo-anywhere-ores-widget';
const LOAD_TIMEOUT_MS = 15_000;
const LOADER_RAN_FLAG = 'ybrOresLoaderRan';

type LimoAnywhereBookingProps = {
  bookingUrl: string;
};

export function LimoAnywhereBooking({ bookingUrl }: LimoAnywhereBookingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  // The vendor loader is an IIFE with no exported re-initialization API. It scans
  // the document for uninitialized anchors only when the script executes. On a
  // client-side return to /book, Next.js renders a fresh anchor but may not
  // re-execute the cached loader, so the script element is re-created to force
  // a fresh scan. The window flag prevents a duplicate load on first mount.
  const reinitializeAfterClientNavigation = useCallback(() => {
    const window_ = window as typeof window & { [LOADER_RAN_FLAG]?: boolean };
    if (!window_[LOADER_RAN_FLAG]) return;

    const anchor = containerRef.current?.querySelector<HTMLAnchorElement>(
      '[data-ores-widget="website"]',
    );
    if (!anchor || anchor.dataset.widgetInitialized === 'true') return;

    document.getElementById(SCRIPT_ID)?.remove();

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = ORES_WIDGET_LOADER_URL;
    script.async = true;
    script.addEventListener('error', () => setStatus('failed'), { once: true });
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const markReady = () => {
      const iframe = container.querySelector<HTMLIFrameElement>('.ores4iframe');
      if (iframe) {
        if (!iframe.title.trim()) iframe.title = 'Your Best Ride secure reservation form';
        const window_ = window as typeof window & { [LOADER_RAN_FLAG]?: boolean };
        window_[LOADER_RAN_FLAG] = true;
        setStatus('ready');
      }
    };

    if (container.querySelector('.ores4iframe')) {
      markReady();
    } else {
      reinitializeAfterClientNavigation();
    }

    const observer = new MutationObserver(markReady);
    observer.observe(container, { childList: true, subtree: true });

    const timeout = window.setTimeout(() => {
      if (!container.querySelector('.ores4iframe')) setStatus('failed');
    }, LOAD_TIMEOUT_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [reinitializeAfterClientNavigation]);

  return (
    <div className="ores-booking">
      <div className="ores-widget-frame" ref={containerRef} aria-busy={status === 'loading'}>
        {status === 'loading' && (
          <div className="ores-loading" role="status">
            <span className="ores-loading-mark" aria-hidden="true" />
            Loading secure reservation options…
          </div>
        )}
        {status === 'failed' && (
          <p className="ores-widget-notice" role="status">
            The embedded reservation form could not be loaded.
          </p>
        )}
        <a href={bookingUrl} data-ores-widget="website" data-ores-alias={ORES_ALIAS}>
          Online Reservations
        </a>
      </div>

      <Script
        id={SCRIPT_ID}
        src={ORES_WIDGET_LOADER_URL}
        strategy="afterInteractive"
        onReady={reinitializeAfterClientNavigation}
        onError={() => setStatus('failed')}
      />
    </div>
  );
}
