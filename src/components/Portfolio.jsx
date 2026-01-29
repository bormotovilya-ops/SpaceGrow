import React, { useEffect } from 'react'
import './Portfolio.css'
import { useLogEvent } from '../hooks/useLogEvent'

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
  competencies: {
    title: 'Технологический стек',
    items: [
      {
        icon: '🌐',
        title: 'Web-разработка',
        description: 'Создание лендингов и многостраничных сайтов как на конструкторах (Tilda, GetCourse), так и кастомных решений (React/Vercel) для высокой скорости загрузки'
      },
      {
        icon: '📱',
        title: 'Чат-боты и Mini Apps',
        description: 'Разработка интерфейсов внутри мессенджера, которые заменяют полноценные мобильные приложения и сайты'
      },
      {
        icon: '🎓',
        title: 'Автоматизация EdTech',
        description: 'Полная настройка платформы GetCourse, сборка автоворонок, интеграция платежей и CRM-систем'
      },
      {
        icon: '🔗',
        title: 'Системная интеграция',
        description: 'Связка сайтов и ботов с внутренним ПО бизнеса (1С, SQL, сторонние API) для полной автоматизации отчетности'
      }
    ]
  },
  cases: {
    title: 'Кейсы',
    cards: [
      {
        title: 'Инфобизнес и EdTech',
        description: 'Комплексная автоматизация обучения: от продающих лендингов до настройки GetCourse и ботов-помощников.',
        image: '/images/1.png',
        links: [
          {
            group: 'Лендинги:',
            items: [
              { text: 'Общий лендинг: Йога и Цигун', url: 'https://vyoga.ru/elementor-%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3-1965' },
              { text: 'Курс «Дао женского здоровья»', url: 'https://vyoga.ru/elementor-%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3-1984/' },
              { text: 'Программа «Здоровая спина»', url: 'https://vyoga.ru/elementor-%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3-1887/' },
              { text: 'Курс «Здоровье нервной системы»', url: 'https://vyoga.ru/elementor-%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3-1945/' }
            ]
          },
          {
            group: 'Сайты:',
            items: [
              { text: 'Сайт-тест по Аюрведе (DoshaTest)', url: 'https://doshatest.ru' }
            ]
          },
          {
            group: 'Видеокурсы в боте:',
            items: [
              { text: 'Бот по медитациям', url: 'https://t.me/meditasiya_bot' },
              { text: 'Бот по йоге и цигун', url: 'https://t.me/V_Yoga_Bot' },
              { text: 'Уроки вокала', url: 'https://t.me/VocallessonsLaika_Bot' }
            ]
          },
          {
            group: 'GetCourse:',
            items: [
              { text: 'Обучение руководителей для rcdway.ru', url: 'https://rcdway.ru/' },
              { text: 'Курсы по йоге для vyoga.ru', url: 'https://vyoga.ru/elementor-%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3-1965' }
            ]
          }
        ]
      },
      {
        title: 'Маркетинг и Mini Apps',
        description: 'Современные WebApp-интерфейсы внутри Telegram и воронки продаж, которые превращают подписчиков в покупателей.',
        image: '/images/2.png',
        links: [
          {
            group: 'Showcase:',
            items: [
              { text: 'Визитка MiniApp', url: 'https://miniappvizitka.vercel.app/' },
              { text: 'Магазин чая', url: 'https://telegram.me/krasota_vostoka_bot' }
            ]
          },
          {
            group: 'Воронки:',
            items: [
              { text: 'Школа китайского (1000+ чел)', url: 'https://telegram.me/weinihaoru_bot' },
              { text: 'Юридические эксперты', url: 'https://telegram.me/SafeSaleLawBot' },
              { text: 'Юридические услуги для бизнеса', url: 'https://telegram.me/logachev_legal_bot' }
            ]
          },
          {
            group: 'Events:',
            items: [
              { text: 'Запись на концерты', url: 'https://t.me/kidcodes_music_bot' },
              { text: 'Бот знакомств', url: 'https://t.me/FDatingPermBot' }
            ]
          }
        ]
      },
      {
        title: 'Автоматизация и B2B (1С)',
        description: 'Сложные технические решения для интеграции мессенджеров с корпоративным ПО и учетными системами.',
        image: '/images/3.png',
        links: [
          {
            group: 'ТКО-Сервис:',
            items: [
              { text: 'Система учета на базе 1С (1.5+ года работы, 1000+ чел)', url: 'https://t.me/ProTKObot' }
            ]
          },
          {
            group: 'Экосистема для стройки:',
            items: [
              { text: 'Приемка', url: 'https://telegram.me/PriemkaGarantBot' },
              { text: 'Рекламации', url: 'https://telegram.me/reclamation_kv_bot' },
              { text: 'Закупки', url: 'https://telegram.me/BuildOrdersBot' },
              { text: 'QR-проходная', url: 'https://telegram.me/AccessStroyBot' }
            ]
          },
          {
            group: 'Запись на услуги:',
            items: [
              { text: 'Бот для кабинета косметолога', url: 'https://telegram.me/BeautyWitchBot' }
            ]
          }
        ]
      }
    ]
  }
}

function Portfolio({ onClose, onConsultation }) {
  const { logContentView } = useLogEvent()
  useEffect(() => {
    logContentView('page', 'portfolio', { content_title: 'Портфолио' })
  }, [logContentView])

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
            <div className="portfolio-cases-cards">
              {portfolioData.cases.cards.map((card, cardIdx) => (
                <div key={cardIdx} className="portfolio-case-main-card">
                  <div className="portfolio-case-main-card-image">
                    <img src={card.image} alt={card.title} />
                  </div>
                  <h4 className="portfolio-case-main-card-title">{card.title}</h4>
                  <p className="portfolio-case-main-card-description">{card.description}</p>
                  <div className="portfolio-case-main-card-links">
                    {card.links.map((linkGroup, groupIdx) => (
                      <div key={groupIdx} className="portfolio-case-link-group">
                        <strong>{linkGroup.group}</strong>
                        <ul>
                          {linkGroup.items.map((item, itemIdx) => (
                            <li key={itemIdx}>
                              {typeof item === 'string' ? item : (
                                <a href={item.url} target="_blank" rel="noopener noreferrer">{item.text}</a>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="portfolio-section">
            <h3>{portfolioData.competencies.title}</h3>
            <div className="portfolio-tech-stack">
              {portfolioData.competencies.items.map((item, idx) => (
                <div key={idx} className="portfolio-tech-item">
                  <div className="portfolio-tech-icon">{item.icon}</div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
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


