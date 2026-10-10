'use client';

import Link from 'next/link';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { trackEvent, type AnalyticsEvent } from '@/lib/analytics';

type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;
type TrackLinkProps = AnchorProps &
  AnalyticsEvent & {
    href: string;
  };

export function TrackLink({
  href,
  eventName,
  eventParams,
  onClick,
  children,
  ...props
}: TrackLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const resolvedParams =
      'source_page' in eventParams && eventParams.source_page === 'current'
        ? { ...eventParams, source_page: window.location.pathname }
        : eventParams;
    trackEvent(eventName, resolvedParams);
    onClick?.(event);
  };
  const anchorProps = { ...props, onClick: handleClick, children };
  const internal = href.startsWith('/') && !href.startsWith('//');

  return internal ? <Link href={href} {...anchorProps} /> : <a href={href} {...anchorProps} />;
}
