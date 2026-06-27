import React from 'react';
import { ThemeProvider } from './src/context/ThemeContext';
import { SecurityProvider } from './src/context/SecurityContext';
import { SyncProvider } from './src/context/SyncContext';
import AppShell from './src/AppShell';

export default function App() {
  return (
    <ThemeProvider>
      <SecurityProvider>
        <SyncProvider>
          <AppShell />
        </SyncProvider>
      </SecurityProvider>
    </ThemeProvider>
  );
}
