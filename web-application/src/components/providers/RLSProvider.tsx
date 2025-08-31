// File: web-application/src/components/providers/RLSProvider.tsx

import React, { createContext, useContext, ReactNode } from 'react';
import { useRLS, UseRLSResult } from '../../hooks/useRLS';

// ============================================================================
// Context Creation
// ============================================================================

// Create the context object
const RLSContext = createContext<UseRLSResult | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

interface RLSProviderProps {
  children: ReactNode;
}

export const RLSProvider: React.FC<RLSProviderProps> = ({ children }) => {
  const rlsData = useRLS();
  
  return (
    <RLSContext.Provider value={rlsData}>
      {children}
    </RLSContext.Provider>
  );
};

// ============================================================================
// Context Hook
// ============================================================================

// Hook to use RLS context from provider
export const useRLSContext = (): UseRLSResult => {
  const context = useContext(RLSContext);
  if (!context) {
    throw new Error('useRLSContext must be used within an RLSProvider');
  }
  return context;
};

export default RLSProvider;