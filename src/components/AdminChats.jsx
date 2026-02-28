import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../utils/supabaseClient'
import Header from './Header'
import './AdminChats.css'

function AdminChats({ onBack, onHomeClick, onAvatarClick, onConsultation, onAlchemyClick }) {
  const navigate = useNavigate()
  const [chats, setChats] = useState([])           // { tg_user_id, lastMessage, lastAt }
  const [userProfiles, setUserProfiles] = useState({}) // tg_user_id -> { first_name, last_name, username }
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [messages, setMessages] = useState([])
  const [deliveryStatuses, setDeliveryStatuses] = useState({}) // delivery_id -> 'pending' | 'sent'
  const [inputText, setInputText] = useState('')
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)
  const deliveryChannelRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Загрузка списка уникальных пользователей (превью последнего сообщения)
  const loadChats = useCallback(async () => {
    setLoadingChats(true)
    setError(null)
    try {
      const supabase = await getSupabase()
      if (!supabase) {
        setError('Supabase не настроен')
        return
      }
      const { data, error: e } = await supabase
        .from('user_chat_messages')
        .select('tg_user_id, message_text, created_at, direction')
        .order('created_at', { ascending: false })
      if (e) {
        setError(e.message || 'Ошибка загрузки чатов')
        return
      }
      const byUser = new Map()
      for (const row of data || []) {
        const id = row.tg_user_id
        if (!byUser.has(id)) {
          byUser.set(id, {
            tg_user_id: id,
            lastMessage: row.message_text || '',
            lastAt: row.created_at,
          })
        }
      }
      const chatList = Array.from(byUser.values()).sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''))
      setChats(chatList)

      // Загрузка имён/фамилий/username из users
      const userIds = chatList.map((c) => c.tg_user_id).filter(Boolean)
      if (userIds.length > 0) {
        const { data: profileRows } = await supabase
          .from('users')
          .select('user_id, first_name, last_name, username')
          .in('user_id', userIds)
        const profiles = {}
        for (const r of profileRows || []) {
          profiles[r.user_id] = {
            first_name: r.first_name ?? '',
            last_name: r.last_name ?? '',
            username: r.username ?? '',
          }
        }
        setUserProfiles(profiles)
      } else {
        setUserProfiles({})
      }
    } catch (err) {
      setError(err?.message || 'Ошибка загрузки')
    } finally {
      setLoadingChats(false)
    }
  }, [])

  // Загрузка истории по выбранному пользователю
  const loadMessages = useCallback(async (tgUserId) => {
    if (!tgUserId) {
      setMessages([])
      return
    }
    setLoadingMessages(true)
    setError(null)
    try {
      const supabase = await getSupabase()
      if (!supabase) return
      const { data, error: e } = await supabase
        .from('user_chat_messages')
        .select('id, tg_user_id, direction, message_text, source, created_at, delivery_id')
        .eq('tg_user_id', tgUserId)
        .order('created_at', { ascending: true })
      if (e) {
        setError(e.message || 'Ошибка загрузки сообщений')
        return
      }
      setMessages(data || [])

      const deliveryIds = (data || []).filter((m) => m.delivery_id).map((m) => m.delivery_id)
      if (deliveryIds.length > 0) {
        const { data: deliveries } = await supabase
          .from('user_message_delivery')
          .select('id, status')
          .in('id', deliveryIds)
        const statusMap = {}
        for (const d of deliveries || []) {
          statusMap[d.id] = d.status
        }
        setDeliveryStatuses(statusMap)
      } else {
        setDeliveryStatuses({})
      }
    } catch (err) {
      setError(err?.message || 'Ошибка загрузки')
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    loadChats()
  }, [loadChats])

  useEffect(() => {
    if (selectedUserId) loadMessages(selectedUserId)
    else setMessages([])
  }, [selectedUserId, loadMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Realtime: подписка на user_chat_messages
  useEffect(() => {
    let sub
    ;(async () => {
      const supabase = await getSupabase()
      if (!supabase || !selectedUserId) return
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      sub = supabase
        .channel('admin-chats-messages')
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'user_chat_messages',
            event: '*',
            filter: `tg_user_id=eq.${selectedUserId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              setMessages((prev) => {
                const has = prev.some((m) => m.id === payload.new.id)
                if (has) return prev
                const next = [...prev, payload.new].sort(
                  (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
                )
                return next
              })
            }
            loadChats()
          }
        )
        .subscribe()
      channelRef.current = sub
    })()
    return () => {
      if (channelRef.current) {
        getSupabase().then((sb) => sb?.removeChannel(channelRef.current))
        channelRef.current = null
      }
    }
  }, [selectedUserId, loadChats])

  // Realtime: подписка на user_message_delivery для индикатора статуса
  useEffect(() => {
    let sub
    ;(async () => {
      const supabase = await getSupabase()
      if (!supabase) return
      if (deliveryChannelRef.current) {
        await supabase.removeChannel(deliveryChannelRef.current)
        deliveryChannelRef.current = null
      }
      sub = supabase
        .channel('admin-chats-delivery')
        .on(
          'postgres_changes',
          { schema: 'public', table: 'user_message_delivery', event: 'UPDATE' },
          (payload) => {
            const id = payload.new?.id
            const status = payload.new?.status
            if (id != null && status) {
              setDeliveryStatuses((prev) => ({ ...prev, [id]: status }))
            }
          }
        )
        .subscribe()
      deliveryChannelRef.current = sub
    })()
    return () => {
      if (deliveryChannelRef.current) {
        getSupabase().then((sb) => sb?.removeChannel(deliveryChannelRef.current))
        deliveryChannelRef.current = null
      }
    }
  }, [])

  const handleSend = useCallback(async () => {
    const text = (inputText || '').trim()
    if (!text || !selectedUserId) return
    setSending(true)
    setError(null)
    try {
      const supabase = await getSupabase()
      if (!supabase) {
        setError('Supabase не настроен')
        return
      }
      const { data, error: rpcError } = await supabase.rpc('Messages', {
        p_tg_user_id: selectedUserId,
        p_text: text,
      })
      if (rpcError) {
        setError(rpcError.message || 'Ошибка отправки')
        return
      }
      setInputText('')
      if (data?.delivery_id) {
        setDeliveryStatuses((prev) => ({ ...prev, [data.delivery_id]: 'pending' }))
      }
      await loadMessages(selectedUserId)
      await loadChats()
    } catch (err) {
      setError(err?.message || 'Ошибка отправки')
    } finally {
      setSending(false)
    }
  }, [selectedUserId, inputText, loadMessages, loadChats])

  const sourceLabel = (source) => {
    if (source === 'manual') return 'Админ'
    if (source === 'bot') return 'Бот'
    return 'Пользователь'
  }

  // Имя для отображения: "Имя Фамилия" и/или "@username", иначе ID
  const getChatDisplayName = (tgUserId) => {
    const id = tgUserId
    const p = userProfiles[id]
    const parts = []
    if (p) {
      const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
      if (fullName) parts.push(fullName)
      if (p.username) parts.push(`@${p.username}`)
    }
    if (parts.length > 0) return parts.join(' · ')
    return `ID: ${id}`
  }

  const getChatTitleFull = (tgUserId) => {
    const id = tgUserId
    const p = userProfiles[id]
    const namePart = getChatDisplayName(id)
    return namePart.startsWith('ID:') ? namePart : `${namePart} (ID: ${id})`
  }

  return (
    <div className="admin-chats-page">
      <Header
        onAvatarClick={onAvatarClick || (() => navigate('/profile'))}
        onConsultation={onConsultation || (() => navigate('/diagnostics'))}
        onBack={onBack || (() => navigate('/admin'))}
        onAlchemyClick={onAlchemyClick || (() => navigate('/alchemy'))}
        onHomeClick={onHomeClick || (() => navigate('/home'))}
        activeMenuId={null}
      />
      <header className="admin-chats-header">
        <button type="button" className="admin-chats-back" onClick={() => (onBack ? onBack() : navigate('/admin'))}>
          ← В админку
        </button>
        <h1 className="admin-chats-title">Чаты</h1>
      </header>

      <div className="admin-chats-layout">
        <aside className="admin-chats-sidebar">
          {loadingChats && <div className="admin-chats-loading">Загрузка чатов…</div>}
          {!loadingChats && chats.length === 0 && <div className="admin-chats-empty">Нет чатов</div>}
          {!loadingChats &&
            chats.map((chat) => (
              <button
                type="button"
                key={chat.tg_user_id}
                className={`admin-chats-sidebar-item ${selectedUserId === chat.tg_user_id ? 'active' : ''}`}
                onClick={() => setSelectedUserId(chat.tg_user_id)}
              >
                <span className="admin-chats-sidebar-user-id">{getChatDisplayName(chat.tg_user_id)}</span>
                <span className="admin-chats-sidebar-preview">
                  {(chat.lastMessage || '').slice(0, 60)}
                  {(chat.lastMessage || '').length > 60 ? '…' : ''}
                </span>
              </button>
            ))}
        </aside>

        <main className="admin-chats-main">
          {!selectedUserId && (
            <div className="admin-chats-placeholder">Выберите чат в списке</div>
          )}
          {selectedUserId && (
            <>
              <div className="admin-chats-main-header">Чат: {getChatTitleFull(selectedUserId)}</div>
              {error && <div className="admin-chats-error">{error}</div>}
              {loadingMessages && <div className="admin-chats-loading">Загрузка сообщений…</div>}
              <div className="admin-chats-messages">
                {!loadingMessages &&
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`admin-chats-msg ${msg.direction === 'inbound' ? 'inbound' : 'outbound'}`}
                    >
                      <div className="admin-chats-msg-bubble">
                        {msg.direction === 'outbound' && (
                          <span className="admin-chats-msg-source">{sourceLabel(msg.source)}</span>
                        )}
                        <div className="admin-chats-msg-text">{msg.message_text}</div>
                        <div className="admin-chats-msg-meta">
                          <span className="admin-chats-msg-time">
                            {msg.created_at
                              ? new Date(msg.created_at).toLocaleString('ru-RU', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                          {msg.direction === 'outbound' && msg.delivery_id != null && (
                            <span className="admin-chats-msg-status" title={deliveryStatuses[msg.delivery_id] === 'sent' ? 'Отправлено' : 'В очереди'}>
                              {deliveryStatuses[msg.delivery_id] === 'sent' ? (
                                <span className="admin-chats-status-icon sent">✓</span>
                              ) : (
                                <span className="admin-chats-status-icon pending">🕐</span>
                              )}
                            </span>
                          )}
                        </div>
                        {msg.direction === 'inbound' && (
                          <span className="admin-chats-msg-source inbound-label">{sourceLabel(msg.source)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="admin-chats-input-row">
                <input
                  type="text"
                  className="admin-chats-input"
                  placeholder="Сообщение…"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={sending}
                />
                <button
                  type="button"
                  className="admin-chats-send"
                  onClick={handleSend}
                  disabled={sending || !inputText.trim()}
                >
                  {sending ? '…' : 'Отправить'}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default AdminChats
