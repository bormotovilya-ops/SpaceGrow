import React, { useState, useEffect } from 'react'
import Header from './Header'
import './Profile.css'

function Profile({ onBack, onAvatarClick, onDiagnostics }) {
  const [typingMessages, setTypingMessages] = useState([false, false, false]) // Показывать многоточие
  const [visibleMessages, setVisibleMessages] = useState([false, false, false]) // Показывать текст
  const [expandedCases, setExpandedCases] = useState([false, false, false]) // Раскрытые кейсы
  const [expandedTechStack, setExpandedTechStack] = useState([false, false, false, false]) // Раскрытый технологический стек
  
  const handleConsultation = () => {
    if (onDiagnostics) {
      onDiagnostics()
    } else {
      window.open('https://t.me/ilyaborm', '_blank')
    }
  }

  const handleHeaderAvatarClick = () => {
    // Если передан обработчик, вызываем его, иначе просто возвращаемся назад
    if (onAvatarClick) {
      onAvatarClick()
    } else {
      onBack()
    }
  }

  const toggleCase = (index) => {
    const newExpanded = [...expandedCases]
    newExpanded[index] = !newExpanded[index]
    setExpandedCases(newExpanded)
  }

  const toggleTechStack = (index) => {
    const newExpanded = [...expandedTechStack]
    newExpanded[index] = !newExpanded[index]
    setExpandedTechStack(newExpanded)
  }

  useEffect(() => {
    // Первое сообщение: показываем многоточие сразу
    setTypingMessages([true, false, false])
    
    // Через 2 секунды показываем текст первого сообщения
    const timer1 = setTimeout(() => {
      setVisibleMessages([true, false, false])
      setTypingMessages([false, false, false])
      // Начинаем печатать второе сообщение
      setTypingMessages([false, true, false])
    }, 2000)
    
    // Через 4 секунды (2 + 2) показываем текст второго сообщения
    const timer2 = setTimeout(() => {
      setVisibleMessages([true, true, false])
      setTypingMessages([false, false, false])
      // Начинаем печатать третье сообщение
      setTypingMessages([false, false, true])
    }, 4000)
    
    // Через 6 секунд (4 + 2) показываем текст третьего сообщения
    const timer3 = setTimeout(() => {
      setVisibleMessages([true, true, true])
      setTypingMessages([false, false, false])
    }, 6000)
    
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [])

  return (
    <div className="profile-container">
      <Header 
        onAvatarClick={handleHeaderAvatarClick}
        onConsultation={handleConsultation}
        onBack={onBack}
      />
      
      <div className="profile-content">
        <div className="profile-sections">
          {/* Описание про АИЦП */}
          <section className="profile-section profile-intro-section">
            <div className="profile-intro-content">
              <div className="profile-dialog-container">
                <div className="profile-avatar-wrapper">
                  <img src="/images/me.jpg" alt="Илья Бормотов" className="profile-avatar-large" />
                </div>
                <div className="profile-dialog-messages">
                  <div className={`dialog-message ${(typingMessages[0] || visibleMessages[0]) ? 'visible' : ''}`}>
                    {typingMessages[0] ? (
                      <p className="typing-indicator">
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                      </p>
                    ) : visibleMessages[0] ? (
                      <p>Меня зовут Бормотов Илья, я архитектор АИЦП.</p>
                    ) : null}
                  </div>
                  <div className={`dialog-message ${(typingMessages[1] || visibleMessages[1]) ? 'visible' : ''}`}>
                    {typingMessages[1] ? (
                      <p className="typing-indicator">
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                      </p>
                    ) : visibleMessages[1] ? (
                      <p>Работаю с экспертами и онлайн-школами с доходом от 200 тысяч и довожу до 1–2 миллионов в месяц.</p>
                    ) : null}
                  </div>
                  <div className={`dialog-message ${(typingMessages[2] || visibleMessages[2]) ? 'visible' : ''}`}>
                    {typingMessages[2] ? (
                      <p className="typing-indicator">
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                      </p>
                    ) : visibleMessages[2] ? (
                      <p>Ниже подробнее описаны мои компетенции, кейсы, достижения, подход и контакты</p>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="profile-aicp-explanation">
                <p className="profile-aicp-answer">
                  <strong>АИЦП</strong> - Автоматизированные интеллектуальные цепочки продаж.
                </p>
              </div>
            </div>
          </section>

          {/* Кейсы */}
          <section className="profile-section">
            <h2>Кейсы</h2>
            <div className="cases-cards-grid">
              {/* Карточка 1: Инфобизнес и EdTech */}
              <div className={`case-main-card ${expandedCases[0] ? 'expanded' : ''}`}>
                <div className="case-main-card-image" onClick={() => toggleCase(0)}>
                  <img src="/images/1.png" alt="Инфобизнес и EdTech" />
                </div>
                <div className="case-main-card-header" onClick={() => toggleCase(0)}>
                  <h3 className="case-main-card-title">Инфобизнес и EdTech</h3>
                  <span className={`case-toggle-icon ${expandedCases[0] ? 'expanded' : ''}`}>▼</span>
                </div>
                <div className={`case-main-card-content ${expandedCases[0] ? 'expanded' : ''}`}>
                  <p className="case-main-card-description">
                    Комплексная автоматизация обучения: от продающих лендингов до настройки GetCourse и ботов-помощников.
                  </p>
                  <div className="case-main-card-links">
                    <div className="case-link-group">
                      <strong>Лендинги на GetCourse:</strong>
                    <ul>
                      <li><a href="https://vyoga.ru/elementor-%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3-1965" target="_blank" rel="noopener noreferrer">Общий лендинг: Йога и Цигун</a></li>
                      <li><a href="https://vyoga.ru/elementor-%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3-1984/" target="_blank" rel="noopener noreferrer">Курс «Дао женского здоровья»</a></li>
                      <li><a href="https://vyoga.ru/elementor-%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3-1887/" target="_blank" rel="noopener noreferrer">Программа «Здоровая спина»</a></li>
                      <li><a href="https://vyoga.ru/elementor-%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3-1945/" target="_blank" rel="noopener noreferrer">Курс «Здоровье нервной системы»</a></li>
                    </ul>
                  </div>
                  <div className="case-link-group">
                    <strong>Сайты:</strong>
                    <ul>
                      <li><a href="https://doshatest.ru" target="_blank" rel="noopener noreferrer">Сайт-тест по Аюрведе (DoshaTest)</a></li>
                    </ul>
                  </div>
                  <div className="case-link-group">
                    <strong>Видеокурсы в боте:</strong>
                    <ul>
                      <li><a href="https://t.me/meditasiya_bot" target="_blank" rel="noopener noreferrer">Бот по медитациям</a></li>
                      <li><a href="https://t.me/V_Yoga_Bot" target="_blank" rel="noopener noreferrer">Бот по йоге и цигун</a></li>
                      <li><a href="https://t.me/VocallessonsLaika_Bot" target="_blank" rel="noopener noreferrer">Уроки вокала</a></li>
                    </ul>
                  </div>
                  <div className="case-link-group">
                    <strong>GetCourse:</strong>
                    <ul>
                      <li><a href="https://rcdway.ru/" target="_blank" rel="noopener noreferrer">Обучение руководителей для rcdway.ru</a></li>
                      <li><a href="https://vyoga.ru/elementor-%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3-1965" target="_blank" rel="noopener noreferrer">Курсы по йоге для vyoga.ru</a></li>
                    </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Карточка 2: Маркетинг и Mini Apps */}
              <div className={`case-main-card ${expandedCases[1] ? 'expanded' : ''}`}>
                <div className="case-main-card-image" onClick={() => toggleCase(1)}>
                  <img src="/images/2.png" alt="Маркетинг и Mini Apps" />
                </div>
                <div className="case-main-card-header" onClick={() => toggleCase(1)}>
                  <h3 className="case-main-card-title">Маркетинг и Mini Apps</h3>
                  <span className={`case-toggle-icon ${expandedCases[1] ? 'expanded' : ''}`}>▼</span>
                </div>
                <div className={`case-main-card-content ${expandedCases[1] ? 'expanded' : ''}`}>
                  <p className="case-main-card-description">
                    Современные WebApp-интерфейсы внутри Telegram и воронки продаж, которые превращают подписчиков в покупателей.
                  </p>
                  <div className="case-main-card-links">
                    <div className="case-link-group">
                      <strong>Showcase:</strong>
                    <ul>
                      <li><a href="https://miniappvizitka.vercel.app/" target="_blank" rel="noopener noreferrer">Визитка MiniApp</a></li>
                      <li><a href="https://telegram.me/krasota_vostoka_bot" target="_blank" rel="noopener noreferrer">Магазин чая</a></li>
                    </ul>
                  </div>
                  <div className="case-link-group">
                    <strong>Воронки:</strong>
                    <ul>
                      <li><a href="https://telegram.me/weinihaoru_bot" target="_blank" rel="noopener noreferrer">Школа китайского (1000+ чел)</a></li>
                      <li><a href="https://telegram.me/SafeSaleLawBot" target="_blank" rel="noopener noreferrer">Юридические эксперты</a></li>
                      <li><a href="https://telegram.me/logachev_legal_bot" target="_blank" rel="noopener noreferrer">Юридические услуги для бизнеса</a></li>
                    </ul>
                  </div>
                  <div className="case-link-group">
                    <strong>Events:</strong>
                    <ul>
                      <li><a href="https://t.me/kidcodes_music_bot" target="_blank" rel="noopener noreferrer">Запись на концерты</a></li>
                      <li><a href="https://t.me/FDatingPermBot" target="_blank" rel="noopener noreferrer">Бот знакомств</a></li>
                    </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Карточка 3: Автоматизация и B2B (1С) */}
              <div className={`case-main-card ${expandedCases[2] ? 'expanded' : ''}`}>
                <div className="case-main-card-image" onClick={() => toggleCase(2)}>
                  <img src="/images/3.png" alt="Автоматизация и B2B" />
                </div>
                <div className="case-main-card-header" onClick={() => toggleCase(2)}>
                  <h3 className="case-main-card-title">Автоматизация и B2B (1С)</h3>
                  <span className={`case-toggle-icon ${expandedCases[2] ? 'expanded' : ''}`}>▼</span>
                </div>
                <div className={`case-main-card-content ${expandedCases[2] ? 'expanded' : ''}`}>
                  <p className="case-main-card-description">
                    Сложные технические решения для интеграции мессенджеров с корпоративным ПО и учетными системами.
                  </p>
                  <div className="case-main-card-links">
                    <div className="case-link-group">
                      <strong>ТКО-Сервис:</strong>
                    <ul>
                      <li><a href="https://t.me/ProTKObot" target="_blank" rel="noopener noreferrer">Система учета на базе 1С (1.5+ года работы, 1000+ чел)</a></li>
                    </ul>
                  </div>
                  <div className="case-link-group">
                    <strong>Экосистема для стройки:</strong>
                    <ul>
                      <li><a href="https://telegram.me/PriemkaGarantBot" target="_blank" rel="noopener noreferrer">Приемка</a></li>
                      <li><a href="https://telegram.me/reclamation_kv_bot" target="_blank" rel="noopener noreferrer">Рекламации</a></li>
                      <li><a href="https://telegram.me/BuildOrdersBot" target="_blank" rel="noopener noreferrer">Закупки</a></li>
                      <li><a href="https://telegram.me/AccessStroyBot" target="_blank" rel="noopener noreferrer">QR-проходная</a></li>
                    </ul>
                  </div>
                  <div className="case-link-group">
                    <strong>Запись на услуги:</strong>
                    <ul>
                      <li><a href="https://telegram.me/BeautyWitchBot" target="_blank" rel="noopener noreferrer">Бот для кабинета косметолога</a></li>
                    </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cases-note">
              <p>Больше кейсов на <a href="https://t.me/SoulGuideIT" target="_blank" rel="noopener noreferrer">https://t.me/SoulGuideIT</a></p>
            </div>
          </section>

          {/* Компетенции */}
          <section className="profile-section">
            <h2>Технологический стек</h2>
            <div className="tech-stack-grid">
              <div className={`tech-stack-card ${expandedTechStack[0] ? 'expanded' : ''}`}>
                <div className="tech-stack-icon" onClick={() => toggleTechStack(0)}>
                  <img src="/images/11.jpg" alt="Web-разработка" />
                </div>
                <div className="tech-stack-header" onClick={() => toggleTechStack(0)}>
                  <h3>Web-разработка</h3>
                  <span className={`tech-toggle-icon ${expandedTechStack[0] ? 'expanded' : ''}`}>▼</span>
                </div>
                <div className={`tech-stack-content ${expandedTechStack[0] ? 'expanded' : ''}`}>
                  <p>Создание лендингов и многостраничных сайтов как на конструкторах, так и кастомных решений для высокой скорости загрузки.</p>
                  
                  <div className="tech-stack-section">
                    <strong>Инструменты и технологии:</strong> Tilda, Wordpress, Taplink, GetCourse, React/Vercel, C#, MS Visual Studio, VBA.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Аналитика и проектирование:</strong> Системный анализ, Figma (макеты экранов), UML (модели бизнес-объектов).
                  </div>

                  <div className="tech-stack-section">
                    <strong>Документация:</strong> Разработка бизнес-требований, ТЗ и проектной документации.
                  </div>
                </div>
              </div>
              <div className={`tech-stack-card ${expandedTechStack[1] ? 'expanded' : ''}`}>
                <div className="tech-stack-icon" onClick={() => toggleTechStack(1)}>
                  <img src="/images/22.jpg" alt="Telegram Mini Apps" />
                </div>
                <div className="tech-stack-header" onClick={() => toggleTechStack(1)}>
                  <h3>Telegram Mini Apps</h3>
                  <span className={`tech-toggle-icon ${expandedTechStack[1] ? 'expanded' : ''}`}>▼</span>
                </div>
                <div className={`tech-stack-content ${expandedTechStack[1] ? 'expanded' : ''}`}>
                  <p>Разработка интерфейсов внутри мессенджера, которые заменяют полноценные мобильные приложения и сайты.</p>
                  
                  <div className="tech-stack-section">
                    <strong>Платформы и языки:</strong> Python, LeadTeh, BotHelp, SaleBot.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Интеграции:</strong> Работа с API, XML, XSD.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Опыт:</strong> Реализовано более 20 ботов и Mini Apps для различных ниш бизнеса.
                  </div>
                </div>
              </div>
              <div className={`tech-stack-card ${expandedTechStack[2] ? 'expanded' : ''}`}>
                <div className="tech-stack-icon" onClick={() => toggleTechStack(2)}>
                  <img src="/images/33.jpg" alt="Автоматизация EdTech" />
                </div>
                <div className="tech-stack-header" onClick={() => toggleTechStack(2)}>
                  <h3>Автоматизация EdTech</h3>
                  <span className={`tech-toggle-icon ${expandedTechStack[2] ? 'expanded' : ''}`}>▼</span>
                </div>
                <div className={`tech-stack-content ${expandedTechStack[2] ? 'expanded' : ''}`}>
                  <p>Полная настройка платформы GetCourse, сборка автоворонок, интеграция платежей и CRM-систем.</p>
                  
                  <div className="tech-stack-section">
                    <strong>Ключевая платформа:</strong> GetCourse.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Методология:</strong> Связка «методолог → технический специалист» для реализации программ обучения.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Процессы:</strong> Сборка автоворонок, настройка викторин и игр для вовлечения студентов на сайте.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Управление:</strong> Использование Jira и Wiki для ведения проектов.
                  </div>
                </div>
              </div>
              <div className={`tech-stack-card ${expandedTechStack[3] ? 'expanded' : ''}`}>
                <div className="tech-stack-icon" onClick={() => toggleTechStack(3)}>
                  <img src="/images/44.jpg" alt="Системная интеграция" />
                </div>
                <div className="tech-stack-header" onClick={() => toggleTechStack(3)}>
                  <h3>Системная интеграция</h3>
                  <span className={`tech-toggle-icon ${expandedTechStack[3] ? 'expanded' : ''}`}>▼</span>
                </div>
                <div className={`tech-stack-content ${expandedTechStack[3] ? 'expanded' : ''}`}>
                  <p>Связка сайтов и ботов с внутренним ПО бизнеса для полной автоматизации отчетности.</p>
                  
                  <div className="tech-stack-section">
                    <strong>Базы данных:</strong> MS SQL, Oracle (PL/SQL), PostgreSQL, проектирование витрин данных.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Бизнес-софт:</strong> 1С: Бухгалтерия, 1C: Зарплата и кадры, интеграция ботов с системами 1С.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Инструменты анализа:</strong> Bizagi Modeler (BPMN 2.0), PowerDesigner, TOAD, TFS.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Обмен данными:</strong> MQ (очереди сообщений), работа со сторонними API.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Достижения */}
          <section className="profile-section">
            <h2>Достижения</h2>
            <div className="achievements-grid">
              <div className="achievement-card">
                <div className="achievement-number">19+</div>
                <h3>Лет в IT, из них 15 лет в Enterprise</h3>
                <p>Руководил IT-проектами для ЦБ РФ и Минздрава.</p>
              </div>
              <div className="achievement-card">
                <div className="achievement-number">1 млрд. ₽ +</div>
                <h3>Суммарный бюджет систем</h3>
                <p>разработанных под моим управлением.</p>
              </div>
              <div className="achievement-card">
                <div className="achievement-number">30+</div>
                <h3>Внедренных экосистем</h3>
                <p>Запустил более 30 ботов и автоворонок за последние 3 года.</p>
              </div>
              <div className="achievement-card">
                <div className="achievement-number">500к ₽</div>
                <h3>Максимальный чек за одного бота</h3>
                <p>Я создаю сложные активы, а не просто чат-ботов.</p>
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
