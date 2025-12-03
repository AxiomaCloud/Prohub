import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { ConfirmProvider } from '@/hooks/useConfirm'
import { ChatWidgetWrapper } from '@/components/chat/ChatWidgetWrapper'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Axioma - Hub',
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
              <ChatWidgetWrapper />
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    zIndex: 99999,
                  },
                }}
              />
            </ConfirmProvider>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
