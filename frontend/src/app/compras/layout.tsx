'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { ComprasProvider } from '@/lib/compras-context';

export default function ComprasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ComprasProvider>
      <Sidebar>{children}</Sidebar>
    </ComprasProvider>
  );
}
