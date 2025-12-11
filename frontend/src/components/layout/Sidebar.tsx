'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
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
  Brain,
  ArrowLeft,
  ShoppingCart,
  ClipboardList,
  PackageCheck,
  LayoutDashboard,
  Network,
  FileSearch,
  ClipboardCheck,
  Bell
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { useSidebar } from '@/contexts/SidebarContext';
import { TenantSelector } from '@/components/TenantSelector';
import { useMenu } from '@/hooks/useMenu';
import { AlertTriangle, Mail } from 'lucide-react';

interface SidebarProps {
  children: React.ReactNode;
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
  Brain,
  ShoppingCart,
  ClipboardList,
  PackageCheck,
  LayoutDashboard,
  Menu,
  Network,
  FileSearch,
  ClipboardCheck,
  Bell,
  AlertTriangle,
  Mail
};

// Helper para obtener el componente de ícono desde el nombre
const getIconComponent = (iconName: string): React.ComponentType<{ className?: string }> => {
  return IconMap[iconName] || FileText; // FileText como fallback
};

interface SubMenuItem {
  name: string;
  href: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MenuSection {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  href?: string; // Para secciones que tienen página propia
  children?: SubMenuItem[];
}

// Nota: El menú hardcodeado fue reemplazado por la carga dinámica desde la API
// usando el hook useMenu(). El menú se configura ahora desde la base de datos.

export function Sidebar({ children }: SidebarProps) {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const [coreReturnUrl, setCoreReturnUrl] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isProvider, logout } = useAuth();
  const { menuItems, loading: menuLoading } = useMenu();

  // Verificar si el usuario tiene membresías a algún tenant
  const hasNoMemberships = user && (!user.tenantMemberships || user.tenantMemberships.length === 0);

  // Detectar si viene desde Core
  useEffect(() => {
    const returnUrl = localStorage.getItem('coreReturnUrl');
    if (returnUrl) {
      setCoreReturnUrl(returnUrl);
    }
  }, []);

  // Determinar si el usuario es superusuario
  const isSuperuser = user?.superuser === true;

  // Transformar los datos de la API al formato del componente
  const dynamicMenuSections = useMemo(() => {
    if (!menuItems || menuItems.length === 0) {
      return [];
    }

    // Si es proveedor, solo mostrar "Portal Proveedor"
    const filteredItems = isProvider
      ? menuItems.filter(item => item.title === 'Portal Proveedor')
      : menuItems;

    return filteredItems.map(item => ({
      name: item.title,
      icon: getIconComponent(item.icon),
      description: item.description || undefined,
      href: item.url || undefined,
      children: item.children?.map(child => ({
        name: child.title,
        href: child.url || '#',
        description: child.description || undefined,
        icon: getIconComponent(child.icon)
      }))
    }));
  }, [menuItems, isProvider]);

  // Sincronizar foco con la ruta actual y manejar secciones expandidas
  useEffect(() => {
    const currentUrl = window.location.pathname + window.location.search;

    // Siempre sincronizar con la ruta actual
    setFocusedPath(currentUrl);

    // Buscar si la ruta actual corresponde a un elemento de menú y expandir su sección
    let shouldExpandSection = null;

    for (const section of dynamicMenuSections) {
      if (section.children) {
        for (const child of section.children) {
          if (child.href !== '#' && (currentUrl === child.href || pathname === child.href)) {
            shouldExpandSection = section.name;
            break;
          }
        }
        if (shouldExpandSection) break;
      }
    }

    // Expandir la sección que contiene la ruta actual
    if (shouldExpandSection) {
      setExpandedSection(shouldExpandSection);
    }

    // Si es proveedor, expandir automáticamente "Portal Proveedor"
    if (isProvider && !shouldExpandSection) {
      const portalSection = dynamicMenuSections.find(s => s.name === 'Portal Proveedor');
      if (portalSection) {
        setExpandedSection('Portal Proveedor');
      }
    }
  }, [pathname, dynamicMenuSections, isProvider]);

  const handleSectionClick = useCallback((sectionName: string, sectionHref?: string) => {
    console.log('🖱️ Sidebar click:', { sectionName, sectionHref, isCollapsed, expandedSection });

    // Si es una sección con href directo, navegar inmediatamente
    if (sectionHref && sectionHref !== '#') {
      console.log('🚀 Navegando a:', sectionHref);
      setFocusedPath(sectionHref);
      // Colapsar cualquier sección expandida ya que esta es de nivel 1
      setExpandedSection(null);
      router.push(sectionHref);
    } else {
      // Es una sección sin href o con href='#', manejar expansión/contracción
      console.log('📂 Manejando expansión/contracción de sección');
      if (expandedSection === sectionName) {
        // Si ya está expandida, colapsar
        console.log('📫 Colapsando sección:', sectionName);
        setExpandedSection(null);
      } else {
        // Si no está expandida, expandir
        console.log('📂 Expandiendo sección:', sectionName);
        setExpandedSection(sectionName);
      }
    }
  }, [expandedSection, router, isCollapsed]);

