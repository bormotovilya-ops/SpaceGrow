import React, { useState, useRef, useEffect } from 'react'
import './ChatBot.css'

function ChatBot({ onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Привет! Я виртуальный помощник Ильи Бормотова. Могу ответить на вопросы о его услугах, опыте и подходе к работе. Что вас интересует?'
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Фокус на поле ввода при открытии
    inputRef.current?.focus()
  }, [])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    
    // Добавляем сообщение пользователя
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Извините, произошла ошибка. Попробуйте позже или свяжитесь напрямую: @ilyaborm в Telegram.'
        }])
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Не удалось подключиться к серверу. Проверьте, что backend запущен, или свяжитесь напрямую: @ilyaborm в Telegram.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chatbot-overlay" onClick={onClose}>
      <div className="chatbot-container" onClick={(e) => e.stopPropagation()}>
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <div className="chatbot-avatar">
              <img src="/images/me.jpg" alt="Илья Бормотов" />
            </div>
            <div>
              <h3 className="chatbot-title">Виртуальный помощник</h3>
              <p className="chatbot-subtitle">Илья Бормотов</p>
            </div>
          </div>
          <button className="chatbot-close-btn" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="chatbot-messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`chatbot-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              {message.role === 'assistant' && (
                <div className="message-avatar">
                  <img src="/images/me.jpg" alt="Илья" />
                </div>
              )}
              <div className="message-content">
                <p>{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="chatbot-message assistant-message">
              <div className="message-avatar">
                <img src="/images/me.jpg" alt="Илья" />
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chatbot-input-container">
          <input
            ref={inputRef}
            type="text"
            className="chatbot-input"
            placeholder="Задайте вопрос..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button
            className="chatbot-send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            aria-label="Отправить"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatBot
