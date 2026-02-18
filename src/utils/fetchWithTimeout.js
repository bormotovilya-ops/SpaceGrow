import { API_REQUEST_TIMEOUT_MS } from '../config/sessionLifecycle';

/**
 * Выполняет fetch с таймаутом. При истечении времени запрос прерывается через AbortController,
 * чтобы не оставлять UI в вечном ожидании (важно для Telegram Mini App и мобильных WebView).
 *
 * @param {string} url - URL запроса
 * @param {RequestInit} [options] - опции fetch (method, headers, body и т.д.)
 * @param {number} [timeoutMs=API_REQUEST_TIMEOUT_MS] - таймаут в миллисекундах
 * @returns {Promise<Response>}
 * @throws {DOMException} AbortError при таймауте
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = API_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal ?? controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Запрос превысил время ожидания (${timeoutMs / 1000} с)`);
      timeoutErr.name = 'AbortError';
      throw timeoutErr;
    }
    throw err;
  }
}
