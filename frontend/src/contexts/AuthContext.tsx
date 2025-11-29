'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Tenant {
  id: string;
  name: string;
  legalName: string;
  taxId: string;
}

export interface TenantMembership {
  id: string;
  tenantId: string;
  roles: string[];
  isActive: boolean;
  tenant: {
    id: string;
    name: string;
    taxId: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  superuser: boolean;
  createdAt: string;
  updatedAt: string;
  tenantMemberships?: TenantMembership[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  tenant: Tenant | null;
  isSuperuser: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchTenant: (tenantId: string) => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;
  const isSuperuser = user?.superuser === true;

  useEffect(() => {
    // Check if there's a saved token on mount
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('prohub_token');

      if (savedToken) {
        verifyToken(savedToken);
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(tokenToVerify);
        if (typeof window !== 'undefined') {
          localStorage.setItem('prohub_token', tokenToVerify);
        }
      } else {
        // Invalid or expired token
        if (typeof window !== 'undefined') {
          localStorage.removeItem('prohub_token');
        }
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('prohub_token');
      }
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();

      setUser(data.user);
      setToken(data.token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('prohub_token', data.token);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setTenant(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('prohub_token');
      localStorage.removeItem('prohub_tenant');
    }
  };

  const switchTenant = async (tenantId: string) => {
    try {
      console.log('🔄 [AuthContext] switchTenant called with:', tenantId);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/tenants/${tenantId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [AuthContext] Tenant data received:', data.tenant);
        setTenant(data.tenant);
        console.log('✅ [AuthContext] Tenant state updated to:', data.tenant.id, data.tenant.name);
        if (typeof window !== 'undefined') {
          localStorage.setItem('prohub_tenant', JSON.stringify(data.tenant));
        }
      } else {
        console.error('❌ [AuthContext] Error response from /api/tenants:', response.status);
      }
    } catch (error) {
      console.error('❌ [AuthContext] Error switching tenant:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        tenant,
        isSuperuser,
        login,
        logout,
        switchTenant,
        isLoading,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
