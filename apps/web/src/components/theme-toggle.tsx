"use client"

import * as React from "react"
import { Moon, Sun, Palette, Check } from "lucide-react"
import { useTheme } from "next-themes"
import { useColorTheme } from "@/components/color-theme-provider"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const colorThemes = [
    { value: "default" as const, label: "Neutral", color: "#171717" },
    { value: "blue" as const, label: "Blue", color: "#2563eb" },
    { value: "green" as const, label: "Green", color: "#16a34a" },
    { value: "orange" as const, label: "Orange", color: "#ea580c" },
    { value: "rose" as const, label: "Rose", color: "#e11d48" },
    { value: "violet" as const, label: "Violet", color: "#7c3aed" },
]

export function ThemeToggle() {
    const { setTheme, theme } = useTheme()
    const { colorTheme, setColorTheme } = useColorTheme()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative h-9 w-9">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                    Mode
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
                    <Sun className="h-4 w-4" />
                    Light
                    {theme === "light" && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
                    <Moon className="h-4 w-4" />
                    Dark
                    {theme === "dark" && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
                    <Palette className="h-4 w-4" />
                    System
                    {theme === "system" && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                    Color
                </DropdownMenuLabel>
                {colorThemes.map((ct) => (
                    <DropdownMenuItem
                        key={ct.value}
                        onClick={() => setColorTheme(ct.value)}
                        className="gap-2"
                    >
                        <span
                            className={cn(
                                "h-4 w-4 rounded-full border shrink-0",
                                colorTheme === ct.value && "ring-2 ring-ring ring-offset-1 ring-offset-background"
                            )}
                            style={{ backgroundColor: ct.color }}
                        />
                        {ct.label}
                        {colorTheme === ct.value && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
