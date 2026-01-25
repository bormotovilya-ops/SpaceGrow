import React, { useState, useEffect } from 'react'
import SalesFunnel from './components/SalesFunnel'
import CenterPhoto from './components/CenterPhoto'
import MenuItem from './components/MenuItem'
import Sidebar from './components/Sidebar'
import SessionInitializer from './components/SessionInitializer'
import LoggingWrapper, { PageLogger } from './components/LoggingWrapper'
import './App.css'

const menuItems = [
  {
    id: 1,
    image: '/images/item1.jpg',
    title: '',
    sidebarTitle: 'Что я делаю',
    sidebarItems: [
      'Автоматизированные цепочки продаж',
      'Сайты и лендинги',
      'Воронки продаж',
      'Обучающие курсы (боты/GetCourse)',
      'Интеграция всех элементов'
    ]
  },
  {
    id: 2,
    image: '/images/item2.jpg',
    title: '',
    sidebarTitle: 'Портфолио',
    sidebarItems: [
      'Реализованные цепочки продаж',
      'Кейсы онлайн-обучения',
      'Воронки с результатами',
      'Интегрированные системы'
    ]
  },
  {
    id: 3,
    image: '/images/item3.jpg',
    title: 'Обо мне',
    sidebarTitle: 'Отзывы',
    sidebarItems: [
      'Клиенты о работе',
      'Видео-отзывы',
      'Кейсы до/после',
      'Результаты проектов'
    ]
  },
  {
    id: 4,
    image: '/images/item4.jpg',
    title: '',
    sidebarTitle: 'Контакты',
    sidebarItems: [
      'Telegram: @ilyaborm',
      'Канал',
      'Мой сайт',
      'VK'
    ]
  },
  {
    id: 5,
    image: '/images/item5.jpg',
    title: 'Бонус',
    sidebarTitle: 'Обо мне',
    sidebarItems: [
      'Архитектор цепочек продаж',
      'Мой подход',
      'Философия работы',
      'Почему это работает'
    ]
  },
  {
    id: 6,
    image: '/images/item6.jpg',
    title: 'Как это работает',
    sidebarTitle: 'Технологии',
    sidebarItems: [
      'Автоматизация процессов',
      'AI-интеграции',
      'Telegram-боты',
      'Платформы обучения',
      'Аналитика и оптимизация'
    ]
  }
]

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarTitle, setSidebarTitle] = useState('')
  const [sidebarItems, setSidebarItems] = useState([])

  const handleMenuClick = (title, items) => {
    setSidebarTitle(title)
    setSidebarItems(items)
    setSidebarOpen(true)
  }

  const handleCloseSidebar = () => {
    setSidebarOpen(false)
  }

  // Переключатель между старой версией и воронкой
  const [showFunnel, setShowFunnel] = useState(true)

  return (
    <SessionInitializer>
      <PageLogger pageId="main" pageTitle="Main Page">
        <div className="container">
          {showFunnel ? (
            <SalesFunnel />
          ) : (
            <>
              <CenterPhoto />

              {menuItems.map((item, index) => (
                <MenuItem
                  key={item.id}
                  image={item.image}
                  title={item.title}
                  index={index}
                  total={menuItems.length}
                  onClick={() => handleMenuClick(item.sidebarTitle, item.sidebarItems)}
                />
              ))}

              <Sidebar
                isOpen={sidebarOpen}
                title={sidebarTitle}
                items={sidebarItems}
                onClose={handleCloseSidebar}
              />
            </>
          )}
        </div>
      </PageLogger>
    </SessionInitializer>
  )
}

export default App

