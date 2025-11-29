'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';

interface TenantOption {
  id: string;
  name: string;
  legalName: string;
  taxId: string;
}

export function TenantSelector() {
  const { user, tenant, switchTenant, isSuperuser } = useAuth();
  const { get } = useApiClient();
  const router = useRouter();
  const [availableTenants, setAvailableTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Obtener los tenants del usuario desde sus memberships
  const userTenantCount = user?.tenantMemberships?.length || 0;

  useEffect(() => {
    // Ejecutar cuando el usuario esté cargado
    if (user && !hasInitialized) {
      console.log('🏢 [TenantSelector] Usuario detectado, inicializando...', user.email);
      fetchAvailableTenants();
    }
  }, [user, hasInitialized]);

  const fetchAvailableTenants = async () => {
    if (hasInitialized) {
      console.log('🏢 [TenantSelector] Ya inicializado, omitiendo...');
      return;
    }

    console.log('🏢 [TenantSelector] Iniciando carga de tenants...');
    setHasInitialized(true);

    try {
      console.log('🏢 [TenantSelector] Cargando tenants disponibles...');

      // Si es superuser, obtener todos los tenants
      // Si no, obtener solo los tenants asignados al usuario
      const endpoint = isSuperuser ? '/api/tenants' : '/api/tenants/my-tenants';
      const response = await get<{ tenants: TenantOption[] }>(endpoint);
      console.log('🏢 [TenantSelector] Respuesta:', response);

      if (response.tenants) {
        setAvailableTenants(response.tenants);
        console.log('🏢 [TenantSelector] Tenants cargados:', response.tenants.length);

        // Solo si el usuario NO tiene tenant, autoseleccionar el primero
        if (!tenant && response.tenants.length > 0) {
          console.log('🏢 [TenantSelector] Auto-seleccionando primer tenant:', response.tenants[0].name);
          await handleTenantChange(response.tenants[0].id);
        }
        // Si el usuario ya tiene un tenant, solo verificar que sea válido
        else if (tenant && response.tenants.length > 0) {
          const currentTenantExists = response.tenants.some((t: TenantOption) => t.id === tenant.id);
          if (!currentTenantExists) {
            console.log('🏢 [TenantSelector] Tenant actual no existe, seleccionando primero:', response.tenants[0].name);
            await handleTenantChange(response.tenants[0].id);
          } else {
            console.log('🏢 [TenantSelector] Tenant actual válido:', tenant.name);
          }
        } else {
          console.log('🏢 [TenantSelector] No hay tenants disponibles');
        }
      }
    } catch (error) {
      console.error('Error cargando tenants:', error);
    }
  };

  const handleTenantChange = async (tenantId: string, force = false) => {
    // Solo omitir si el tenant es el mismo Y no se está forzando la actualización
    if (!force && tenantId === tenant?.id) return;

    console.log('🔄 [TenantSelector] Cambiando tenant:', tenantId, force ? '(forzado)' : '');
    setLoading(true);
    try {
      await switchTenant(tenantId);
      console.log('✅ [TenantSelector] Tenant cambiado exitosamente');

      // Recargar la página actual para refrescar los datos con el nuevo tenant
      router.refresh();
    } catch (error) {
      console.error('❌ [TenantSelector] Error cambiando tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  // No mostrar si no hay tenants disponibles
  if (availableTenants.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-palette-purple to-palette-purple/90 border-b border-palette-purple/20 shadow-sm">
      <div className="flex items-center space-x-3">
        <Building2 className="h-5 w-5 text-white" />
        <span className="text-sm font-semibold text-white">Organización:</span>

        <select
          value={tenant?.id || ''}
          onChange={(e) => {
            console.log('🔄 [TenantSelector] Select onChange triggered:', e.target.value);
            handleTenantChange(e.target.value);
          }}
          disabled={loading}
          className="min-w-[280px] h-9 bg-white/95 border border-white/30 rounded-md px-3 text-sm font-medium text-palette-dark shadow-sm focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {availableTenants.map((tenantOption) => (
            <option key={tenantOption.id} value={tenantOption.id}>
              {tenantOption.name} - {tenantOption.taxId}
            </option>
          ))}
        </select>

        {loading && (
          <span className="text-xs text-white/80 bg-white/20 px-2 py-1 rounded animate-pulse">
            Cargando...
          </span>
        )}
      </div>

      {!tenant && availableTenants.length > 0 && (
        <span className="text-xs text-white bg-red-500 px-3 py-1 rounded-full font-medium">
          Sin organización seleccionada
        </span>
      )}
    </div>
  );
}
