'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChatWidget } from './ChatWidget';

/**
 * Wrapper del ChatWidget que se integra con AuthContext
 * Solo muestra el widget cuando el usuario está autenticado
 */
export const ChatWidgetWrapper: React.FC = () => {
  const { isAuthenticated, token, tenant } = useAuth();

  // No renderizar si no está autenticado o falta información
  if (!isAuthenticated || !token || !tenant) {
    return null;
  }

  return <ChatWidget tenantId={tenant.id} token={token} />;
};
