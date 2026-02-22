import { useEffect } from 'react';
import { useLogEvent } from '../hooks/useLogEvent';
import { useSessionLifecycle } from '../hooks/useSessionLifecycle';
import { userUtils } from '../utils/logging';
import SessionStaleOverlay from './SessionStaleOverlay';

/**
 * SessionInitializer - инициализация сессии и логирование прихода в фоне, без блокировки UI.
 * Также обрабатывает долгую неактивность в Telegram Mini App (visibilitychange).
 */
const SessionInitializer = ({ children }) => {
  const { logArrival, logMiniAppOpen, logEvent, ensureSession } = useLogEvent();
  const { sessionStale, dismissStale, reload, closeMiniApp } = useSessionLifecycle();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const sessionId = await ensureSession();
        if (cancelled || !sessionId) return;

        let source = 'direct';
        const utmParams = userUtils.getUTMParams();
        if (utmParams.utm_source) {
          source = utmParams.utm_source;
        } else {
          const referrer = userUtils.getReferrer();
          if (referrer) {
            if (referrer.includes('t.me') || referrer.includes('telegram')) source = 'telegram';
            else if (referrer.includes('vk.com') || referrer.includes('vkontakte')) source = 'vk';
            else if (referrer.includes('google')) source = 'search';
            else if (referrer.includes('yandex')) source = 'yandex_search';
            else source = 'referrer';
          }
          if (typeof window !== 'undefined' && (window.Telegram?.WebApp || window.TelegramWebApp)) {
            source = 'telegram_miniapp';
          }
        }

        await logArrival(source);
        if (cancelled) return;

        if (typeof window !== 'undefined' && (window.Telegram?.WebApp || window.TelegramWebApp)) {
          const urlParams = new URLSearchParams(window.location.search);
          const pageId = urlParams.get('page') || 'main';
          await logMiniAppOpen(pageId);
        }
        if (cancelled) return;

        if (typeof window !== 'undefined' && logEvent) {
          const path = window.location.pathname || (window.location.hash ? window.location.hash.replace(/^#/, '') : '') || '/';
          await logEvent('visit', 'page_view', { page: path || '/' });
        }

        if (!cancelled) {
          console.log('✅ Session initialized and arrival logged', { sessionId, source });
        }
      } catch (error) {
        if (!cancelled) console.error('❌ Failed to initialize session:', error);
      }
    };

    // Запуск в фоне после первого кадра, чтобы не блокировать отрисовку
    const t = setTimeout(run, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [logArrival, logMiniAppOpen, logEvent, ensureSession]);

  return (
    <>
      {children}
      {sessionStale && (
        <SessionStaleOverlay
          onReload={reload}
          onClose={closeMiniApp}
          onDismiss={dismissStale}
        />
      )}
    </>
  );
};

export default SessionInitializer;