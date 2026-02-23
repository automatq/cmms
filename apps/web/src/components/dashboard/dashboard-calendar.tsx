'use client'
import * as React from 'react'
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Wrench, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type CalendarEvent = {
    id: string
    title: string
    date: Date
    type: 'work_order' | 'pm' | 'downtime'
    status?: string
    priority?: string
    asset?: string
}

interface DashboardCalendarProps {
    events?: CalendarEvent[]
    onEventClick?: (event: CalendarEvent) => void
}

export function DashboardCalendar({ events = [], onEventClick }: DashboardCalendarProps) {
    const [currentDate, setCurrentDate] = React.useState(new Date())

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const goToToday = () => setCurrentDate(new Date())

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                    {format(currentDate, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={goToToday}>
                        Today
                    </Button>
                    <Button variant="outline" size="icon" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        )
    }

    const renderDays = () => {
        const days = []
        const startDate = startOfWeek(currentDate)
        for (let i = 0; i < 7; i++) {
            days.push(
                <div key={i} className="py-2 text-center text-sm font-medium text-muted-foreground border-b dark:border-border">
                    {format(addDays(startDate, i), 'EEE')}
                </div>
            )
        }
        return <div className="grid grid-cols-7 border-t border-l border-r rounded-t-lg bg-muted/30">{days}</div>
    }

    const renderCells = () => {
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(monthStart)
        const startDate = startOfWeek(monthStart)
        const endDate = endOfWeek(monthEnd)

        const rows = []
        let days = []
        let day = startDate
        let formattedDate = ''

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, 'd')
                const cloneDay = day

                // Filter events for this day
                const dayEvents = events.filter((e) => isSameDay(e.date, cloneDay))

                days.push(
                    <div
                        key={day.toISOString()}
                        className={cn(
                            "min-h-[120px] p-2 border-r border-b transition-colors focus-within:bg-accent/50 hover:bg-accent/30 flex flex-col gap-1 overflow-hidden",
                            !isSameMonth(day, monthStart) && "bg-muted/10 text-muted-foreground opacity-50",
                            isSameDay(day, new Date()) && "bg-primary/5"
                        )}
                        tabIndex={0}
                    >
                        <div className="flex justify-between items-center w-full">
                            <span className={cn(
                                "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                                isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : "text-foreground"
                            )}>
                                {formattedDate}
                            </span>
                            {dayEvents.length > 0 && (
                                <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm">
                                    {dayEvents.length}
                                </span>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1 mt-1 pr-1 custom-scrollbar">
                            {dayEvents.map((event) => (
                                <div
                                    key={event.id}
                                    onClick={() => onEventClick?.(event)}
                                    className={cn(
                                        "text-xs px-2 py-1 rounded-md truncate cursor-pointer transition-colors border group flex items-center gap-1.5",
                                        event.type === 'work_order' ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20" :
                                            event.type === 'pm' ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" :
                                                "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                                    )}
                                    title={`${event.title}${event.asset ? ` - ${event.asset}` : ''}`}
                                >
                                    {event.type === 'work_order' && <Wrench className="h-3 w-3 shrink-0 opacity-70" />}
                                    {event.type === 'pm' && <Clock className="h-3 w-3 shrink-0 opacity-70" />}
                                    {event.type === 'downtime' && <AlertTriangle className="h-3 w-3 shrink-0 opacity-70" />}
                                    <span className="truncate">{event.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
                day = addDays(day, 1)
            }
            rows.push(
                <div className="grid grid-cols-7" key={day.toISOString()}>
                    {days}
                </div>
            )
            days = []
        }
        return <div className="border-l bg-card rounded-b-lg overflow-hidden shadow-sm">{rows}</div>
    }

    return (
        <div className="w-full h-full flex flex-col">
            {renderHeader()}
            <div className="flex-1 flex flex-col">
                {renderDays()}
                {renderCells()}
            </div>
        </div>
    )
}
