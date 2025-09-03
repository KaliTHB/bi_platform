// web-application/src/contexts/AuthContext.tsx
import React, { createContext, useContext } from 'react';

interface AuthContextType {
  // Add auth context types here as needed
  // For now, we're using Redux for auth state management
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth logic is handled by Redux, this is just a placeholder context
  // You can add additional auth-related functionality here if needed
  return (
    <AuthContext.Provider value={{}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};