  // Helper function to check if a href matches the current URL (considering query params)
  const isUrlMatch = useCallback((href: string) => {
    if (href === '#') return false;

    const currentFullUrl = window.location.pathname + window.location.search;
    const currentPath = window.location.pathname;

    // Exact match with full URL (for routes with query params)
    if (currentFullUrl === href) return true;

    // Exact match with pathname only (for routes without query params)
    if (currentPath === href) return true;

    // Prefix match (for nested routes)
    if (currentPath.startsWith(href + '/')) return true;

    return false;
  }, []);

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar overflow-hidden">
      {/* Header */}
      <div className="flex h-16 items-center justify-center px-4 border-b border-sidebar-hover relative flex-shrink-0">
        {/* Logo y título cuando está expandido */}
        <div
          className={clsx(
            "flex items-center space-x-3 transition-opacity duration-200 absolute left-4",
            isCollapsed && "opacity-0 pointer-events-none"
          )}
        >
          <div className="w-8 h-8 bg-palette-yellow rounded-lg flex items-center justify-center">
            <Network className="w-5 h-5 text-palette-dark" />
          </div>
          <h1 className="text-text-white font-semibold text-lg">Hub</h1>
        </div>

        {/* Solo logo cuando está colapsado */}
        <div
          className={clsx(
            "transition-opacity duration-200",
            !isCollapsed && "opacity-0 pointer-events-none"
          )}
        >
          <div className="w-8 h-8 bg-palette-yellow rounded-lg flex items-center justify-center">
            <Network className="w-5 h-5 text-palette-dark" />
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={clsx(
            "text-text-white hover:bg-sidebar-hover hidden lg:flex flex-shrink-0 transition-all duration-200",
            isCollapsed ? "absolute" : "absolute right-4"
          )}
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Botón Volver a Core */}
      {coreReturnUrl && !isCollapsed && (
        <div className="px-4 py-3 border-b border-sidebar-hover">
          <button
            onClick={() => {
              localStorage.removeItem('coreReturnUrl');
              window.location.href = coreReturnUrl;
            }}
            className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-text-white hover:bg-sidebar-hover rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Core</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className={clsx(
        "flex-1 py-2 space-y-1 overflow-y-auto scrollbar-thin min-h-0",
        isCollapsed ? "px-2" : "px-4"
      )}>
        {hasNoMemberships ? (
          <div className={clsx(
            "flex flex-col items-center justify-center py-8 px-4 text-center",
            isCollapsed && "px-2"
          )}>
            <AlertTriangle className="w-12 h-12 text-yellow-400 mb-4" />
            {!isCollapsed && (
              <>
                <h3 className="text-text-white font-semibold text-base mb-2">
                  Sin acceso configurado
                </h3>
                <p className="text-text-white/70 text-sm mb-4">
                  Tu cuenta aún no tiene acceso a ninguna organización.
                </p>
                <p className="text-text-white/70 text-sm mb-6">
                  Por favor, contacta al administrador del sistema para solicitar acceso.
                </p>
                <a
                  href="mailto:soporte@axioma.com?subject=Solicitud de acceso a Hub&body=Hola, solicito acceso al sistema Hub. Mi email es: "
                  className="flex items-center space-x-2 bg-palette-yellow text-palette-dark px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-400 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>Contactar soporte</span>
                </a>
              </>
            )}
          </div>
        ) : menuLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-text-white text-sm">Cargando menú...</div>
          </div>
        ) : dynamicMenuSections.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-text-white text-sm">No hay opciones de menú disponibles</div>
          </div>
        ) : (
          <>
            {dynamicMenuSections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSection === section.name;
          const hasChildren = section.children && section.children.length > 0;

          // Determinar si esta sección debe tener el foco
          const isActive = section.href ?
            focusedPath === section.href :
            focusedPath === `section-${section.name}`;

          return (
            <div key={section.name} className="space-y-1">
              {/* Sección principal */}
              {section.href ? (
                // Sección con enlace directo
                <button
                  onClick={(e) => {
                    console.log('🖱️ Button click detectado:', { sectionName: section.name, isCollapsed, href: section.href });

                    setIsMobileOpen(false);
                    if (isCollapsed) {
                      // When collapsed, expand sidebar first, then navigate immediately
                      console.log('🔄 Expandiendo sidebar primero');
                      setIsCollapsed(false);
                    }
                    // Always navigate regardless of collapsed state
                    handleSectionClick(section.name, section.href);
                  }}
                  className={clsx(
                    'flex items-center text-text-white rounded-lg cursor-pointer select-none w-full pointer-events-auto relative',
                    isActive && 'bg-sidebar-active',
                    isCollapsed ? 'justify-center h-12 p-2' : 'px-4 py-3'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className={clsx(
                      'truncate whitespace-nowrap font-medium',
                      isCollapsed && 'opacity-0 pointer-events-none w-0 overflow-hidden'
                    )}>
                      {section.name}
                    </span>
                  </div>
                </button>
              ) : (
                // Sección con hijos - botón para expandir/contraer
                <button
                  onClick={(e) => {
                    console.log('🖱️ Section button click:', { sectionName: section.name, isCollapsed, hasChildren: section.children?.length });

                    if (isCollapsed) {
                      // When collapsed, expand sidebar first
                      console.log('🔄 Expandiendo sidebar desde sección con hijos');
                      setIsCollapsed(false);
                      // Then expand this section if it has children
                      if (hasChildren) {
                        setExpandedSection(section.name);
                      } else if (section.href && section.href !== '#') {
                        // If no children but has href, navigate
                        handleSectionClick(section.name, section.href);
                      }
                    } else {
                      // When expanded, handle normal expand/collapse or navigation
                      handleSectionClick(section.name, section.href);
                    }
                  }}
                  className={clsx(
                    'flex items-center text-text-white rounded-lg cursor-pointer select-none w-full pointer-events-auto relative',
                    isActive && 'bg-sidebar-active',
                    isCollapsed ? 'justify-center h-12 p-2' : 'justify-between px-4 py-3'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className={clsx(
                      'truncate whitespace-nowrap font-medium',
                      isCollapsed && 'opacity-0 pointer-events-none w-0 overflow-hidden'
                    )}>
                      {section.name}
                    </span>
                  </div>
                  {!isCollapsed && hasChildren && (
                    <div className="flex-shrink-0">
                      <ChevronRight className={clsx(
                        "w-4 h-4 transition-transform duration-300 ease-in-out",
                        isExpanded && "rotate-90"
                      )} />
                    </div>
                  )}
                </button>
              )}

              {/* Elementos hijos */}
              {!isCollapsed && hasChildren && (
                <div className={clsx(
                  "ml-8 space-y-1 overflow-hidden transition-all duration-300 ease-in-out",
                  isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                )}>
                  {section.children!.map((child) => {
                    const isChildActive = focusedPath === child.href;
                    const ChildIcon = child.icon;

                    return (
                      <button
                        key={child.name}
                        onClick={(e) => {
                          console.log('🖱️ Child button click:', { childName: child.name, href: child.href });

                          if (child.href !== '#') {
                            setIsMobileOpen(false);
                                    setFocusedPath(child.href);
                            setExpandedSection(section.name); // Mantener expandida la sección actual
                            router.push(child.href);
                          }
                        }}
                        className={clsx(
                          'flex items-center text-text-white rounded-lg cursor-pointer select-none px-4 py-2 w-full pointer-events-auto relative',
                          isChildActive && 'bg-sidebar-active',
                          child.href === '#' && 'opacity-60 cursor-not-allowed'
                        )}
                        disabled={child.href === '#'}
                      >
                        <div className="flex items-center space-x-3">
                          <ChildIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm truncate whitespace-nowrap">
                            {child.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
          </>
        )}
      </nav>

    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className={clsx(
        'hidden lg:flex flex-col transition-all duration-300 ease-in-out flex-shrink-0',
        isCollapsed ? 'w-20' : 'w-64'
      )}>
        {/* Logo Section - Outside of SidebarContent to prevent re-renders */}
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-sidebar py-0 hover:opacity-80 transition-opacity cursor-pointer w-full"
          title="Ir a Hub"
        >
          <div className="relative h-16 w-full flex items-center justify-center">
            <img
              src="/axioma_logo_invertido.png"
              alt="Axioma Logo"
              className="h-full w-auto object-contain p-3"
            />
          </div>
        </button>
        <div className="bg-sidebar border-b border-sidebar-hover" />
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-sidebar flex flex-col">
            {/* Logo Section for mobile */}
            <button
              onClick={() => {
                router.push('/dashboard');
                setIsMobileOpen(false);
              }}
              className="bg-sidebar py-2 hover:opacity-80 transition-opacity cursor-pointer w-full"
              title="Ir a Hub"
            >
              <div className="relative h-12 w-full flex items-center justify-center">
                <img
                  src="/axioma_logo_invertido.png"
                  alt="Axioma Logo"
                  className="h-full w-auto object-contain p-2"
                />
              </div>
            </button>
            <div className="bg-sidebar border-b border-sidebar-hover" />
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Barra superior con Tenant Selector e iconos de usuario */}
        <TenantSelector />

        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-white">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center space-x-3"
            title="Ir a Hub"
          >
            <div className="w-8 h-8 bg-palette-yellow rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-palette-dark" />
            </div>
            <h1 className="text-text-primary font-semibold text-lg">Hub</h1>
          </button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
          {hasNoMemberships ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
              <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  Cuenta sin acceso configurado
                </h2>
                <p className="text-gray-600 mb-4">
                  Tu cuenta <span className="font-medium">{user?.email}</span> aún no tiene acceso a ninguna organización en el sistema.
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  Por favor, contacta al administrador del sistema para que te asigne acceso a una organización.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href={`mailto:soporte@axioma.com?subject=Solicitud de acceso a Hub&body=Hola, solicito acceso al sistema Hub.%0D%0A%0D%0AMi email es: ${user?.email}%0D%0ANombre: ${user?.name}`}
                    className="inline-flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Contactar soporte</span>
                  </a>
                  <button
                    onClick={logout}
                    className="inline-flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}