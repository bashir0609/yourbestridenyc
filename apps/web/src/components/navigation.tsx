'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button, Container } from '@/ui';
import { Icon } from './icon';

const links = [
  ['Services', '/services'],
  ['Our Fleet', '/fleet'],
  ['Our Drivers', '/drivers'],
  ['Service Areas', '/locations'],
] as const;

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="YourBestRide home">
      <span className="brand-mark" aria-hidden="true">
        Y<span>R</span>
        <i />
      </span>
      <span>
        Your<span className="text-gold">Best</span>Ride<small>THE JOURNEY MATTERS</small>
      </span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  return <NavbarContent key={pathname} />;
}

function NavbarContent() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !toggle.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);
  return (
    <header className="site-header">
      <Container className="nav-inner">
        <Brand />
        <nav aria-label="Main navigation" className="desktop-nav">
          {links.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <Button href="/book" className="nav-book">
            Plan your ride <Icon name="arrow" width={16} />
          </Button>
          <button
            ref={toggle}
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </Container>
      <div ref={panel} id="mobile-navigation" hidden={!open} className="mobile-panel">
        <nav aria-label="Mobile navigation">
          {links.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
              <Icon name="arrow" width={16} />
            </Link>
          ))}
          <Link href="/book" onClick={() => setOpen(false)}>
            Plan your ride <Icon name="arrow" width={16} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
