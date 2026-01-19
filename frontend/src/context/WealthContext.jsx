import { createContext, useContext } from 'react';

export const WealthContext = createContext(null);

export const useWealthContext = () => {
  const context = useContext(WealthContext);
  if (!context) {
    throw new Error('useWealthContext must be used within a WealthProvider');
  }
  return context;
};
