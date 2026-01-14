import React from 'react'
import './CenterPhoto.css'
import { yandexMetricaReachGoal } from '../analytics/yandexMetrica'

function CenterPhoto() {
  return (
    <a 
      className="center-photo" 
      href="https://t.me/ilyaborm" 
      target="_blank" 
      rel="noopener noreferrer"
      onClick={() => yandexMetricaReachGoal(null, 'telegram_click', { placement: 'center_photo' })}
    >
      <img src="/images/me.jpg" alt="avatar" />
    </a>
  )
}

export default CenterPhoto




