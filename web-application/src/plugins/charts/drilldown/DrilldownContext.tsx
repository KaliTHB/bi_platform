'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface DrilldownState {
  currentLevel: number;
  breadcrumbs: Array<{
    name: string;
    data: any;
    level: number;
  }>;
  history: Array<{
    level: number;
    data: any;
    timestamp: number;
  }>;
}

type DrilldownAction = 
  | { type: 'DRILL_DOWN'; payload: { name: string; data: any } }
  | { type: 'DRILL_UP'; payload: { targetLevel: number } }
  | { type: 'RESET' }
  | { type: 'GO_TO_LEVEL'; payload: { level: number } };

const initialState: DrilldownState = {
  currentLevel: 0,
  breadcrumbs: [],
  history: []
};

function drilldownReducer(state: DrilldownState, action: DrilldownAction): DrilldownState {
  switch (action.type) {
    case 'DRILL_DOWN':
      return {
        ...state,
        currentLevel: state.currentLevel + 1,
        breadcrumbs: [...state.breadcrumbs, {
          name: action.payload.name,
          data: action.payload.data,
          level: state.currentLevel + 1
        }],
        history: [...state.history, {
          level: state.currentLevel + 1,
          data: action.payload.data,
          timestamp: Date.now()
        }]
      };

    case 'DRILL_UP':
      const targetLevel = action.payload.targetLevel;
      return {
        ...state,
        currentLevel: targetLevel,
        breadcrumbs: state.breadcrumbs.slice(0, targetLevel)
      };

    case 'GO_TO_LEVEL':
      return {
        ...state,
        currentLevel: action.payload.level,
        breadcrumbs: state.breadcrumbs.slice(0, action.payload.level)
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

interface DrilldownContextType {
  state: DrilldownState;
  drillDown: (name: string, data: any) => void;
  drillUp: (targetLevel: number) => void;
  goToLevel: (level: number) => void;
  reset: () => void;
  canDrillUp: boolean;
  canDrillDown: (data: any) => boolean;
}

const DrilldownContext = createContext<DrilldownContextType | undefined>(undefined);

export const useDrilldown = () => {
  const context = useContext(DrilldownContext);
  if (!context) {
    throw new Error('useDrilldown must be used within a DrilldownProvider');
  }
  return context;
};

interface DrilldownProviderProps {
  children: ReactNode;
  maxLevel?: number;
}

export const DrilldownProvider: React.FC<DrilldownProviderProps> = ({ 
  children, 
  maxLevel = 5 
}) => {
  const [state, dispatch] = useReducer(drilldownReducer, initialState);

  const drillDown = (name: string, data: any) => {
    if (state.currentLevel < maxLevel) {
      dispatch({ type: 'DRILL_DOWN', payload: { name, data } });
    }
  };

  const drillUp = (targetLevel: number) => {
    if (targetLevel >= 0 && targetLevel < state.currentLevel) {
      dispatch({ type: 'DRILL_UP', payload: { targetLevel } });
    }
  };

  const goToLevel = (level: number) => {
    if (level >= 0 && level <= maxLevel && level !== state.currentLevel) {
      dispatch({ type: 'GO_TO_LEVEL', payload: { level } });
    }
  };

  const reset = () => {
    dispatch({ type: 'RESET' });
  };

  const canDrillUp = state.currentLevel > 0;
  
  const canDrillDown = (data: any) => {
    return state.currentLevel < maxLevel && 
           data && 
           (Array.isArray(data.children) && data.children.length > 0);
  };

  return (
    <DrilldownContext.Provider value={{
      state,
      drillDown,
      drillUp,
      goToLevel,
      reset,
      canDrillUp,
      canDrillDown
    }}>
      {children}
    </DrilldownContext.Provider>
  );
};