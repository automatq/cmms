import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ReactNode } from "react"

interface ChartCardProps {
    title: string
    description?: string
    children: ReactNode
    className?: string
    headerAction?: ReactNode
}

export function ChartCard({ title, description, children, className, headerAction }: ChartCardProps) {
    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold">{title}</CardTitle>
                    {description && <CardDescription>{description}</CardDescription>}
                </div>
                {headerAction}
            </CardHeader>
            <CardContent className="px-2">
                {children}
            </CardContent>
        </Card>
    )
}
