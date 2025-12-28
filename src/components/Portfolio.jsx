import React from 'react'
import './Portfolio.css'

const portfolioData = {
  experience: {
    title: 'Опыт',
    items: [
      '18+ лет в IT и архитектуре систем',
      'Главный аналитик крупных госпроектов (сотни миллионов)',
      'Руководитель группы аналитики (5 человек)',
      'ИП с 2018 года, фокус на Telegram с 2023'
    ]
  },
  cases: {
    title: 'Кейсы',
    items: [
      '20+ реализованных коммерческих ботов',
      'Бот за 500 тыс. руб. - максимальный проект',
      'Крупные госпроекты стоимостью сотни миллионов',
      'Онлайн-школы: до/после автоматизации',
      '100% проектов сданы в срок'
    ]
  },
  competencies: {
    title: 'Компетенции',
    items: [
      'Системная аналитика',
      'Архитектура воронок продаж',
      'Интеграции и автоматизация',
      'Telegram-боты и MiniApps',
      'Управление проектами'
    ]
  }
}

function Portfolio({ onClose, onConsultation }) {
  return (
    <div className="portfolio-overlay" onClick={onClose}>
      <div className="portfolio-modal" onClick={(e) => e.stopPropagation()}>
        <button className="portfolio-close" onClick={onClose}>×</button>
        
        <div className="portfolio-header">
          <h2>Илья Бормотов</h2>
          <p className="portfolio-subtitle">Архитектор автоматизированных цепочек продаж</p>
        </div>

        <div className="portfolio-content">
          <div className="portfolio-section">
            <h3>{portfolioData.experience.title}</h3>
            <ul>
              {portfolioData.experience.items.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="portfolio-section">
            <h3>{portfolioData.cases.title}</h3>
            <ul>
              {portfolioData.cases.items.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="portfolio-section">
            <h3>{portfolioData.competencies.title}</h3>
            <ul>
              {portfolioData.competencies.items.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="portfolio-footer">
          <button className="consultation-btn" onClick={onConsultation}>
            Получить бесплатную консультацию
          </button>
        </div>
      </div>
    </div>
  )
}

export default Portfolio


