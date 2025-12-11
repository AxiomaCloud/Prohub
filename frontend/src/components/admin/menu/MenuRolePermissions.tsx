'use client';

import { useState, useEffect } from 'react';
import { Shield, Check, X, Loader2, ChevronRight, Users } from 'lucide-react';
import axios from 'axios';
import { clsx } from 'clsx';
import { MenuItem } from '@/hooks/useMenu';

interface Role {
  value: string;
  label: string;
  description: string;
}

interface MenuRolePermissionsProps {
  onUpdate?: () => void;
  onRoleChange?: (role: string | null, roleLabel: string | null) => void;
  onMenuItemsChange?: (items: MenuItem[]) => void;
}

export function MenuRolePermissions({ onUpdate, onRoleChange, onMenuItemsChange }: MenuRolePermissionsProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    fetchData();
  }, []);

  // Notificar cuando cambia el rol seleccionado
  useEffect(() => {
    if (onRoleChange) {
      const roleInfo = roles.find(r => r.value === selectedRole);
      onRoleChange(selectedRole, roleInfo?.label || null);
    }
  }, [selectedRole, roles, onRoleChange]);

  // Notificar cuando cambian los items del menú
  useEffect(() => {
    if (onMenuItemsChange && menuItems.length > 0) {
      onMenuItemsChange(menuItems);
    }
  }, [menuItems, onMenuItemsChange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('hub_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [rolesRes, menuRes] = await Promise.all([
        axios.get<Role[]>(`${apiUrl}/api/menu/roles`, { headers }),
        axios.get<MenuItem[]>(`${apiUrl}/api/menu/admin`, { headers }),
      ]);

      setRoles(rolesRes.data);
      setMenuItems(menuRes.data);

      // Select first role by default
      if (rolesRes.data.length > 0 && !selectedRole) {
        setSelectedRole(rolesRes.data[0].value);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (itemId: string, item: MenuItem, isParent: boolean = false, parentItem?: MenuItem) => {
    if (!selectedRole) return;

    console.log('🔄 Toggle permission:', { itemId, itemTitle: item.title, selectedRole, currentRoles: item.allowedRoles, isParent, hasParent: !!parentItem });

    setSaving(itemId);

    try {
      const token = localStorage.getItem('hub_token');
      const headers = { Authorization: `Bearer ${token}` };

      const currentRoles = item.allowedRoles || [];
      const hasRole = currentRoles.includes(selectedRole);

      let newRoles: string[];
      if (hasRole) {
        // Remove role
        newRoles = currentRoles.filter(r => r !== selectedRole);
      } else {
        // Add role
        newRoles = [...currentRoles, selectedRole];
      }

      console.log('📤 Sending update:', { itemId, newRoles });

      await axios.patch(
        `${apiUrl}/api/menu/${itemId}/roles`,
        { allowedRoles: newRoles },
        { headers }
      );

      // Update local state
      setMenuItems(prev => updateMenuItemRoles(prev, itemId, newRoles));

      // If it's a parent item being ACTIVATED, also activate all children
      if (isParent && !hasRole && item.children && item.children.length > 0) {
        console.log('🔄 Activating children...');
        for (const child of item.children) {
          if (!child.superuserOnly) {
            const childCurrentRoles = child.allowedRoles || [];
            if (!childCurrentRoles.includes(selectedRole)) {
              const childNewRoles = [...childCurrentRoles, selectedRole];
              await axios.patch(
                `${apiUrl}/api/menu/${child.id}/roles`,
                { allowedRoles: childNewRoles },
                { headers }
              );
              // Update local state for child
              setMenuItems(prev => updateMenuItemRoles(prev, child.id, childNewRoles));
            }
          }
        }
        console.log('✅ Children activated');
      }

      // If it's a parent item being DEACTIVATED, also deactivate all children
      if (isParent && hasRole && item.children && item.children.length > 0) {
        console.log('🔄 Deactivating children...');
        for (const child of item.children) {
          const childCurrentRoles = child.allowedRoles || [];
          if (childCurrentRoles.includes(selectedRole)) {
            const childNewRoles = childCurrentRoles.filter(r => r !== selectedRole);
            await axios.patch(
              `${apiUrl}/api/menu/${child.id}/roles`,
              { allowedRoles: childNewRoles },
              { headers }
            );
            // Update local state for child
            setMenuItems(prev => updateMenuItemRoles(prev, child.id, childNewRoles));
          }
        }
        console.log('✅ Children deactivated');
      }

      // If it's a child being ACTIVATED, also activate the parent (but not siblings)
      if (!isParent && !hasRole && parentItem) {
        const parentCurrentRoles = parentItem.allowedRoles || [];
        if (!parentCurrentRoles.includes(selectedRole)) {
          console.log('🔄 Activating parent...');
          const parentNewRoles = [...parentCurrentRoles, selectedRole];
          await axios.patch(
            `${apiUrl}/api/menu/${parentItem.id}/roles`,
            { allowedRoles: parentNewRoles },
            { headers }
          );
          // Update local state for parent
          setMenuItems(prev => updateMenuItemRoles(prev, parentItem.id, parentNewRoles));
          console.log('✅ Parent activated');
        }
      }

      onUpdate?.();
    } catch (error: any) {
      console.error('❌ Error updating permission:', error);
      console.error('Response:', error.response?.data);
      alert(`Error al actualizar permisos: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(null);
    }
  };

  const updateMenuItemRoles = (items: MenuItem[], itemId: string, newRoles: string[]): MenuItem[] => {
    return items.map(item => {
      if (item.id === itemId) {
        return { ...item, allowedRoles: newRoles };
      }
      if (item.children) {
        return { ...item, children: updateMenuItemRoles(item.children, itemId, newRoles) };
      }
      return item;
    });
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Check if the selected role is explicitly in the allowedRoles array
  const isRoleExplicitlyAllowed = (item: MenuItem): boolean => {
    if (!selectedRole) return false;
    if (!item.allowedRoles || item.allowedRoles.length === 0) return false;
    return item.allowedRoles.includes(selectedRole);
  };

  // Check if item has no restrictions (empty allowedRoles = everyone can see)
  const hasNoRestrictions = (item: MenuItem): boolean => {
    return !item.allowedRoles || item.allowedRoles.length === 0;
  };

  const getSelectedRoleInfo = () => {
    return roles.find(r => r.value === selectedRole);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Role Selector */}
      <div className="bg-gray-50 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Rol
        </label>
        <select
          value={selectedRole || ''}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {roles.map(role => (
            <option key={role.value} value={role.value}>
              {role.label} - {role.description}
            </option>
          ))}
        </select>

        {selectedRole && (
          <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>
              Configurando permisos para: <strong>{getSelectedRoleInfo()?.label}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Menu Items with Toggles */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-500 px-2">
          <span>Opción de menú</span>
          <span>Acceso</span>
        </div>

        {menuItems.map(section => {
          const isExpanded = expandedSections.has(section.id);
          const hasChildren = section.children && section.children.length > 0;
          const sectionAllowed = isRoleExplicitlyAllowed(section);
          const sectionNoRestrictions = hasNoRestrictions(section);

          return (
            <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Section Header */}
              <div
                className={clsx(
                  "flex items-center justify-between p-3",
                  !section.isActive && "opacity-50 bg-gray-50"
                )}
              >
                <div className="flex items-center space-x-3 flex-1">
                  {hasChildren && (
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <ChevronRight
                        className={clsx(
                          "w-4 h-4 transition-transform",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </button>
                  )}
                  {!hasChildren && <div className="w-6" />}

                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-medium text-gray-900">{section.title}</span>
                    {section.superuserOnly && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        Solo Superuser
                      </span>
                    )}
                    {!section.isActive && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        Inactivo
                      </span>
                    )}
                    {sectionNoRestrictions && !section.superuserOnly && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                        Solo Superuser
                      </span>
                    )}
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => togglePermission(section.id, section, true)}
                  disabled={saving === section.id || section.superuserOnly}
                  className={clsx(
                    "relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 flex-shrink-0 border border-gray-400",
                    section.superuserOnly
                      ? "bg-gray-200 cursor-not-allowed"
                      : "bg-gray-200 hover:bg-gray-300",
                    saving === section.id && "opacity-50"
                  )}
                >
                  {saving === section.id ? (
                    <Loader2 className="w-4 h-4 animate-spin absolute left-1/2 -translate-x-1/2 text-gray-500" />
                  ) : (
                    <span
                      className={clsx(
                        "inline-block h-5 w-5 transform rounded-full transition-all duration-200 shadow-sm",
                        section.superuserOnly
                          ? "bg-gray-400"
                          : sectionAllowed
                            ? "bg-green-500"
                            : "bg-red-400",
                        sectionAllowed ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  )}
                </button>
              </div>

              {/* Children */}
              {hasChildren && isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50">
                  {section.children!.map(child => {
                    const childAllowed = isRoleExplicitlyAllowed(child);
                    const childNoRestrictions = hasNoRestrictions(child);

                    return (
                      <div
                        key={child.id}
                        className={clsx(
                          "flex items-center justify-between p-3 pl-12 border-b border-gray-100 last:border-b-0",
                          !child.isActive && "opacity-50"
                        )}
                      >
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-gray-700">{child.title}</span>
                          {child.superuserOnly && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                              Solo Superuser
                            </span>
                          )}
                          {!child.isActive && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                              Inactivo
                            </span>
                          )}
                          {childNoRestrictions && !child.superuserOnly && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                              Solo Superuser
                            </span>
                          )}
                        </div>

                        {/* Toggle Switch */}
                        <button
                          onClick={() => togglePermission(child.id, child, false, section)}
                          disabled={saving === child.id || child.superuserOnly}
                          className={clsx(
                            "relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 flex-shrink-0 border border-gray-400",
                            child.superuserOnly
                              ? "bg-gray-200 cursor-not-allowed"
                              : "bg-gray-200 hover:bg-gray-300",
                            saving === child.id && "opacity-50"
                          )}
                        >
                          {saving === child.id ? (
                            <Loader2 className="w-4 h-4 animate-spin absolute left-1/2 -translate-x-1/2 text-gray-500" />
                          ) : (
                            <span
                              className={clsx(
                                "inline-block h-5 w-5 transform rounded-full transition-all duration-200 shadow-sm",
                                child.superuserOnly
                                  ? "bg-gray-400"
                                  : childAllowed
                                    ? "bg-green-500"
                                    : "bg-red-400",
                                childAllowed ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
        <div className="flex items-start space-x-2">
          <Shield className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-500" />
          <div>
            <p className="font-medium text-gray-900">Cómo funcionan los permisos:</p>
            <ul className="mt-2 space-y-1.5 text-gray-600">
              <li className="flex items-center space-x-2">
                <span className="inline-block w-4 h-4 rounded-full bg-green-500"></span>
                <span><strong>Verde:</strong> El rol tiene acceso a esta opción</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="inline-block w-4 h-4 rounded-full bg-red-400"></span>
                <span><strong>Rojo:</strong> El rol NO tiene acceso a esta opción</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="inline-block px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">Solo Superuser</span>
                <span>Sin roles asignados - solo superusuarios pueden verlo</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="inline-block px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Superuser Only</span>
                <span>Marcado explícitamente como solo para superusuarios</span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              Los usuarios con múltiples roles ven el merge de todas las opciones de sus roles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
