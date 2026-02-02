"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    primaryColor: string;
    setTheme: (theme: Theme) => void;
    setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setThemeState] = useState<Theme>("dark");
    const [primaryColor, setPrimaryColorState] = useState("#6366f1"); // Default indigo-500-ish

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as Theme;
        const savedColor = localStorage.getItem("primary-color");
        
        if (savedTheme) setThemeState(savedTheme);
        if (savedColor) setPrimaryColorState(savedColor);
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        
        // Handle Theme
        if (theme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
        localStorage.setItem("theme", theme);

        // Handle Primary Color
        root.style.setProperty("--primary", primaryColor);
        // Generate a slightly darker/lighter version for hover if needed, or just use opacity
        // For now, let's keep it simple
        localStorage.setItem("primary-color", primaryColor);
    }, [theme, primaryColor]);

    const setTheme = (t: Theme) => setThemeState(t);
    const setPrimaryColor = (c: string) => setPrimaryColorState(c);

    return (
        <ThemeContext.Provider value={{ theme, primaryColor, setTheme, setPrimaryColor }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
