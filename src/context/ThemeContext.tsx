import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark' | 'oled';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceLight: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  border: string;
  error: string;
  success: string;
  cardShadow: string;
}

const colors: Record<ThemeType, ThemeColors> = {
  light: {
    background: '#F4F6F9',
    surface: '#FFFFFF',
    surfaceLight: '#F8F9FA',
    text: '#1C1E21',
    textMuted: '#606770',
    primary: '#006D32',
    primaryContainer: '#D1E7DD',
    secondary: '#0059BB',
    secondaryContainer: '#CFE2FF',
    border: '#E3E6EB',
    error: '#BA1A1A',
    success: '#198754',
    cardShadow: 'rgba(0, 0, 0, 0.05)',
  },
  dark: {
    background: '#0B1C30',
    surface: '#172B4D',
    surfaceLight: '#213145',
    text: '#F8F9FF',
    textMuted: '#A0B0C5',
    primary: '#00D166',
    primaryContainer: '#004A22',
    secondary: '#0070EA',
    secondaryContainer: '#002E62',
    border: '#2E3E56',
    error: '#FFB4AB',
    success: '#30E375',
    cardShadow: 'rgba(0, 0, 0, 0.2)',
  },
  oled: {
    background: '#000000',
    surface: '#121212',
    surfaceLight: '#1E1E1E',
    text: '#FFFFFF',
    textMuted: '#888888',
    primary: '#00D166',
    primaryContainer: '#003317',
    secondary: '#0070EA',
    secondaryContainer: '#00224A',
    border: '#222222',
    error: '#FFB4AB',
    success: '#30E375',
    cardShadow: 'rgba(0, 0, 0, 0.0)',
  },
};

interface ThemeContextProps {
  theme: ThemeType;
  colors: ThemeColors;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>('dark'); // Default to dark OS theme

  useEffect(() => {
    AsyncStorage.getItem('@LifeOS:theme').then(savedTheme => {
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'oled') {
        setThemeState(savedTheme);
      }
    });
  }, []);

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem('@LifeOS:theme', newTheme);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, colors: colors[theme], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
