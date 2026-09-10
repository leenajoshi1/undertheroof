import type { ReactNode } from 'react';
import './globals.css';

export const metadata = { title: 'Under the Roof', description: 'A home listing sells. We investigate.' };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
