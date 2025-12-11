'use client';

import { useState, useCallback } from 'react';
import { MenuItemsList } from '@/components/admin/menu/MenuItemsList';
import { MenuItemForm } from '@/components/admin/menu/MenuItemForm';
import { MenuPreview } from '@/components/admin/menu/MenuPreview';
import { MenuRolePermissions } from '@/components/admin/menu/MenuRolePermissions';
import { Button } from '@/components/ui/Button';
import { Plus, Menu, List, Shield } from 'lucide-react';
import { useMenu, MenuItem } from '@/hooks/useMenu';
import { clsx } from 'clsx';

type TabType = 'items' | 'permissions';

export default function MenuAdminPage() {
  const { menuItems, loading, refetch } = useMenu();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('items');

  // Estado para el preview filtrado por rol
  const [previewRole, setPreviewRole] = useState<string | null>(null);
  const [previewRoleLabel, setPreviewRoleLabel] = useState<string | null>(null);
  const [permissionMenuItems, setPermissionMenuItems] = useState<MenuItem[]>([]);

  // Callbacks para recibir datos del componente de permisos
  const handleRoleChange = useCallback((role: string | null, roleLabel: string | null) => {
    setPreviewRole(role);
    setPreviewRoleLabel(roleLabel);
  }, []);

  const handleMenuItemsChange = useCallback((items: MenuItem[]) => {
    setPermissionMenuItems(items);
  }, []);

  const handleCreate = () => {
    setSelectedItem(null);
    setIsCreating(true);
    setIsFormOpen(true);
  };

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item);
    setIsCreating(false);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedItem(null);
    setIsCreating(false);
  };

  const handleSuccess = () => {
    refetch();
    handleFormClose();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-palette-yellow rounded-lg flex items-center justify-center">
            <Menu className="w-6 h-6 text-palette-dark" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Administración de Menú
            </h1>
            <p className="text-text-secondary mt-1">
              Gestiona los items del menú y sus permisos por rol
            </p>
          </div>
        </div>
        {activeTab === 'items' && (
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Item
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('items')}
            className={clsx(
              "py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2",
              activeTab === 'items'
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <List className="w-4 h-4" />
            <span>Items de Menú</span>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={clsx(
              "py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2",
              activeTab === 'permissions'
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <Shield className="w-4 h-4" />
            <span>Permisos por Rol</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'items' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-border shadow-sm">
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-text-primary">
                  Items de Menú
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  {menuItems.length} items configurados
                </p>
              </div>
              <div className="p-4">
                <MenuItemsList
                  items={menuItems}
                  loading={loading}
                  onEdit={handleEdit}
                  onRefetch={refetch}
                />
              </div>
            </div>
          </div>

          {/* Preview del sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-border shadow-sm sticky top-6">
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-text-primary">
                  Vista Previa
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  Cómo se verá en el sidebar
                </p>
              </div>
              <div className="p-4">
                <MenuPreview items={menuItems} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Permisos por rol */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-border shadow-sm">
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-text-primary">
                  Permisos por Rol
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  Configura qué opciones de menú puede ver cada rol
                </p>
              </div>
              <div className="p-4">
                <MenuRolePermissions
                  onUpdate={refetch}
                  onRoleChange={handleRoleChange}
                  onMenuItemsChange={handleMenuItemsChange}
                />
              </div>
            </div>
          </div>

          {/* Preview del sidebar filtrado por rol */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-border shadow-sm sticky top-6">
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-text-primary">
                  Vista Previa
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  {previewRoleLabel
                    ? `Menú visible para: ${previewRoleLabel}`
                    : 'Cómo se verá en el sidebar'
                  }
                </p>
              </div>
              <div className="p-4">
                <MenuPreview
                  items={permissionMenuItems.length > 0 ? permissionMenuItems : menuItems}
                  filterByRole={previewRole}
                  roleLabel={previewRoleLabel || undefined}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de formulario */}
      {isFormOpen && (
        <MenuItemForm
          item={selectedItem}
          isOpen={isFormOpen}
          onClose={handleFormClose}
          onSuccess={handleSuccess}
          isCreating={isCreating}
        />
      )}
    </div>
  );
}
