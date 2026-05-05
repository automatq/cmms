'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/providers/auth-provider'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
})

export function useSocket() {
  return useContext(SocketContext)
}

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000'

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setIsConnected(false)
      }
      return
    }

    if (socketRef.current) return

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('maintek_auth_token') : null
    if (!token) return

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 5000,
    })

    socket.on('connect', () => {
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    // Real-time notification
    socket.on('notification:new', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast(data.title, {
        description: data.message,
        duration: 5000,
      })
    })

    // Activity events
    socket.on('activity:started', () => {
      queryClient.invalidateQueries({ queryKey: ['active-activities'] })
    })

    socket.on('activity:completed', () => {
      queryClient.invalidateQueries({ queryKey: ['active-activities'] })
    })

    // Work order status changes
    socket.on('wo:status-changed', () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}
