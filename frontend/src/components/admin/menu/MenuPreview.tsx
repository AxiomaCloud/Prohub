'use client';

import { useState } from 'react';
import { MenuItem } from '@/hooks/useMenu';
import {
  ChevronRight,
  ChevronDown,
  Home,
  Upload,
  CreditCard,
  Settings,
  LogOut,
  User,
  Users,
  FileText,
  PieChart,
  Receipt,
  Shield,
  Send,
  Building2,
  BarChart3,
  FileCheck,
  Banknote,
  CheckCircle,
  Folder,
  TrendingUp,
  Calculator,
  DollarSign,
  Download,
  FileBarChart,
  ArrowLeftRight,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Key,
  Sparkles,
  ScanText,
  Package,
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  ShoppingCart,
  PackageCheck,
  Menu,
  Webhook,
  Lightbulb,
  Boxes,
} from 'lucide-react';
import { clsx } from 'clsx';

interface MenuPreviewProps {
  items: MenuItem[];
  filterByRole?: string | null;  // Si se pasa un rol, filtra los items según permisos
  roleLabel?: string;            // Label del rol para mostrar en el preview
}

// Mapa de íconos para resolver dinámicamente desde el nombre
const IconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Upload,
  CreditCard,
  Settings,
  LogOut,
  User,
  Users,
  FileText,
  PieChart,
  Receipt,
  Shield,
  Send,
  Building2,
  BarChart3,
  FileCheck,
  Banknote,
  CheckCircle,
  Folder,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Calculator,
  DollarSign,
  Download,
  FileBarChart,
  ArrowLeftRight,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Key,
  Sparkles,
  ScanText,
  Package,
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  ShoppingCart,
  PackageCheck,
  Menu,
  Webhook,
  Lightbulb,
  Boxes,
};

// Helper para obtener el componente de ícono desde el nombre
const getIconComponent = (iconName: string): React.ComponentType<{ className?: string }> => {
  return IconMap[iconName] || FileText; // FileText como fallback
};

export function MenuPreview({ items, filterByRole, roleLabel }: MenuPreviewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (itemId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedSections(newExpanded);
  };

  // Función para verificar si un item es visible para el rol seleccionado
  const isVisibleForRole = (item: MenuItem): boolean => {
    // Si no hay filtro por rol, mostrar todo (modo edición)
    if (!filterByRole) return true;

    // SUPER_ADMIN puede ver todo
    if (filterByRole === 'SUPER_ADMIN') return true;

    // Si es superuserOnly, solo SUPER_ADMIN puede verlo
    if (item.superuserOnly) return false;

    // Si no tiene roles asignados (array vacío), solo superusers pueden verlo
    if (!item.allowedRoles || item.allowedRoles.length === 0) return false;

    // Verificar si el rol está en la lista de permitidos
    return item.allowedRoles.includes(filterByRole);
  };

  // Filtrar items según el rol
  const filteredItems = items
    .filter(item => item.isActive && isVisibleForRole(item))
    .map(item => ({
      ...item,
      children: item.children?.filter(child => child.isActive && isVisibleForRole(child))
    }))
    // Remover items padre que no tienen hijos visibles (si no tienen URL propia)
    .filter(item => item.url || (item.children && item.children.length > 0));

  if (filteredItems.length === 0) {
    return (
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-3 min-h-[400px]">
        {/* Header simulado */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 mb-3">
          <div className="w-6 h-6 bg-palette-yellow rounded flex items-center justify-center">
            <Boxes className="w-3.5 h-3.5 text-palette-dark" />
          </div>
          <span className="text-white font-semibold text-sm">Hub</span>
        </div>

        {filterByRole && (
          <div className="mb-3 px-2">
            <span className="text-xs bg-palette-yellow text-palette-dark px-2 py-1 rounded-full">
              {roleLabel || filterByRole}
            </span>
          </div>
        )}

        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Shield className="w-10 h-10 text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">
            Este rol no tiene acceso a ninguna opción del menú
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-3 space-y-1 min-h-[400px]">
      {/* Header simulado */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 mb-3">
        <div className="w-6 h-6 bg-palette-yellow rounded flex items-center justify-center">
          <Boxes className="w-3.5 h-3.5 text-palette-dark" />
        </div>
        <span className="text-white font-semibold text-sm">Hub</span>
      </div>

      {/* Badge del rol cuando está en modo filtro */}
      {filterByRole && (
        <div className="mb-3 px-2">
          <span className="text-xs bg-palette-yellow text-palette-dark px-2 py-1 rounded-full font-medium">
            Vista: {roleLabel || filterByRole}
          </span>
        </div>
      )}

      {/* Items del menú */}
      {filteredItems
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedSections.has(item.id);

          return (
            <div key={item.id} className="space-y-1">
              {/* Item principal */}
              <button
                onClick={() => hasChildren && toggleSection(item.id)}
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2 rounded text-left transition-colors',
                  'text-white hover:bg-gray-700'
                )}
              >
                {/* Ícono con colores invertidos */}
                <div className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center bg-palette-yellow">
                  {(() => {
                    const IconComponent = getIconComponent(item.icon);
                    return <IconComponent className="w-3.5 h-3.5 text-palette-dark" />;
                  })()}
                </div>
                <span className="flex-1 text-sm truncate">{item.title}</span>
                {hasChildren && (
                  <span className="text-gray-400">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </span>
                )}
                {item.superuserOnly && (
                  <span className="text-xs bg-yellow-600 text-white px-1.5 py-0.5 rounded">
                    SU
                  </span>
                )}
              </button>

              {/* Sub-items */}
              {hasChildren && isExpanded && (
                <div className="ml-6 space-y-1 overflow-hidden transition-all">
                  {item.children!
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((child) => (
                      <button
                        key={child.id}
                        className={clsx(
                          'w-full flex items-center gap-2 px-3 py-1.5 rounded text-left transition-colors',
                          'text-white hover:bg-gray-700'
                        )}
                      >
                        {/* Ícono hijo con colores invertidos */}
                        <div className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center bg-palette-yellow">
                          {(() => {
                            const IconComponent = getIconComponent(child.icon);
                            return <IconComponent className="w-3 h-3 text-palette-dark" />;
                          })()}
                        </div>
                        <span className="flex-1 text-xs truncate">{child.title}</span>
                        {child.superuserOnly && (
                          <span className="text-xs bg-yellow-600 text-white px-1 py-0.5 rounded">
                            SU
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
          );
        })}

      {/* Footer simulado */}
      <div className="border-t border-gray-700 mt-4 pt-3">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-6 h-6 bg-palette-yellow rounded-full flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-palette-dark" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">Usuario Demo</p>
            <p className="text-xs text-gray-400 truncate">demo@email.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
