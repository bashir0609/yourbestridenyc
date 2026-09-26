import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';
import {
  Button as SharedButton,
  Card as SharedCard,
  Container as SharedContainer,
  cn,
} from '@yourbestride/ui';
export { cn } from '@yourbestride/ui';

type ButtonProps = ComponentPropsWithoutRef<'a'> & {
  href: string;
  variant?: 'gold' | 'outline' | 'dark';
};

export function Button({ href, variant = 'gold', className, children, ...props }: ButtonProps) {
  return (
    <SharedButton
      asChild
      variant={variant === 'dark' ? 'default' : variant}
      className={cn('button', `button-${variant}`, className)}
    >
      <Link href={href} {...props}>
        {children}
      </Link>
    </SharedButton>
  );
}

export function Container({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <SharedContainer className={cn('container-shell', className)} {...props} />;
}

export function Card({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <SharedCard className={cn('card', className)} {...props} />;
}
