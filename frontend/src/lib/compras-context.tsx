'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Usuario, Requerimiento, OrdenCompra, Proveedor, Adjunto, EstadoAdjunto, RolUsuario, Recepcion, ItemRecibido } from '@/types/compras';
import { usuariosMock } from '@/lib/mock';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ComprasContextType {
  // Usuario
  usuarioActual: Usuario;
  cambiarUsuario: (id: string) => void;
  usuarios: Usuario[];

  // Requerimientos
  requerimientos: Requerimiento[];
  loadingRequerimientos: boolean;
  agregarRequerimiento: (req: Requerimiento) => void;
  actualizarRequerimiento: (id: string, data: Partial<Requerimiento>) => void;
  refreshRequerimientos: () => Promise<void>;

  // Ordenes de Compra
  ordenesCompra: OrdenCompra[];
  loadingOrdenesCompra: boolean;
  agregarOrdenCompra: (oc: Omit<OrdenCompra, 'id' | 'numero'>) => Promise<OrdenCompra | null>;
  actualizarOrdenCompra: (id: string, data: Partial<OrdenCompra>) => Promise<void>;
  refreshOrdenesCompra: () => Promise<void>;

  // Recepciones
  recepciones: Recepcion[];
  loadingRecepciones: boolean;
  agregarRecepcion: (recepcion: {
    ordenCompraId: string;
    itemsRecibidos: { itemOCId: string; cantidadRecibida: number }[];
    observaciones?: string;
  }) => Promise<Recepcion | null>;
  refreshRecepciones: () => Promise<void>;

  // Proveedores
  proveedores: Proveedor[];
  loadingProveedores: boolean;
  agregarProveedor: (proveedor: Omit<Proveedor, 'id'>) => Promise<Proveedor | null>;
  refreshProveedores: () => Promise<void>;

  // Aprobacion de adjuntos
  aprobarAdjunto: (requerimientoId: string, adjuntoId: string, aprobado: boolean, comentario?: string) => void;

  // Notificaciones (mock)
  notificaciones: Notificacion[];
  agregarNotificacion: (notif: Omit<Notificacion, 'id' | 'fecha'>) => void;
  marcarLeida: (id: string) => void;
}

interface Notificacion {
  id: string;
  tipo: 'APROBACION_PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'OC_GENERADA';
  titulo: string;
  mensaje: string;
  fecha: Date;
  leida: boolean;
  requerimientoId?: string;
}

const ComprasContext = createContext<ComprasContextType | undefined>(undefined);

// Mapear roles del backend a roles del módulo de compras
function mapRolesToComprasRole(roles: string[]): RolUsuario {
  if (roles.includes('PURCHASE_ADMIN') || roles.includes('SUPER_ADMIN') || roles.includes('CLIENT_ADMIN')) {
    return 'ADMIN';
  }
  if (roles.includes('PURCHASE_APPROVER')) {
    return 'APROBADOR';
  }
  return 'SOLICITANTE';
}

