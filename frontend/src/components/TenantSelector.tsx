'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import { useRouter } from 'next/navigation';
import { Building2, Lock, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirmDialog } from '@/hooks/useConfirm';

interface TenantOption {
  id: string;
  name: string;
  legalName: string;
  taxId: string;
}

export function TenantSelector() {
  const { user, tenant, switchTenant, isSuperuser, logout, token } = useAuth();
  const { get } = useApiClient();
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [availableTenants, setAvailableTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

  const handleLogout = async () => {
    const confirmed = await confirm(
      '¿Estás seguro de que quieres cerrar sesión?',
      'Confirmar cierre de sesión',
      'warning'
    );

    if (confirmed) {
      logout();
      window.location.href = '/auth/login';
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Todos los campos son requeridos');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch(`${API_URL}/api/users/me/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar la contraseña');
      }

      toast.success('Contraseña actualizada correctamente');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar la contraseña');
    } finally {
      setChangingPassword(false);
    }
  };

  // Siempre mostrar la barra, aunque no haya tenants
  return (
    <>
      <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-palette-purple to-palette-purple/90 border-b border-palette-purple/20 shadow-sm">
        <div className="flex items-center space-x-3">
          {availableTenants.length > 0 && (
            <>
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
            </>
          )}

          {!tenant && availableTenants.length > 0 && (
            <span className="text-xs text-white bg-red-500 px-3 py-1 rounded-full font-medium">
              Sin organización seleccionada
            </span>
          )}
        </div>

        {/* Iconos de usuario a la derecha */}
        <div className="flex items-center space-x-2">
          <div className="text-right mr-2">
            <div className="text-sm text-white font-medium">{user?.name}</div>
            <div className="text-xs text-white/60">{user?.email}</div>
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            title="Cambiar Contraseña"
          >
            <Lock className="w-5 h-5" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modal de Cambio de Contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => {
              setShowPasswordModal(false);
              setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cambiar Contraseña</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palette-purple focus:border-transparent"
                  placeholder="Ingresa tu contraseña actual"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palette-purple focus:border-transparent"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palette-purple focus:border-transparent"
                  placeholder="Repite la nueva contraseña"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="px-4 py-2 text-sm font-medium text-white bg-palette-dark rounded-lg hover:bg-palette-purple transition-colors disabled:opacity-50"
              >
                {changingPassword ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
