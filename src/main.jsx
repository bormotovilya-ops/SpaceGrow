import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import {
  enableYandexMetricaContactGoals,
  enableYandexMetricaSpaTracking,
  initYandexMetrica,
} from './analytics/yandexMetrica'

// Аналитику инициализируем после первого кадра, чтобы не блокировать отрисовку.
// На iOS/Safari requestIdleCallback может срабатывать с большой задержкой — используем setTimeout.
const YM_COUNTER_ID = import.meta.env.VITE_YM_COUNTER_ID
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




