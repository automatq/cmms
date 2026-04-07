'use client'

import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Bell, CheckCircle2, AlertTriangle, Info, Clock } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, formatTimeAgo } from '@/lib/utils'
import { SearchAutocomplete } from '@/components/search-autocomplete'

export function Header() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.getNotifications(10)
      return res.data
    },
    enabled: !!user,
    // Fallback polling (WebSocket is primary via SocketProvider)
    refetchInterval: 300000,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Provide a safe fallback if data is undefined or not an array
  const notifications = Array.isArray(notificationsData?.data) ? notificationsData.data : []
  const unreadCount = notifications.filter((n: any) => !n.isRead).length

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert':
      case 'emergency':
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'reminder':
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-background border-b shadow-sm">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Search */}
        <div className="flex-1 max-w-md hidden md:block">
          <SearchAutocomplete />
        </div>

        {/* Spacer for mobile */}
        <div className="flex-1 md:hidden"></div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:bg-muted/80 transition-colors">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-destructive border-2 border-background rounded-full animate-in zoom-in" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-lg border-muted">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <h4 className="font-semibold text-sm">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <ScrollArea className="h-[400px] max-h-[80vh]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                    <Bell className="h-8 w-8 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {notifications.map((notification: any) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                          !notification.isRead && "bg-primary/5"
                        )}
                      >
                        <div className="mt-1 shrink-0">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className={cn(
                            "text-sm font-medium leading-none",
                            !notification.isRead ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/80 mt-1">
                            {formatTimeAgo(new Date(notification.createdAt))}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="shrink-0 flex items-start">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary"
                              onClick={() => markReadMutation.mutate(notification.id)}
                              title="Mark as read"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="p-2 border-t bg-muted/20 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={async () => {
                    await api.markAllNotificationsRead()
                    queryClient.invalidateQueries({ queryKey: ['notifications'] })
                  }}
                >
                  Mark all as read
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  )
}
