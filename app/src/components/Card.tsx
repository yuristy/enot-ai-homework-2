// app/src/components/Card.tsx
import type { ReactNode } from 'react';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  const classes = ['card', 'viewfinder', className].filter(Boolean).join(' ');
  return <div className={classes}>{children}</div>;
}
