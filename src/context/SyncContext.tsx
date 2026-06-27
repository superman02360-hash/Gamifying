import React, { createContext, useContext, useState, useEffect } from 'react';
import { database, isSupabaseSyncEnabled, setSupabaseSyncEnabled } from '../db/database';

interface SyncContextProps {
  isSyncEnabled: boolean;
  isSyncing: boolean;
  lastSynced: string | null;
  toggleSync: (enabled: boolean) => Promise<void>;
  triggerSync: () => Promise<{ success: boolean; message: string }>;
}

const SyncContext = createContext<SyncContextProps | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSyncEnabled, setIsSyncEnabledState] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  useEffect(() => {
    // Check initial settings
    isSupabaseSyncEnabled().then(enabled => {
      setIsSyncEnabledState(enabled);
      if (enabled) {
        // Auto sync on mount if enabled
        handleSync();
      }
    });
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    const result = await database.syncAllData();
    setIsSyncing(false);
    if (result.success) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSynced(now);
    }
    return result;
  };

  const toggleSync = async (enabled: boolean) => {
    setIsSyncEnabledState(enabled);
    await setSupabaseSyncEnabled(enabled);
    if (enabled) {
      await handleSync();
    }
  };

  const triggerSync = async () => {
    return handleSync();
  };

  return (
    <SyncContext.Provider value={{ isSyncEnabled, isSyncing, lastSynced, toggleSync, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
