import { useEffect, useRef, useState, useCallback } from 'react';
import { INACTIVITY_THRESHOLD_MS, isTelegramMiniApp } from '../config/sessionLifecycle';

/**
 * Отслеживает жизненный цикл страницы в Telegram Mini App.
 * При возврате пользователя после долгого отсутствия (вкладка/приложение было скрыто)
 * помечает сессию как устаревшую, чтобы предложить перезагрузку и избежать зависания WebView.
 */
export function useSessionLifecycle() {
  const [sessionStale, setSessionStale] = useState(false);
  const hiddenAtRef = useRef(null);

  const handleVisibilityChange = useCallback(() => {
    if (!isTelegramMiniApp()) return;

    if (document.visibilityState === 'hidden') {
      hiddenAtRef.current = Date.now();
    } else if (document.visibilityState === 'visible' && hiddenAtRef.current !== null) {
      const hiddenDuration = Date.now() - hiddenAtRef.current;
      if (hiddenDuration >= INACTIVITY_THRESHOLD_MS) {
        setSessionStale(true);
      }
      hiddenAtRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isTelegramMiniApp()) return;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleVisibilityChange]);

  const dismissStale = useCallback(() => {
    setSessionStale(false);
  }, []);

  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  const closeMiniApp = useCallback(() => {
    const tg = window.Telegram?.WebApp || window.TelegramWebApp;
    if (tg?.close) {
      tg.close();
    } else {
      window.location.reload();
    }
  }, []);

  return {
    sessionStale,
    dismissStale,
    reload,
    closeMiniApp,
    isMiniApp: isTelegramMiniApp()
  };
}
