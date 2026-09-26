'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  // Content stays visible in server HTML, without JavaScript, and for reduced motion.
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={reduced ? undefined : { y: [16, 0] }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.65, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
