import React, { createContext, useState, useContext, useCallback } from 'react';

const HelpContext = createContext();

export const HelpProvider = ({ children }) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [externalMessage, setExternalMessage] = useState(null);
  const [helpContext, setHelpContext] = useState(null);

  const openHelp = useCallback((message = null, context = null) => {
    if (message) {
      setExternalMessage(message);
    }
    if (context) {
      setHelpContext(context);
    }
    setIsHelpOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    setIsHelpOpen(false);
    setExternalMessage(null);
    setHelpContext(null);
  }, []);

  return (
    <HelpContext.Provider value={{ isHelpOpen, openHelp, closeHelp, externalMessage, setExternalMessage, helpContext }}>
      {children}
    </HelpContext.Provider>
  );
};

export const useHelp = () => {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
};
