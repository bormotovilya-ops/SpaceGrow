import { useEffect, useState } from 'react';
import { useLogEvent } from '../hooks/useLogEvent';
import { useSessionLifecycle } from '../hooks/useSessionLifecycle';
import { userUtils } from '../utils/logging';
import SessionStaleOverlay from './SessionStaleOverlay';

/**
 * SessionInitializer - компонент для инициализации сессии и логирования прихода пользователя.
 * Также обрабатывает долгую неактивность в Telegram Mini App (visibilitychange) и предлагает
 * перезагрузку, чтобы избежать зависания WebView.
 */
const SessionInitializer = ({ children }) => {
  const { logArrival, logMiniAppOpen, logEvent, ensureSession } = useLogEvent();
  const [isInitialized, setIsInitialized] = useState(false);
  const { sessionStale, dismissStale, reload, closeMiniApp } = useSessionLifecycle();

  useEffect(() => {
    const initializeSession = async () => {
      try {
        // 1. Инициализируем сессию
        const sessionId = await ensureSession();

        if (sessionId) {
          // 2. Определяем источник прихода
          let source = 'direct';

          // Проверяем UTM параметры
          const utmParams = userUtils.getUTMParams();
          if (utmParams.utm_source) {
            source = utmParams.utm_source;
          } else {
            // Проверяем referrer
            const referrer = userUtils.getReferrer();
            if (referrer) {
              if (referrer.includes('t.me') || referrer.includes('telegram')) {
                source = 'telegram';
              } else if (referrer.includes('vk.com') || referrer.includes('vkontakte')) {
                source = 'vk';
              } else if (referrer.includes('google')) {
                source = 'search';
              } else if (referrer.includes('yandex')) {
                source = 'yandex_search';
              } else {
                source = 'referrer';
              }
            }

            // Проверяем Telegram WebApp
            if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
              source = 'telegram_miniapp';
            }
          }

          // 3. Логируем приход пользователя
          await logArrival(source);

          // 4. Если это MiniApp, логируем открытие
          if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            const urlParams = new URLSearchParams(window.location.search);
            const pageId = urlParams.get('page') || 'main';
            await logMiniAppOpen(pageId);
          }

          // 5. Автоматический page_view при инициализации приложения
          if (typeof window !== 'undefined' && logEvent) {
            const path = window.location.pathname || (window.location.hash ? window.location.hash.replace(/^#/, '') : '') || '/';
            await logEvent('visit', 'page_view', { page: path || '/' });
          }

          console.log('✅ Session initialized and arrival logged', {
            sessionId,
            source,
            utmParams,
            referrer: userUtils.getReferrer()
          });
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Failed to initialize session:', error);
        setIsInitialized(true); // Продолжаем работу даже при ошибке
      }
    };

    // Небольшая задержка для обеспечения загрузки Telegram WebApp
    const timer = setTimeout(initializeSession, 100);

    return () => clearTimeout(timer);
  }, [logArrival, logMiniAppOpen, logEvent, ensureSession]);

  // Показываем loading пока инициализируется сессия
  if (!isInitialized) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        fontSize: '16px',
        color: 'white'
      }}>
        Инициализация...
      </div>
    );
  }

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