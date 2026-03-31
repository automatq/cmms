import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { AuthProvider } from '@/providers/auth-provider'
import { QueryProvider } from '@/providers/query-provider'
import { SocketProvider } from '@/providers/socket-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { ColorThemeProvider } from '@/components/color-theme-provider'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/error-boundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Nexly - Maintenance Management',
  description: 'Nexly — intelligent maintenance management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ClerkProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ColorThemeProvider>
              <ErrorBoundary>
                <QueryProvider>
                  <AuthProvider>
                    <SocketProvider>{children}</SocketProvider>
                  </AuthProvider>
                </QueryProvider>
              </ErrorBoundary>
            </ColorThemeProvider>
            <Toaster richColors closeButton position="top-right" />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
