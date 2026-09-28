'use client';

import Script from 'next/script';
import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView, validateGoogleAnalyticsId } from '@/lib/analytics';

function RoutePageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  useEffect(() => {
    trackPageView(query ? `${pathname}?${query}` : pathname);
  }, [pathname, query]);

  return null;
}

export function GoogleAnalytics() {
  const measurementId = validateGoogleAnalyticsId(process.env.NEXT_PUBLIC_GA_ID);
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${measurementId}',{send_page_view:false});`}
      </Script>
      <Suspense fallback={null}>
        <RoutePageViews />
      </Suspense>
    </>
  );
}
