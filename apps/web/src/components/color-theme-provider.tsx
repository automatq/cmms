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

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as ColorTheme | null
        if (stored && ["default", "blue", "green", "orange", "rose", "violet"].includes(stored)) {
            setColorThemeState(stored)
            document.documentElement.setAttribute("data-theme", stored === "default" ? "" : stored)
        }
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

    return (
        <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
            {children}
        </ColorThemeContext.Provider>
    )
}

export function useColorTheme() {
    return useContext(ColorThemeContext)
}
