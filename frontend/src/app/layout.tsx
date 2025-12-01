import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { ConfirmProvider } from '@/hooks/useConfirm'

export const metadata: Metadata = {
  title: 'Hub - Portal de Proveedores AXIOMA',
  description: 'Portal de proveedores con IA para gestión de documentos, facturas y pagos',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <SidebarProvider>
            <ConfirmProvider>
              {children}
            </ConfirmProvider>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
