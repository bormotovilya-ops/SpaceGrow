import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import BackToCabinet from './BackToCabinet'
import './CabinetShelf.css'

// Тренинги
const SHELF_TRAININGS = [
  { id: 'eq', title: 'Эмоциональный интеллект', cover: '🧠', path: '/eq-module', desc: 'Интерактивный модуль с сертификатом.' },
  { id: 'people', title: 'Люди, которые играют в игры', cover: '🎭', path: '/people-games-module', desc: 'Курс-новелла по Берну.' },
  { id: 'custom-training', title: 'Предложить свой тренинг', cover: '✨', telegram: 'https://t.me/ilyaborm', desc: 'Обсудить свой формат тренинга.' }
]

// Тесты
const SHELF_TESTS = [
  { id: 'onboarding', title: 'Знакомство', cover: '🤝', path: '/alchemy/onboarding', desc: 'Короткий диалог для сонастройки.' },
  { id: 'ikigai', title: 'Матрица Икигай', cover: '🎯', path: '/alchemy/ikigai', desc: 'Поиск ниши и смыслов.' },
  { id: 'diagnostics', title: 'Диагностика системы продаж', cover: '📊', path: '/diagnostics', desc: 'Узкие места в воронке продаж.' },
  { id: 'custom-test', title: 'Предложить свой тест', cover: '✨', telegram: 'https://t.me/ilyaborm', desc: 'Уникальная механика под вашу методологию.' }
]

function CabinetShelf() {
  const navigate = useNavigate()
  const [approachDone, setApproachDone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setApproachDone(true), 100)
    return () => clearTimeout(t)
  }, [])

  const handleBookClick = (item) => {
    if (item.soon) return
    if (item.telegram) {
      window.open(item.telegram, '_blank')
      return
    }
    if (item.state) navigate(item.path, { state: item.state })
    else navigate(item.path)
  }

  return (
    <div className="cabinet-shelf-root">
      <Header
        onAvatarClick={() => navigate('/profile')}
        onConsultation={() => navigate('/diagnostics')}
        onBack={() => navigate('/cabinet')}
        onAlchemyClick={() => navigate('/alchemy')}
        onHomeClick={() => navigate('/home')}
        activeMenuId="cabinet"
      />
      <div className="back-to-cabinet-wrap">
        <BackToCabinet />
      </div>
      <div className={`cabinet-shelf-view ${approachDone ? 'cabinet-shelf-approached' : ''}`}>
        <div className="cabinet-shelf-backdrop" aria-hidden="true" />
        <div className="cabinet-shelf-content">
          <h1 className="cabinet-shelf-title">Полка</h1>
          <p className="cabinet-shelf-subtitle">Тренинги и тесты</p>

          <section className="cabinet-shelf-section">
            <h2 className="cabinet-shelf-section-title">Тренинги</h2>
            <div className="cabinet-shelf-books">
              {SHELF_TRAININGS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="cabinet-shelf-book"
                  onClick={() => handleBookClick(item)}
                  title={item.desc}
                >
                  <div className="cabinet-shelf-book-cover">{item.cover}</div>
                  <span className="cabinet-shelf-book-title">{item.title}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="cabinet-shelf-section">
            <h2 className="cabinet-shelf-section-title">Тесты</h2>
            <div className="cabinet-shelf-books">
              {SHELF_TESTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="cabinet-shelf-book"
                  onClick={() => handleBookClick(item)}
                  title={item.desc}
                >
                  <div className="cabinet-shelf-book-cover">{item.cover}</div>
                  <span className="cabinet-shelf-book-title">{item.title}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default CabinetShelf
