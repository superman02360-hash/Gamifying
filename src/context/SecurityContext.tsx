import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SecurityContextProps {
  isLocked: boolean;
  hasPin: boolean;
  setPin: (pin: string | null) => Promise<void>;
  unlock: (pin: string) => boolean;
  lock: () => void;
}

const SecurityContext = createContext<SecurityContextProps | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [correctPin, setCorrectPin] = useState<string | null>(null);

  useEffect(() => {
    // Load PIN setting on mount
    AsyncStorage.getItem('@LifeOS:security_pin').then(savedPin => {
      if (savedPin) {
        setHasPin(true);
        setCorrectPin(savedPin);
        setIsLocked(true); // Lock on start if PIN exists
      }
    });

    // AppState change listener to lock app on backgrounding
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        AsyncStorage.getItem('@LifeOS:security_pin').then(savedPin => {
          if (savedPin) {
            setIsLocked(true);
          }
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const setPin = async (pin: string | null) => {
    if (pin) {
      setHasPin(true);
      setCorrectPin(pin);
      await AsyncStorage.setItem('@LifeOS:security_pin', pin);
    } else {
      setHasPin(false);
      setCorrectPin(null);
      setIsLocked(false);
      await AsyncStorage.removeItem('@LifeOS:security_pin');
    }
  };

  const unlock = (pin: string): boolean => {
    if (pin === correctPin) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const lock = () => {
    if (hasPin) {
      setIsLocked(true);
    }
  };

  return (
    <SecurityContext.Provider value={{ isLocked, hasPin, setPin, unlock, lock }}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};
