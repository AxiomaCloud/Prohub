'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  FileText,
  CreditCard,
  ShoppingCart,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Documentos Totales',
      value: '0',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Pagos Pendientes',
      value: '$0',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Órdenes Activas',
      value: '0',
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Facturas Aprobadas',
      value: '0',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-palette-dark">
          Bienvenido, {user?.name}
        </h1>
        <p className="text-text-secondary">
          Aquí tienes un resumen de tu actividad en HUB
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-palette-dark mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentos Recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-text-secondary">
                No hay documentos recientes
              </p>
              <p className="text-sm text-text-light mt-2">
                Los documentos que subas aparecerán aquí
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pagos Recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Pagos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-text-secondary">
                No hay pagos recientes
              </p>
              <p className="text-sm text-text-light mt-2">
                El historial de pagos aparecerá aquí
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-accent-light/20 transition-colors">
              <div className="bg-palette-yellow p-2 rounded-lg">
                <FileText className="w-5 h-5 text-palette-dark" />
              </div>
              <span className="font-medium text-palette-dark">Subir Documento</span>
            </button>

            <button className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-accent-light/20 transition-colors">
              <div className="bg-palette-pink p-2 rounded-lg">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium text-palette-dark">Ver Pagos</span>
            </button>

            <button className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-accent-light/20 transition-colors">
              <div className="bg-palette-purple p-2 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium text-palette-dark">Nueva Orden</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
