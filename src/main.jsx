import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import {
  enableYandexMetricaContactGoals,
  enableYandexMetricaSpaTracking,
  initYandexMetrica,
} from './analytics/yandexMetrica'
import { initGlobalFrontendLogging } from './utils/logging'

// Глобальное логирование фронтенда (старты + JS/ресурсные ошибки),
// чтобы понимать проблемы даже при прямом заходе на сайт, без MiniApp.
if (typeof window !== 'undefined') {
  initGlobalFrontendLogging()
}

// Аналитику инициализируем после первого кадра, чтобы не блокировать отрисовку.
// На iOS/Safari requestIdleCallback может срабатывать с большой задержкой — используем setTimeout.
// Если VITE_YM_COUNTER_ID не задан, используем дефолтный ID из прод-счётчика.
const YM_COUNTER_ID = import.meta.env.VITE_YM_COUNTER_ID || '107234648'
const initAnalytics = () => {
  initYandexMetrica(YM_COUNTER_ID)
  enableYandexMetricaSpaTracking(YM_COUNTER_ID)
  enableYandexMetricaContactGoals(YM_COUNTER_ID)
}
const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
if (!isIOS && typeof requestIdleCallback === 'function') {
  requestIdleCallback(initAnalytics, { timeout: 2000 })
} else {
  setTimeout(initAnalytics, 100)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)




