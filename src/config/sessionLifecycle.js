/**
 * Настройки жизненного цикла сессии для Telegram Mini App.
 * Используются для обработки долгой неактивности и зависания WebView.
 */

/** Порог неактивности (мс): если приложение было скрыто дольше — считаем сессию устаревшей */
export const INACTIVITY_THRESHOLD_MS = 10 * 60 * 1000; // 10 минут

/** Таймаут для API-запросов (мс), чтобы не оставлять UI в вечном ожидании */
export const API_REQUEST_TIMEOUT_MS = 60 * 1000; // 60 секунд

/** Включить проверку только в среде Telegram Mini App (по наличию initData) */
export function isTelegramMiniApp() {
  if (typeof window === 'undefined') return false;
  const tg = window.Telegram?.WebApp || window.TelegramWebApp;
  return !!(tg && tg.initData && tg.initData.length > 0);
}
