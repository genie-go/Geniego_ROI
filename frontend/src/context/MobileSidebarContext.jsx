import React, { createContext, useContext, useState, useCallback } from 'react';

import ko from '../i18n/locales/ko.js';
const t = (k) => k.split('.').reduce((o,i)=>o?.[i], {auto: ko?.auto}) || k;


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
