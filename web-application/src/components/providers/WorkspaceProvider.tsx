
// web-application/src/components/providers/WorkspaceProvider.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface WorkspaceContextType {
  currentWorkspace: any;
  workspaces: any[];
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const workspace = useSelector((state: RootState) => state.workspace);

  const value: WorkspaceContextType = {
    currentWorkspace: workspace.current,
    workspaces: workspace.available,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

// web-application/src/components/providers/NotificationProvider.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface Notification {
  id: string;
  message: string;
  severity: AlertColor;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (message: string, severity?: AlertColor, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = (message: string, severity: AlertColor = 'info', duration: number = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotification({ id, message, severity, duration });
  };

  const handleClose = () => {
    setNotification(null);
  };

  const value: NotificationContextType = {
    showNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notification && (
        <Snackbar
          open={Boolean(notification)}
          autoHideDuration={notification.duration}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={handleClose} severity={notification.severity} variant="filled">
            {notification.message}
          </Alert>
        </Snackbar>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};