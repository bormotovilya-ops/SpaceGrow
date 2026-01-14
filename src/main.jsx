import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import {
  enableYandexMetricaContactGoals,
  enableYandexMetricaSpaTracking,
  initYandexMetrica,
} from './analytics/yandexMetrica'

// Analytics (Yandex Metrica)
const YM_COUNTER_ID = import.meta.env.VITE_YM_COUNTER_ID
initYandexMetrica(YM_COUNTER_ID)
enableYandexMetricaSpaTracking(YM_COUNTER_ID)
enableYandexMetricaContactGoals(YM_COUNTER_ID)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)




