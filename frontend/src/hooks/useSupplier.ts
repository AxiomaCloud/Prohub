import { useState, useEffect, useCallback } from 'react';

interface Supplier {
  id: string;
  tenantId: string;
  nombre: string;
  nombreFantasia?: string;
  cuit: string;
  status: string;
  email?: string;
  // Datos fiscales
  condicionFiscal?: string;
  tipoFactura?: string;
  // Dirección
  direccion?: string;
  numero?: string;
  piso?: string;
  localidad?: string;
  provincia?: string;
  codigoPostal?: string;
  // Contacto
  telefono?: string;
  whatsapp?: string;
  emailFacturacion?: string;
  contactoNombre?: string;
  contactoCargo?: string;
  // Datos bancarios
  banco?: string;
  tipoCuenta?: string;
  numeroCuenta?: string;
  cbu?: string;
  alias?: string;
  titularCuenta?: string;
  // Notificaciones
  notifEmail?: boolean;
  notifWhatsapp?: boolean;
  notifDocStatus?: boolean;
  notifPagos?: boolean;
  notifComentarios?: boolean;
  notifOC?: boolean;
}

interface UseSupplierResult {
  isSupplier: boolean;
  supplier: Supplier | null;
  supplierId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSupplier(): UseSupplierResult {
  const [isSupplier, setIsSupplier] = useState(false);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSupplier = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar token en ambas ubicaciones
      const token = localStorage.getItem('hub_token') || localStorage.getItem('token');
      if (!token) {
        // Si no hay token, el usuario no está autenticado
        console.log('🏢 [useSupplier] No token found');
        setIsSupplier(false);
        setSupplier(null);
        setLoading(false);
        return;
      }

      console.log('🏢 [useSupplier] Fetching supplier data...');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('🏢 [useSupplier] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🏢 [useSupplier] Supplier data:', data);
        setIsSupplier(data.isSupplier);
        setSupplier(data.supplier);
      } else if (response.status === 404) {
        // No es proveedor - esto es esperado y normal
        console.log('🏢 [useSupplier] Not a supplier (404)');
        setIsSupplier(false);
        setSupplier(null);
      } else if (response.status === 401) {
        // Token inválido o expirado - no es proveedor
        console.log('🏢 [useSupplier] Unauthorized (401)');
        setIsSupplier(false);
        setSupplier(null);
      } else {
        // Otro error - asumimos que no es proveedor
        console.log('🏢 [useSupplier] Other error:', response.status);
        setIsSupplier(false);
        setSupplier(null);
      }
    } catch (err) {
      // Error de red - asumimos que no es proveedor para no bloquear la UI
      console.error('🏢 [useSupplier] Error fetching supplier:', err);
      setIsSupplier(false);
      setSupplier(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSupplier();
  }, [fetchSupplier]);

  return {
    isSupplier,
    supplier,
    supplierId: supplier?.id || null,
    loading,
    error,
    refetch: fetchSupplier,
  };
}
