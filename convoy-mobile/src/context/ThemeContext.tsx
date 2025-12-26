import React, { createContext, useState, useContext, useEffect } from "react";
import { useColorScheme } from "react-native";
import { MD3LightTheme, MD3DarkTheme, PaperProvider, adaptNavigationTheme } from "react-native-paper";
import { ThemeProvider as NavThemeProvider, DarkTheme as NavDarkTheme, DefaultTheme as NavDefaultTheme } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define Custom Light Theme (White/Orange like image)
const CustomLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#F97316", // Strava Orange
    background: "#FFFFFF",
    surface: "#F8F9FA",
    onSurface: "#1E293B",
    card: "#FFFFFF",
    text: "#1E293B"
  }
};

// Define Custom Dark Theme
const CustomDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#F97316",
    background: "#020617",
    surface: "#0F172A",
    onSurface: "#F8F9FA",
    card: "#1E293B",
    text: "#F8F9FA"
  }
};

const ThemeContext = createContext({ isDark: false, toggleTheme: () => {} });

export const useAppTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');

  // Load saved preference
  useEffect(() => {
    AsyncStorage.getItem('theme').then(val => {
      if (val) setIsDark(val === 'dark');
    });
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
       const newVal = !prev;
       AsyncStorage.setItem('theme', newVal ? 'dark' : 'light');
       return newVal;
    });
  };

  const theme = isDark ? CustomDarkTheme : CustomLightTheme;
  const navTheme = isDark ? NavDarkTheme : NavDefaultTheme;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <PaperProvider theme={theme}>
        <NavThemeProvider value={navTheme}>
           {children}
        </NavThemeProvider>
      </PaperProvider>
    </ThemeContext.Provider>
  );
}
