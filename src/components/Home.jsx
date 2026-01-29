import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Header from './Header'
import './Home.css'
import { yandexMetricaReachGoal } from '../analytics/yandexMetrica'
import { useLogEvent } from '../hooks/useLogEvent'

function Home({ onDiagnostics, onTechnologies, onAlchemy, onPortal, onAvatarClick }) {
  const { logContentView, logCTAClick } = useLogEvent()
  const [expandedFaq, setExpandedFaq] = useState(null)

  useEffect(() => {
    yandexMetricaReachGoal(null, 'home_page_view')
  }, [])

  useEffect(() => {
    logContentView('page', 'home', { content_title: 'Главная' })
  }, [logContentView])

  const handleCardClick = (cardType, action) => {
    yandexMetricaReachGoal(null, 'home_card_click', { cardType })
    if (action) action()
  }

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index)
  }

  const stats = [
    { number: '19+', label: 'Лет в IT, из них 15 в Enterprise' },
    { number: '1 млрд ₽+', label: 'Суммарный бюджет систем' },
    { number: '30+', label: 'Внедренных экосистем и ботов' },
    { number: '500к ₽', label: 'Максимальный чек за бота' }
  ]

  const journeySteps = [
    { number: 1, title: 'Диагностика', description: '5 минут — видите узкие места' },
    { number: 2, title: 'Консультация', description: '30 минут — получаете план' },
    { number: 3, title: 'Внедрение', description: '2-6 недель — система работает' },
    { number: 4, title: 'Рост', description: 'Постоянно — доход растет в 5x' }
  ]

  const testimonials = [
    {
      text: 'Илья очень грамотный специалист! И человек очень Душевный! 👍',
      author: 'Саттва Ом',
      role: 'Инструктор по йоге и цигун',
      avatar: '/photo_7_2025-03-19_17-21-55.jpg'
    }
  ]

  const faqItems = [
    {
      question: 'Сколько времени занимает настройка системы?',
      answer: 'От 1 до 6 недель в зависимости от сложности вашей воронки. Простые автоматизации запускаются за 1 неделю, комплексные системы с интеграциями — до 6 недель.'
    },
    {
      question: 'Подойдет ли это для моей ниши?',
      answer: 'Работаю с любыми онлайн-школами и экспертными продуктами: от йоги и коучинга до IT-курсов и консалтинга. Главное — у вас есть продукт и желание масштабироваться.'
    },
    {
      question: 'Какие технологии вы используете?',
      answer: 'Telegram-боты, GetCourse, MiniApps, автоворонки в мессенджерах, интеграции через API. Выбираю технологии под вашу задачу, не наоборот.'
    },
    {
      question: 'Сколько это стоит?',
      answer: 'Стоимость внедрения рассчитывается индивидуально и строится по модели Fix + Success Fee: базовая настройка инфраструктуры и процент от фактического прироста вашей прибыли.\n\nТакой подход превращает разработку из «статьи расходов» в совместную инвестицию, где мой основной гонорар напрямую зависит от вашего финансового результата. Точные условия и KPI фиксируются после бесплатной диагностики.'
    }
  ]

  return (
    <div className="home-container">
      <Header 
        onAvatarClick={onAvatarClick}
        onConsultation={onDiagnostics}
        onAlchemyClick={onAlchemy}
        onHomeClick={() => window.location.hash = ''}
        onBack={onPortal}
        activeMenuId="home"
      />

      <div className="home-content">
        {/* Main Offer Section */}
        <motion.div 
          className="home-hero"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="home-hero-content">
            <div className="home-hero-image">
              <img 
                src="/images/main.png" 
                alt="Знание → Технологии → Капитал" 
                className="hero-main-image"
              />
            </div>
            <div className="home-hero-text">
              <h1 className="home-hero-title">
                Прокачаем IT-движок вашего бизнеса!<br/>                
              </h1>
              
              <div className="home-hero-value">
                <span className="value-badge">🎓 Для экспертов и создателей онлайн-школ</span>
                <div className="home-hero-subtitle">
                  <p className="subtitle-paragraph">
                    Если ваш бизнес — это эскалатор идущий вниз, значит пора задуматься об эффективности используемых технологий              
                  </p>
                  <p className="subtitle-paragraph">
                    и внедрить IT-решения нового поколения 
                    <br/>
                    <span className="tech-highlight">(ИИ, Боты, MiniApps и др.)</span>
                  </p>
                  <p className="subtitle-paragraph subtitle-highlight">
                    Наш IT-Service "SpaceGrowth" превратит привычную стабильность в управляемый взлет до <strong>1–2 млн ₽ в месяц и выше.</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* About Me Block */}
        <motion.div 
          className="home-about"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="home-about-content">
            <img src="/images/me.jpg" alt="Илья Бормотов" className="home-about-avatar" />
            <div className="about-text-wrapper">
              <p className="home-about-text">
                Я — <span className="home-about-highlight">Илья Бормотов</span>, IT-интегратор и цифровой алхимик, 
                который помогает экспертам масштабировать их смыслы через грамотную и актуальную инженерию процессов.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div 
          className="home-stats"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="home-stats-grid">
            {stats.map((stat, index) => (
              <motion.div 
                key={index}
                className="stat-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="stat-number">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* User Journey */}
        <motion.div 
          className="home-journey"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <h2 className="journey-title">Ваш путь к автоматизации</h2>
          <div className="journey-steps">
            {journeySteps.map((step, index) => (
              <React.Fragment key={index}>
                <motion.div 
                  className="journey-step"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <div className="step-number">{step.number}</div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </motion.div>
                {index < journeySteps.length - 1 && (
                  <div className="journey-arrow">→</div>
                )}
              </React.Fragment>
            ))}
          </div>
        </motion.div>

        {/* Navigation Grid */}
        <motion.div 
          className="home-cards"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          <motion.div 
            className="home-card"
            whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(255, 215, 0, 0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCardClick('diagnostics', onDiagnostics)}
          >
            <div className="home-card-icon">
              <img src="/images/CTA.png" alt="Диагностика" />
            </div>
            <h3 className="home-card-title">Диагностика</h3>
            <p className="home-card-description">
              Узнайте узкие места в вашей денежной системе за 5 минут.
            </p>
            <div className="card-cta">
              <span className="cta-text">Пройти за 5 минут →</span>
              <span className="cta-badge">Бесплатно</span>
            </div>
            <div className="home-card-glow"></div>
          </motion.div>

          <motion.div 
            className="home-card"
            whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(255, 215, 0, 0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCardClick('technologies', onTechnologies)}
          >
            <div className="home-card-icon">
              <img src="/images/AICP.png" alt="Технологии" />
            </div>
            <h3 className="home-card-title">Технологии</h3>
            <p className="home-card-description">
              Загляните «под капот» АИЦП и посмотрите на мощь автоматизации.
            </p>
            <div className="card-cta">
              <span className="cta-text">Изучить воронку →</span>
              <span className="cta-badge">Интерактивно</span>
            </div>
            <div className="home-card-glow"></div>
          </motion.div>

          <motion.div 
            className="home-card"
            whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(255, 215, 0, 0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCardClick('alchemy', onAlchemy)}
          >
            <div className="home-card-icon">
              <img src="/images/Portal.png" alt="Цифровая Алхимия" />
            </div>
            <h3 className="home-card-title">Цифровая Алхимия</h3>
            <p className="home-card-description">
              Самые вкусные инструменты: квизы, новеллы, тесты, игры, ИИ-агент, анимации и многое другое.
            </p>
            <div className="card-cta">
              <span className="cta-text">Смотреть инструменты →</span>
              <span className="cta-badge">Инструменты</span>
            </div>
            <div className="home-card-glow"></div>
          </motion.div>

          <motion.div 
            className="home-card"
            whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(255, 215, 0, 0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCardClick('profile', onAvatarClick)}
          >
            <div className="home-card-icon">
              <img src="/images/Ava.png" alt="Обо мне" />
            </div>
            <h3 className="home-card-title">Обо мне</h3>
            <p className="home-card-description">
              Узнайте больше о моем опыте, кейсах и подходе к работе.
            </p>
            <div className="card-cta">
              <span className="cta-text">Смотреть профиль →</span>
              <span className="cta-badge">Портфолио</span>
            </div>
            <div className="home-card-glow"></div>
          </motion.div>
        </motion.div>

        {/* Testimonials */}
        <motion.div 
          className="home-testimonials"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <h2 className="testimonials-title">Что говорят эксперты</h2>
          <div className="testimonials-grid">
            {testimonials.map((testimonial, index) => (
              <motion.div 
                key={index}
                className="testimonial-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                whileHover={{ scale: 1.03 }}
              >
                <div className="testimonial-quote">"</div>
                <p className="testimonial-text">{testimonial.text}</p>
                <div className="testimonial-author">
                  <img src={testimonial.avatar} alt={testimonial.author} className="testimonial-avatar" />
                  <div className="author-info">
                    <strong>{testimonial.author}</strong>
                    <span>{testimonial.role}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div 
          className="home-faq"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <h2 className="faq-title">Частые вопросы</h2>
          <div className="faq-list">
            {faqItems.map((item, index) => (
              <motion.div 
                key={index}
                className={`faq-item ${expandedFaq === index ? 'expanded' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 + index * 0.05 }}
              >
                <button 
                  className="faq-question"
                  onClick={() => toggleFaq(index)}
                >
                  <span>{item.question}</span>
                  <span className="faq-icon">{expandedFaq === index ? '−' : '+'}</span>
                </button>
                {expandedFaq === index && (
                  <motion.div 
                    className="faq-answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p>{item.answer}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Sticky CTA for Mobile */}
        <motion.div 
          className="sticky-cta"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 2 }}
        >
          <button 
            className="sticky-cta-button" 
            onClick={async () => {
              await logCTAClick('sticky_cta', { ctaText: 'Экспресс-диагностика', ctaLocation: 'home', previousStep: 'viewing_home' })
              onDiagnostics()
            }}
          >
            <span>Экспресс-диагностика</span>
            <span className="cta-arrow">→</span>
          </button>
        </motion.div>

        {/* Footer with Contacts */}
        <motion.div 
          className="home-footer"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
        >
          <div className="home-footer-content">
            <h3 className="home-footer-title">Контакты</h3>
            <div className="home-footer-contacts">
              <a href="tel:+79991237788" className="home-footer-contact">
                <span className="home-footer-icon">📞</span>
                <span>+7 (999) 123-77-88</span>
              </a>
              
              <a href="mailto:bormotovilya@gmail.com" className="home-footer-contact">
                <span className="home-footer-icon">📧</span>
                <span>bormotovilya@gmail.com</span>
              </a>
              
              <a href="https://t.me/ilyaborm" target="_blank" rel="noopener noreferrer" className="home-footer-contact">
                <span className="home-footer-icon">
                  <img src="/images/telegram-icon.png" alt="Telegram" className="home-footer-telegram-icon" />
                </span>
                <span>@ilyaborm</span>
              </a>
              
              <a href="https://t.me/SoulGuideIT" target="_blank" rel="noopener noreferrer" className="home-footer-contact">
                <span className="home-footer-icon">📢</span>
                <span>@SoulGuideIT</span>
              </a>
            </div>
            
            <div className="home-footer-links">
              <a 
                href="https://docs.google.com/document/d/1rdhH5IrwNAW9O_Vj_aFamzBzqMLMlQ-B/edit?usp=sharing&ouid=117665820562834516912&rtpof=true&sd=true" 
                target="_blank" 
                rel="noopener noreferrer"
                className="home-footer-link"
              >
                Политика в отношении обработки персональных данных
              </a>
            </div>
          </div>
        </motion.div>

        {/* Animated Background Elements */}
        <div className="home-bg-orbs">
          <div className="home-orb home-orb-1"></div>
          <div className="home-orb home-orb-2"></div>
          <div className="home-orb home-orb-3"></div>
        </div>
      </div>
    </div>
  )
}

export default Home
