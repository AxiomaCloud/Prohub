'use client';

import { Sidebar } from '@/components/layout/Sidebar';

export default function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Sidebar>{children}</Sidebar>;
}
