import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { importApi, runsApi } from '../api/client';

interface AppStateContextType {
  isSampleMode: boolean;
  setSampleMode: (val: boolean) => void;
  currentRunId: string | null;
  setCurrentRunId: (id: string | null) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isSampleMode, setSampleMode] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);

  const loadSampleData = async () => {
    try {
      // Trigger a deterministic run for sample data
      const run = await runsApi.create({ seed: "SAMPLE_SEED_2026" });
      setCurrentRunId(run.id);
      setSampleMode(true);
      
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    } catch (e) {
      console.error("Failed to load sample data", e);
    }
  };

  useEffect(() => {
    loadSampleData();
  }, []);

  return (
    <AppStateContext.Provider value={{ isSampleMode, setSampleMode, currentRunId, setCurrentRunId }}>
      {children}
    </AppStateContext.Provider>
  );
}

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within AppStateProvider');
  return context;
};
