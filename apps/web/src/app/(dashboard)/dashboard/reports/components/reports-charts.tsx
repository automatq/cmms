"use client"

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import { useChartTheme } from "@/hooks/use-chart-theme"

interface ChartData {
    label: string
    value: number
    category?: string
}

/**
 * When a chart accepts an `onSegmentClick` prop the segment becomes
 * interactive — clicking emits the clicked datum so a parent page can
 * open a drill-down panel showing the underlying records.
 */
interface InteractiveChartProps {
    data: ChartData[]
    onSegmentClick?: (datum: ChartData) => void
}

function useTooltipStyles() {
    const t = useChartTheme()
    return {
        contentStyle: {
            backgroundColor: t.tooltipBg,
            borderRadius: "8px",
            border: `1px solid ${t.tooltipBorder}`,
            color: t.tooltipText,
        },
        labelStyle: { color: t.tooltipText },
        itemStyle: { color: t.tooltipText },
    }
}

export function OverviewBarChart({ data, onSegmentClick }: InteractiveChartProps) {
    const theme = useChartTheme()
    const tooltip = useTooltipStyles()
    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
                <XAxis dataKey="label" stroke={theme.axis} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                    stroke={theme.axis}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => `${value}`}
                />
                <Tooltip {...tooltip} cursor={{ fill: theme.cursor, opacity: 0.5 }} />
                <Bar
                    dataKey="value"
                    fill={theme.colors[0]}
                    radius={[4, 4, 0, 0]}
                    cursor={onSegmentClick ? "pointer" : undefined}
                    onClick={onSegmentClick ? (d: ChartData) => onSegmentClick(d) : undefined}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}

export function OverviewLineChart({ data }: InteractiveChartProps) {
    const theme = useChartTheme()
    const tooltip = useTooltipStyles()
    return (
        <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
                <XAxis dataKey="label" stroke={theme.axis} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                    stroke={theme.axis}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => `${value}`}
                />
                <Tooltip {...tooltip} />
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={theme.colors[0]}
                    strokeWidth={2}
                    dot={{ fill: theme.colors[0] }}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>
    )
}

export function OverviewPieChart({ data, onSegmentClick }: InteractiveChartProps) {
    const theme = useChartTheme()
    const tooltip = useTooltipStyles()
    return (
        <ResponsiveContainer width="100%" height={350}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="label"
                    label
                    cursor={onSegmentClick ? "pointer" : undefined}
                    onClick={onSegmentClick ? (d: ChartData) => onSegmentClick(d) : undefined}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={theme.colors[index % theme.colors.length]} />
                    ))}
                </Pie>
                <Tooltip {...tooltip} />
                <Legend verticalAlign="bottom" height={36} />
            </PieChart>
        </ResponsiveContainer>
    )
}

export function StackedBarChart({ data }: InteractiveChartProps) {
    const theme = useChartTheme()
    const tooltip = useTooltipStyles()
    // Group by label and category
    const categories = Array.from(new Set(data.map(d => d.category).filter(Boolean))) as string[]
    const chartData = data.reduce((acc: any[], curr) => {
        const existing = acc.find(a => a.label === curr.label)
        if (existing) {
            if (curr.category) existing[curr.category] = curr.value
        } else {
            const newItem: any = { label: curr.label }
            if (curr.category) newItem[curr.category] = curr.value
            acc.push(newItem)
        }
        return acc
    }, [])

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
                <XAxis dataKey="label" stroke={theme.axis} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={theme.axis} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip {...tooltip} cursor={{ fill: theme.cursor, opacity: 0.5 }} />
                <Legend />
                {categories.map((cat, index) => (
                    <Bar key={cat} dataKey={cat} stackId="a" fill={theme.colors[index % theme.colors.length]} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    )
}
