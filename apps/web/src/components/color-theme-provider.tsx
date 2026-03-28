"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"

const STORAGE_KEY = "cmms-color-theme"

type ColorTheme = "default" | "blue" | "green" | "orange" | "rose" | "violet"

interface ColorThemeContextValue {
    colorTheme: ColorTheme
    setColorTheme: (theme: ColorTheme) => void
}

const ColorThemeContext = createContext<ColorThemeContextValue>({
    colorTheme: "default",
    setColorTheme: () => {},
})

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
    const [colorTheme, setColorThemeState] = useState<ColorTheme>("default")
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as ColorTheme | null
        if (stored && ["default", "blue", "green", "orange", "rose", "violet"].includes(stored)) {
            setColorThemeState(stored)
            document.documentElement.setAttribute("data-theme", stored === "default" ? "" : stored)
        }
        setMounted(true)
    }, [])

    const setColorTheme = (theme: ColorTheme) => {
        setColorThemeState(theme)
        localStorage.setItem(STORAGE_KEY, theme)
        if (theme === "default") {
            document.documentElement.removeAttribute("data-theme")
        } else {
            document.documentElement.setAttribute("data-theme", theme)
        }
    }

    // Prevent flash of wrong theme
    if (!mounted) {
        return <>{children}</>
    }

    return (
        <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
            {children}
        </ColorThemeContext.Provider>
    )
}

export function useColorTheme() {
    return useContext(ColorThemeContext)
}
