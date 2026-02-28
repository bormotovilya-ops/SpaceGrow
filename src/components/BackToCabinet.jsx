import React from 'react'
import { useNavigate } from 'react-router-dom'
import './BackToCabinet.css'

function BackToCabinet() {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className="back-to-cabinet"
      onClick={() => navigate('/cabinet')}
      aria-label="Вернуться в кабинет"
    >
      <span className="back-to-cabinet-icon" aria-hidden="true">←</span>
      <span className="back-to-cabinet-label">В кабинет</span>
    </button>
  )
}

export default BackToCabinet
