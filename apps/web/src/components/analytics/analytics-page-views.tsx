'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { nextPageViewPath, trackPageView } from '@/lib/analytics';

export function AnalyticsPageViews() {
  const pathname = usePathname();
  const previousPath = useRef<string | undefined>(undefined);

  useEffect(() => {
    const path = nextPageViewPath(previousPath.current, pathname);
    previousPath.current = pathname;
    if (path) trackPageView(path);
  }, [pathname]);

  return null;
}