export function ComprasProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, tenant: currentTenant } = useAuth();

  // Convertir el usuario autenticado al formato del módulo de compras
  const usuarioActual: Usuario = useMemo(() => {
    if (authUser) {
      const membership = authUser.tenantMemberships?.find(
        (m) => m.tenantId === currentTenant?.id
      );
      const roles = membership?.roles || [];

      return {
        id: authUser.id,
        nombre: authUser.name,
        email: authUser.email,
        rol: mapRolesToComprasRole(roles),
        departamento: 'General',
        avatar: undefined,
      };
    }
    return usuariosMock[0];
  }, [authUser, currentTenant]);

  // Estados
  const [requerimientos, setRequerimientos] = useState<Requerimiento[]>([]);
  const [loadingRequerimientos, setLoadingRequerimientos] = useState(false);
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>([]);
  const [loadingOrdenesCompra, setLoadingOrdenesCompra] = useState(false);
  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
  const [loadingRecepciones, setLoadingRecepciones] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingProveedores, setLoadingProveedores] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  // Helper para obtener token
  const getToken = useCallback(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('hub_token') : null;
  }, []);

  // =============================================
  // REQUERIMIENTOS
  // =============================================
  const fetchRequerimientos = useCallback(async () => {
    if (!currentTenant?.id) return;
    const token = getToken();
    if (!token) return;

    setLoadingRequerimientos(true);
    try {
      const response = await fetch(
        `${API_URL}/api/purchase-requests?tenantId=${currentTenant.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const mappedReqs: Requerimiento[] = data.requerimientos.map((req: any) => ({
          ...req,
          fechaCreacion: new Date(req.fechaCreacion),
          fechaActualizacion: new Date(req.fechaActualizacion),
          fechaNecesaria: req.fechaNecesaria ? new Date(req.fechaNecesaria) : undefined,
          centroCostos: req.centroCostos || '',
          justificacion: req.justificacion || req.descripcion || '',
          descripcion: req.descripcion || req.justificacion || '',
          prioridad: (req.prioridad || 'NORMAL').toUpperCase(),
          adjuntos: req.adjuntos || [],
          items: (req.items || []).map((item: any) => ({
            ...item,
            unidad: item.unidad || item.unidadMedida || 'Unidad',
            precioUnitario: item.precioUnitario || item.precioEstimado || 0,
            total: item.total || ((item.cantidad || 1) * (item.precioUnitario || item.precioEstimado || 0)),
          })),
        }));
        setRequerimientos(mappedReqs);
        console.log(`✅ Cargados ${mappedReqs.length} requerimientos`);
      }
    } catch (error) {
      console.error('Error cargando requerimientos:', error);
    } finally {
      setLoadingRequerimientos(false);
    }
  }, [currentTenant?.id, getToken]);

  const agregarRequerimiento = useCallback((req: Requerimiento) => {
    setRequerimientos((prev) => [req, ...prev]);
    fetchRequerimientos();
  }, [fetchRequerimientos]);

  const actualizarRequerimiento = useCallback(
    (id: string, data: Partial<Requerimiento>) => {
      setRequerimientos((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...data } : r))
      );
    },
    []
  );

  // =============================================
  // ÓRDENES DE COMPRA
  // =============================================
  const fetchOrdenesCompra = useCallback(async () => {
    if (!currentTenant?.id) return;
    const token = getToken();
    if (!token) return;

    setLoadingOrdenesCompra(true);
    try {
      const response = await fetch(
        `${API_URL}/api/purchase-orders?tenantId=${currentTenant.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOrdenesCompra(data.ordenesCompra || []);
        console.log(`✅ Cargadas ${data.ordenesCompra?.length || 0} órdenes de compra`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error cargando órdenes de compra:', response.status, errorData);
      }
    } catch (error) {
      console.error('❌ Error cargando órdenes de compra:', error);
    } finally {
      setLoadingOrdenesCompra(false);
    }
  }, [currentTenant?.id, getToken]);

  const agregarOrdenCompra = useCallback(async (
    ocData: Omit<OrdenCompra, 'id' | 'numero'>
  ): Promise<OrdenCompra | null> => {
    if (!currentTenant?.id) return null;
    const token = getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_URL}/api/purchase-orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          purchaseRequestId: ocData.requerimientoId,
          proveedorId: ocData.proveedorId,
          proveedor: ocData.proveedor ? {
            id: ocData.proveedor.id,
            nombre: ocData.proveedor.nombre,
            cuit: ocData.proveedor.cuit,
            email: ocData.proveedor.email,
            telefono: ocData.proveedor.telefono,
            direccion: ocData.proveedor.direccion,
          } : undefined,
          items: ocData.items.map((item) => ({
            purchaseRequestItemId: item.purchaseRequestItemId, // Referencia al item del requerimiento
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            unidad: item.unidad,
            precioUnitario: item.precioUnitario,
            total: item.total,
          })),
          subtotal: ocData.subtotal,
          impuestos: ocData.impuestos,
          total: ocData.total,
          moneda: ocData.moneda,
          condicionPago: ocData.condicionPago,
          lugarEntrega: ocData.lugarEntrega,
          fechaEntregaEstimada: ocData.fechaEntregaEstimada,
          observaciones: ocData.observaciones,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ OC creada: ${data.ordenCompra.numero}`);

        // Recargar datos
        await Promise.all([fetchOrdenesCompra(), fetchRequerimientos()]);

        return data.ordenCompra;
      } else {
        const errorData = await response.json();
        console.error('Error creando OC:', errorData);
        throw new Error(errorData.error || 'Error al crear la orden de compra');
      }
    } catch (error) {
      console.error('Error creando OC:', error);
      throw error;
    }
  }, [currentTenant?.id, getToken, fetchOrdenesCompra, fetchRequerimientos]);

  const actualizarOrdenCompra = useCallback(
    async (id: string, data: Partial<OrdenCompra>) => {
      const token = getToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/api/purchase-orders/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            estado: data.estado,
            condicionPago: data.condicionPago,
            lugarEntrega: data.lugarEntrega,
            observaciones: data.observaciones,
            fechaEntregaEstimada: data.fechaEntregaEstimada,
          }),
        });

        if (response.ok) {
          // Actualizar estado local
          setOrdenesCompra((prev) =>
            prev.map((oc) => (oc.id === id ? { ...oc, ...data } : oc))
          );
          // Refrescar desde el backend para tener datos actualizados
          await fetchOrdenesCompra();
        } else {
          const errorData = await response.json();
          console.error('Error actualizando OC:', errorData);
          throw new Error(errorData.error || 'Error al actualizar la orden de compra');
        }
      } catch (error) {
        console.error('Error actualizando OC:', error);
        throw error;
      }
    },
    [getToken, fetchOrdenesCompra]
  );

  // =============================================
  // RECEPCIONES
  // =============================================
  const fetchRecepciones = useCallback(async () => {
    if (!currentTenant?.id) return;
    const token = getToken();
    if (!token) return;

    setLoadingRecepciones(true);
    try {
      const response = await fetch(
        `${API_URL}/api/receptions?tenantId=${currentTenant.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRecepciones(data.recepciones || []);
        console.log(`✅ Cargadas ${data.recepciones?.length || 0} recepciones`);
      }
    } catch (error) {
      console.error('Error cargando recepciones:', error);
    } finally {
      setLoadingRecepciones(false);
    }
  }, [currentTenant?.id, getToken]);

  const agregarRecepcion = useCallback(async (recepcionData: {
    ordenCompraId: string;
    itemsRecibidos: { itemOCId: string; cantidadRecibida: number }[];
    observaciones?: string;
  }): Promise<Recepcion | null> => {
    if (!currentTenant?.id) return null;
    const token = getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_URL}/api/receptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          purchaseOrderId: recepcionData.ordenCompraId,
          itemsRecibidos: recepcionData.itemsRecibidos,
          observaciones: recepcionData.observaciones,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Recepción registrada: ${data.recepcion.numero}`);

        // Recargar datos
        await Promise.all([fetchRecepciones(), fetchOrdenesCompra(), fetchRequerimientos()]);

        return data.recepcion;
      } else {
        const error = await response.json();
        console.error('Error registrando recepción:', error);
        return null;
      }
    } catch (error) {
      console.error('Error registrando recepción:', error);
      return null;
    }
  }, [currentTenant?.id, getToken, fetchRecepciones, fetchOrdenesCompra, fetchRequerimientos]);

  // =============================================
  // PROVEEDORES - Ahora se cargan desde Parse via /api/parametros/proveedores
  // =============================================
  const fetchProveedores = useCallback(async () => {
    console.log('[fetchProveedores] Iniciando... tenant:', currentTenant?.id);
    if (!currentTenant?.id) {
      console.log('[fetchProveedores] Sin tenant, abortando');
      return;
    }
    const token = getToken();
    if (!token) {
      console.log('[fetchProveedores] Sin token, abortando');
      return;
    }

    setLoadingProveedores(true);
    try {
      // Primero intentamos cargar desde Parse (parámetros maestros)
      const url = `${API_URL}/api/parametros/proveedores`;
      console.log('[fetchProveedores] Llamando a:', url);
      const parseResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[fetchProveedores] Response status:', parseResponse.status);

      if (parseResponse.ok) {
        const data = await parseResponse.json();
        console.log('[fetchProveedores] Data recibida:', data);
        setProveedores(data.proveedores || []);
        console.log(`✅ Cargados ${data.proveedores?.length || 0} proveedores desde Parse`);
      } else {
        // Fallback: cargar desde la tabla local de suppliers
        console.log('⚠️ Parse no disponible, usando suppliers locales');
        const response = await fetch(
          `${API_URL}/api/suppliers?tenantId=${currentTenant.id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setProveedores(data.proveedores || []);
          console.log(`✅ Cargados ${data.proveedores?.length || 0} proveedores locales`);
        }
      }
    } catch (error) {
      console.error('Error cargando proveedores:', error);
    } finally {
      setLoadingProveedores(false);
    }
  }, [currentTenant?.id, getToken]);

  const agregarProveedor = useCallback(async (
    proveedorData: Omit<Proveedor, 'id'>
  ): Promise<Proveedor | null> => {
    if (!currentTenant?.id) return null;
    const token = getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_URL}/api/suppliers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          ...proveedorData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Proveedor creado: ${data.proveedor.nombre}`);
        await fetchProveedores();
        return data.proveedor;
      } else {
        const error = await response.json();
        console.error('Error creando proveedor:', error);
        return null;
      }
    } catch (error) {
      console.error('Error creando proveedor:', error);
      return null;
    }
  }, [currentTenant?.id, getToken, fetchProveedores]);

  // =============================================
  // EFECTOS - Cargar datos iniciales
  // =============================================
  useEffect(() => {
    console.log('[ComprasContext] useEffect - currentTenant:', currentTenant?.id);
    if (currentTenant?.id) {
      console.log('[ComprasContext] Cargando datos iniciales...');
      fetchRequerimientos();
      fetchOrdenesCompra();
      fetchRecepciones();
      fetchProveedores();
    }
  }, [currentTenant?.id, fetchRequerimientos, fetchOrdenesCompra, fetchRecepciones, fetchProveedores]);

  // =============================================
  // FUNCIONES AUXILIARES
  // =============================================
  const cambiarUsuario = useCallback((id: string) => {
    console.log('cambiarUsuario es deprecado');
  }, []);

  const agregarNotificacion = useCallback(
    (notif: Omit<Notificacion, 'id' | 'fecha'>) => {
      setNotificaciones((prev) => [
        { ...notif, id: `notif-${Date.now()}`, fecha: new Date() },
        ...prev,
      ]);
    },
    []
  );

  const marcarLeida = useCallback((id: string) => {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
  }, []);

  const aprobarAdjunto = useCallback(
    (requerimientoId: string, adjuntoId: string, aprobado: boolean, comentario?: string) => {
      setRequerimientos((prev) =>
        prev.map((r) => {
          if (r.id !== requerimientoId) return r;
          const adjuntosActualizados = r.adjuntos.map((adj) => {
            if (adj.id !== adjuntoId) return adj;
            return {
              ...adj,
              estado: aprobado ? 'APROBADO' : 'RECHAZADO' as EstadoAdjunto,
              aprobadorId: usuarioActual.id,
              aprobador: usuarioActual,
              fechaAprobacion: new Date(),
              comentarioAprobacion: comentario,
            };
          });
          return { ...r, adjuntos: adjuntosActualizados };
        })
      );
    },
    [usuarioActual]
  );

  // Vincular OC a requerimientos (para mostrar en el contexto)
  const requerimientosConOC = useMemo(() => {
    return requerimientos.map((req) => {
      const oc = ordenesCompra.find((o) => o.requerimientoId === req.id);
      return oc ? { ...req, ordenCompra: oc } : req;
    });
  }, [requerimientos, ordenesCompra]);

  return (
    <ComprasContext.Provider
      value={{
        usuarioActual,
        cambiarUsuario,
        usuarios: usuariosMock,
        requerimientos: requerimientosConOC,
        loadingRequerimientos,
        agregarRequerimiento,
        actualizarRequerimiento,
        refreshRequerimientos: fetchRequerimientos,
        ordenesCompra,
        loadingOrdenesCompra,
        agregarOrdenCompra,
        actualizarOrdenCompra,
        refreshOrdenesCompra: fetchOrdenesCompra,
        recepciones,
        loadingRecepciones,
        agregarRecepcion,
        refreshRecepciones: fetchRecepciones,
        proveedores,
        loadingProveedores,
        agregarProveedor,
        refreshProveedores: fetchProveedores,
        aprobarAdjunto,
        notificaciones,
        agregarNotificacion,
        marcarLeida,
      }}
    >
      {children}
    </ComprasContext.Provider>
  );
}

export function useCompras() {
  const context = useContext(ComprasContext);
  if (!context) {
    throw new Error('useCompras debe usarse dentro de ComprasProvider');
  }
  return context;
}
