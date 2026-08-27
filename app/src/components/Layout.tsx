// app/src/components/Layout.tsx
import type { ReactNode } from 'react';
import { Header } from './Header';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-layout">
      <Header />
      <main className="app-main">{children}</main>
    </div>
  );
}
