/**
 * Enterprise Keyboard Shortcuts Manager
 * ========================================
 * Ctrl+K : Global search
 * Ctrl+/ : Help center
 * Ctrl+D : Dashboard
 * Ctrl+B : Budget
 * Escape : Close modals
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function KeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      // Skip if user is typing in input
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'k') {
        e.preventDefault();
        // Focus search if exists
        const search = document.querySelector('[data-search-input]') || document.querySelector('input[type="search"]');
        if (search) search.focus();
      }

      if (ctrl && e.key === '/') {
        e.preventDefault();
        navigate('/help');
      }

      if (ctrl && e.key === 'd') {
        e.preventDefault();
        navigate('/dashboard');
      }

      if (ctrl && e.key === 'b') {
        e.preventDefault();
        navigate('/budget-tracker');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  return null;
}
