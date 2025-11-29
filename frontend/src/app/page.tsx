'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const handleAuth = async () => {
      // Si viene un token desde Core
      const tokenFromCore = searchParams.get('token');
      const returnUrl = searchParams.get('returnUrl');

      if (tokenFromCore && !isAuthenticating) {
        setIsAuthenticating(true);

        // Guardar token y returnUrl en localStorage
        localStorage.setItem('token', tokenFromCore);

        if (returnUrl) {
          localStorage.setItem('coreReturnUrl', returnUrl);
        }

        // Recargar para que el AuthContext tome el token
        window.location.href = '/dashboard';
        return;
      }

      // Lógica normal de redirección
      if (!isLoading && !isAuthenticating) {
        if (user) {
          router.push('/dashboard');
        } else {
          router.push('/auth/login');
        }
      }
    };

    handleAuth();
  }, [user, isLoading, router, searchParams, isAuthenticating]);

  // Mostrar un loader mientras se verifica la autenticación
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-palette-purple mx-auto"></div>
        <p className="mt-4 text-text-secondary">
          {isAuthenticating ? 'Autenticando desde Core...' : 'Cargando...'}
        </p>
      </div>
    </div>
  );
}
