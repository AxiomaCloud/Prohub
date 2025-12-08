'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ChatWidget } from './ChatWidget';

/**
 * Wrapper del ChatWidget que se integra con AuthContext
 * Solo muestra el widget cuando el usuario está autenticado
 * y no está en páginas públicas como onboarding
 */
export const ChatWidgetWrapper: React.FC = () => {
  const { isAuthenticated, token, tenant } = useAuth();
  const pathname = usePathname();

  // No renderizar en páginas públicas (onboarding)
  if (pathname?.startsWith('/onboarding')) {
    return null;
  }

  // No renderizar si no está autenticado o falta información
  if (!isAuthenticated || !token || !tenant) {
    return null;
  }

  return <ChatWidget tenantId={tenant.id} token={token} />;
};
