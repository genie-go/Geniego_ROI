import React, { createContext, useContext, useState, useCallback } from 'react';

const MobileSidebarContext = createContext(null);

export function MobileSidebarProvider({ children }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(o => !o), []);
  const close  = useCallback(() => setOpen(false), []);
  return (
    <MobileSidebarContext.Provider value={{ open, toggle, close }}>
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function useMobileSidebar() {
  const ctx = useContext(MobileSidebarContext);
  if (!ctx) throw new Error('useMobileSidebar must be used inside MobileSidebarProvider');
  return ctx;
}
