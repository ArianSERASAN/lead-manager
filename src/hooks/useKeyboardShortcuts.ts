import { useEffect } from 'react';

interface ShortcutConfig {
  onNavigateUp: () => void;
  onNavigateDown: () => void;
  onOpenDetail: () => void;
  onCloseDetail: () => void;
  onNewLead: () => void;
  onShowHelp: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onNavigateUp,
  onNavigateDown,
  onOpenDetail,
  onCloseDetail,
  onNewLead,
  onShowHelp,
  enabled = true,
}: ShortcutConfig): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement).isContentEditable) return;

      switch (e.key) {
        case 'k': onNavigateUp(); break;
        case 'j': onNavigateDown(); break;
        case 'Enter': onOpenDetail(); break;
        case 'Escape': onCloseDetail(); break;
        case 'n': onNewLead(); break;
        case '?': e.preventDefault(); onShowHelp(); break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onNavigateUp, onNavigateDown, onOpenDetail, onCloseDetail, onNewLead, onShowHelp]);
}
