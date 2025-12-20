import { createContext, useState, useEffect, useContext } from 'react';

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-collapse on smaller screens (e.g. laptop/tablet < 1280px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    // Initial check
    handleResize();

    // Listen for resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsCollapsed(prev => !prev);

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => useContext(SidebarContext);

