'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Package,
  FileSearch,
  ShoppingCart,
  Receipt,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Award,
} from 'lucide-react';

interface DashboardStats {
  cotizacionesPendientes: number;
  cotizacionesEnviadas: number;
  cotizacionesAdjudicadas: number;
  ordenesActivas: number;
  facturasEnviadas: number;
  pagosPendientes: number;
}

export default function PortalDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    cotizacionesPendientes: 0,
    cotizacionesEnviadas: 0,
    cotizacionesAdjudicadas: 0,
    ordenesActivas: 0,
    facturasEnviadas: 0,
    pagosPendientes: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Por ahora usar datos de ejemplo, luego conectar con la API
        // TODO: Implementar endpoint /api/portal/stats

        // Simular carga
        await new Promise(resolve => setTimeout(resolve, 500));

        setStats({
          cotizacionesPendientes: 3,
          cotizacionesEnviadas: 5,
          cotizacionesAdjudicadas: 2,
          ordenesActivas: 4,
          facturasEnviadas: 8,
          pagosPendientes: 2,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Portal de Proveedor"
        subtitle="Bienvenido al portal de proveedores"
        icon={Package}
      />

      {/* Resumen de Actividad */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Cotizaciones Pendientes */}
        <div
          onClick={() => router.push('/portal/cotizaciones')}
          className="bg-white rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
          </div>
          <h3 className="text-3xl font-bold text-text-primary">{stats.cotizacionesPendientes}</h3>
          <p className="text-text-secondary mt-1">Cotizaciones por responder</p>
          {stats.cotizacionesPendientes > 0 && (
            <p className="text-sm text-orange-600 mt-2">Tienes solicitudes pendientes</p>
          )}
        </div>

        {/* Cotizaciones Enviadas */}
        <div
          onClick={() => router.push('/portal/cotizaciones')}
          className="bg-white rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileSearch className="w-6 h-6 text-blue-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="text-3xl font-bold text-text-primary">{stats.cotizacionesEnviadas}</h3>
          <p className="text-text-secondary mt-1">Cotizaciones enviadas</p>
          <p className="text-sm text-blue-600 mt-2">En evaluacion</p>
        </div>

        {/* Cotizaciones Adjudicadas */}
        <div
          onClick={() => router.push('/portal/cotizaciones')}
          className="bg-white rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
          </div>
          <h3 className="text-3xl font-bold text-text-primary">{stats.cotizacionesAdjudicadas}</h3>
          <p className="text-text-secondary mt-1">Cotizaciones adjudicadas</p>
          <p className="text-sm text-green-600 mt-2">Ganadas este mes</p>
        </div>

        {/* Ordenes Activas */}
        <div
          onClick={() => router.push('/portal/ordenes')}
          className="bg-white rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
          </div>
          <h3 className="text-3xl font-bold text-text-primary">{stats.ordenesActivas}</h3>
          <p className="text-text-secondary mt-1">Ordenes de compra activas</p>
          <p className="text-sm text-purple-600 mt-2">Pendientes de entrega</p>
        </div>

        {/* Facturas Enviadas */}
        <div
          onClick={() => router.push('/portal/facturas')}
          className="bg-white rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Receipt className="w-6 h-6 text-indigo-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <h3 className="text-3xl font-bold text-text-primary">{stats.facturasEnviadas}</h3>
          <p className="text-text-secondary mt-1">Facturas enviadas</p>
          <p className="text-sm text-indigo-600 mt-2">Este mes</p>
        </div>

        {/* Pagos Pendientes */}
        <div
          onClick={() => router.push('/portal/pagos')}
          className="bg-white rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-emerald-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <h3 className="text-3xl font-bold text-text-primary">{stats.pagosPendientes}</h3>
          <p className="text-text-secondary mt-1">Pagos pendientes</p>
          <p className="text-sm text-emerald-600 mt-2">Por cobrar</p>
        </div>
      </div>

      {/* Acciones Rapidas */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Acciones Rapidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/portal/cotizaciones')}
            className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileSearch className="w-5 h-5 text-blue-600" />
            <span className="text-text-primary font-medium">Ver Invitaciones a Cotizar</span>
          </button>
          <button
            onClick={() => router.push('/portal/ordenes')}
            className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-purple-600" />
            <span className="text-text-primary font-medium">Ver Ordenes de Compra</span>
          </button>
          <button
            onClick={() => router.push('/portal/facturas')}
            className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Receipt className="w-5 h-5 text-indigo-600" />
            <span className="text-text-primary font-medium">Cargar Nueva Factura</span>
          </button>
        </div>
      </div>

      {/* Aviso de Bienvenida */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-800">Portal de Proveedores</h3>
            <p className="text-blue-700 mt-1">
              Desde aqui puedes gestionar todas tus cotizaciones, ordenes de compra, facturas y pagos.
              Revisa las invitaciones pendientes para no perder oportunidades de negocio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
