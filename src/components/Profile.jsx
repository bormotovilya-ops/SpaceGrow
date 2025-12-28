import React from 'react'
import './Profile.css'

function Profile({ onBack }) {
  const handleConsultation = () => {
    window.open('https://t.me/ilyaborm', '_blank')
  }

  return (
    <div className="profile-container">
      <button className="profile-back-btn" onClick={onBack}>
        ← Назад
      </button>
      
      <div className="profile-content">
        <div className="profile-header">
          <img src="/images/me.jpg" alt="Илья Бормотов" className="profile-main-avatar" />
          <div className="profile-header-text">
            <h1>Илья Бормотов</h1>
            <p className="profile-subtitle">Архитектор автоматизированных цепочек продаж</p>
          </div>
        </div>

        <div className="profile-sections">
          {/* Компетенции */}
          <section className="profile-section">
            <h2>Компетенции</h2>
            <div className="skills-grid">
              <div className="skill-card">
                <h3>Системная аналитика</h3>
                <p>18+ лет опыта в анализе и проектировании сложных систем</p>
              </div>
              <div className="skill-card">
                <h3>Архитектура воронок</h3>
                <p>Проектирование автоматизированных цепочек продаж</p>
              </div>
              <div className="skill-card">
                <h3>Интеграции</h3>
                <p>Соединение различных систем и платформ</p>
              </div>
              <div className="skill-card">
                <h3>Telegram-боты</h3>
                <p>Разработка ботов для автоматизации бизнес-процессов</p>
              </div>
              <div className="skill-card">
                <h3>Управление проектами</h3>
                <p>Руководство командами, контроль сроков и качества</p>
              </div>
              <div className="skill-card">
                <h3>Бизнес-анализ</h3>
                <p>Выявление потребностей и проектирование решений</p>
              </div>
            </div>
          </section>

          {/* Кейсы */}
          <section className="profile-section">
            <h2>Кейсы</h2>
            <div className="cases-grid">
              <a href="https://leadteh.site/mywork_IlyaBorm" target="_blank" rel="noopener noreferrer" className="case-card-link">
                <div className="case-card">
                  <div className="case-icon">🤖</div>
                  <h3>Telegram-боты</h3>
                  <p>Различные боты для бизнеса: от простых чат-ботов до сложных автоматизированных систем</p>
                  <div className="case-link-text">Смотреть кейсы →</div>
                </div>
              </a>
              
              <a href="https://leadteh.site/mywork_IlyaBorm" target="_blank" rel="noopener noreferrer" className="case-card-link">
                <div className="case-card">
                  <div className="case-icon">🌐</div>
                  <h3>Сайты и лендинги</h3>
                  <p>Разработка продающих сайтов и лендингов для различных ниш</p>
                  <div className="case-link-text">Смотреть кейсы →</div>
                </div>
              </a>
              
              <a href="https://leadteh.site/mywork_IlyaBorm" target="_blank" rel="noopener noreferrer" className="case-card-link">
                <div className="case-card">
                  <div className="case-icon">🔄</div>
                  <h3>Автоворонки</h3>
                  <p>Автоматизированные воронки продаж с интеграцией различных инструментов</p>
                  <div className="case-link-text">Смотреть кейсы →</div>
                </div>
              </a>
              
              <a href="https://leadteh.site/mywork_IlyaBorm" target="_blank" rel="noopener noreferrer" className="case-card-link">
                <div className="case-card">
                  <div className="case-icon">📚</div>
                  <h3>Обучающие курсы</h3>
                  <p>Платформы для онлайн-обучения на базе ботов и GetCourse</p>
                  <div className="case-link-text">Смотреть кейсы →</div>
                </div>
              </a>
            </div>
            <div className="cases-note">
              <p>Больше кейсов на <a href="https://leadteh.site/mywork_IlyaBorm" target="_blank" rel="noopener noreferrer">leadteh.site/mywork_IlyaBorm</a></p>
            </div>
          </section>

          {/* Достижения */}
          <section className="profile-section">
            <h2>Достижения</h2>
            <div className="achievements-grid">
              <div className="achievement-card">
                <div className="achievement-number">20+</div>
                <h3>Реализованных ботов</h3>
                <p>Коммерческие проекты различной сложности</p>
              </div>
              <div className="achievement-card">
                <div className="achievement-number">500K</div>
                <h3>Максимальный проект</h3>
                <p>Бот стоимостью 500 000 рублей</p>
              </div>
              <div className="achievement-card">
                <div className="achievement-number">100%</div>
                <h3>Проектов в срок</h3>
                <p>Все проекты сданы вовремя</p>
              </div>
              <div className="achievement-card">
                <div className="achievement-number">18+</div>
                <h3>Лет в IT</h3>
                <p>Опыт работы с крупными системами</p>
              </div>
            </div>
          </section>

          {/* Подход */}
          <section className="profile-section">
            <h2>Мой подход</h2>
            <div className="approach-list">
              <div className="approach-item">
                <div className="approach-icon">🎯</div>
                <div>
                  <h3>От бизнес-целей к архитектуре</h3>
                  <p>Сначала понимаю ваши цели, затем проектирую систему, и только потом выбираю инструменты</p>
                </div>
              </div>
              <div className="approach-item">
                <div className="approach-icon">🔗</div>
                <div>
                  <h3>Единая система, а не инструменты</h3>
                  <p>Создаю целостную архитектуру, где все элементы работают вместе</p>
                </div>
              </div>
              <div className="approach-item">
                <div className="approach-icon">📊</div>
                <div>
                  <h3>Ответственность за результат</h3>
                  <p>Отвечаю за рост показателей: лиды → заявки → продажи</p>
                </div>
              </div>
              <div className="approach-item">
                <div className="approach-icon">⚡</div>
                <div>
                  <h3>Прозрачность и скорость</h3>
                  <p>Без бюрократии, все процессы на виду, быстрая реакция</p>
                </div>
              </div>
            </div>
          </section>

          {/* Контакты */}
          <section className="profile-section">
            <h2>Контакты</h2>
            <div className="contacts-grid">
              <a href="tel:+79991237788" className="contact-card">
                <div className="contact-icon">📞</div>
                <h3>Телефон</h3>
                <p>+7 (999) 123-77-88</p>
                <div className="contact-hint">Нажмите для звонка</div>
              </a>
              
              <a href="mailto:bormotovilya@gmail.com" className="contact-card">
                <div className="contact-icon">📧</div>
                <h3>Email</h3>
                <p>bormotovilya@gmail.com</p>
                <div className="contact-hint">Нажмите для отправки письма</div>
              </a>
              
              <a href="https://t.me/ilyaborm" target="_blank" rel="noopener noreferrer" className="contact-card">
                <div className="contact-icon">💬</div>
                <h3>Telegram</h3>
                <p>@ilyaborm</p>
                <div className="contact-hint">Перейти в Telegram</div>
              </a>
              
              <a href="https://t.me/SoulGuideIT" target="_blank" rel="noopener noreferrer" className="contact-card">
                <div className="contact-icon">📢</div>
                <h3>Канал</h3>
                <p>@SoulGuideIT</p>
                <div className="contact-hint">Подписаться на канал</div>
              </a>
              
              <a href="https://t.me/VisitCardIlyaBormotov_Bot" target="_blank" rel="noopener noreferrer" className="contact-card">
                <div className="contact-icon">🤖</div>
                <h3>Бот</h3>
                <p>Визитная карточка</p>
                <div className="contact-hint">Открыть бота</div>
              </a>
            </div>
          </section>

          {/* Реквизиты */}
          <section className="profile-section">
            <h2>Реквизиты организации</h2>
            <div className="requisites-info">
              <div className="requisite-item">
                <span className="requisite-label">ИП:</span>
                <span className="requisite-value">Бормотов Илья Михайлович</span>
              </div>
              <div className="requisite-item">
                <span className="requisite-label">ИНН:</span>
                <span className="requisite-value">Укажите ваш ИНН</span>
              </div>
              <div className="requisite-item">
                <span className="requisite-label">ОГРНИП:</span>
                <span className="requisite-value">Укажите ваш ОГРНИП</span>
              </div>
            </div>
            <div className="requisites-note">
              <p>Полные реквизиты предоставляются при заключении договора</p>
            </div>
          </section>

          {/* Кнопка консультации */}
          <div className="consultation-section">
            <button className="profile-consultation-btn" onClick={handleConsultation}>
              Получить бесплатную консультацию
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
