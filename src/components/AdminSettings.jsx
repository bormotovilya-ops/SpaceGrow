import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../utils/supabaseClient'
import Header from './Header'
import Switch from './ui/Switch'
import './AdminSettings.css'

/** Формат настройки от get_all_bot_settings: { key, value, value_type, description } */
const VALUE_TYPES = { boolean: 'boolean', number: 'number', text: 'text' }

function AdminSettings({ onBack, onHomeClick, onAvatarClick, onConsultation, onAlchemyClick }) {
  const navigate = useNavigate()
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [savingKey, setSavingKey] = useState(null)

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError })
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [])

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = await getSupabase()
      if (!supabase) {
        setError('Supabase не настроен')
        return
      }
      const { data, error: rpcError } = await supabase.rpc('get_all_bot_settings')
      if (rpcError) {
        setError(rpcError.message || 'Ошибка загрузки настроек')
        return
      }
      setSettings(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const updateSetting = useCallback(async (key, value) => {
    setSavingKey(key)
    try {
      const supabase = await getSupabase()
      if (!supabase) {
        showToast('Supabase не настроен', true)
        return
      }
      const { error: rpcError } = await supabase.rpc('update_bot_setting', {
        p_key: key,
        p_value: value
      })
      if (rpcError) {
        showToast(rpcError.message || 'Ошибка сохранения', true)
        return
      }
      showToast('Сохранено')
      setSettings((prev) =>
        prev.map((s) => (s.key === key ? { ...s, value } : s))
      )
    } catch (e) {
      showToast(e?.message || 'Ошибка сохранения', true)
    } finally {
      setSavingKey(null)
    }
  }, [showToast])

  /**
   * Рендер поля по value_type: boolean -> Switch, number -> Input number, text -> Input text.
   * При изменении вызывается update_bot_setting (значение в формате jsonb).
   */
  const renderSettingInput = useCallback(
    (setting) => {
      const { key, value, value_type, description } = setting
      const isSaving = savingKey === key

      switch (value_type) {
        case VALUE_TYPES.boolean: {
          const checked = value === true || value === 'true' || value === 1
          return (
            <Switch
              checked={checked}
              disabled={isSaving}
              onCheckedChange={(checked) => updateSetting(key, checked)}
            />
          )
        }
        case VALUE_TYPES.number: {
          const num = value != null && value !== '' ? Number(value) : ''
          return (
            <input
              type="number"
              className="admin-settings-input"
              value={num}
              disabled={isSaving}
              onChange={(e) => {
                const v = e.target.value
                const parsed = v === '' ? null : (e.target.valueAsNumber ?? Number(v))
                setSettings((prev) =>
                  prev.map((s) => (s.key === key ? { ...s, value: parsed } : s))
                )
              }}
              onBlur={(e) => {
                const v = e.target.value
                if (v === '') {
                  updateSetting(key, null)
                } else {
                  const parsed = e.target.valueAsNumber ?? Number(v)
                  if (!Number.isNaN(parsed)) updateSetting(key, parsed)
                }
              }}
            />
          )
        }
        case VALUE_TYPES.text:
        default: {
          const str = value != null ? String(value) : ''
          return (
            <input
              type="text"
              className="admin-settings-input"
              value={str}
              disabled={isSaving}
              onChange={(e) =>
                setSettings((prev) =>
                  prev.map((s) => (s.key === key ? { ...s, value: e.target.value } : s))
                )
              }
              onBlur={(e) => updateSetting(key, e.target.value)}
            />
          )
        }
      }
    },
    [updateSetting, savingKey]
  )

  return (
    <div className="admin-settings-page">
      <Header
        onAvatarClick={onAvatarClick || (() => navigate('/profile'))}
        onConsultation={onConsultation || (() => navigate('/diagnostics'))}
        onBack={onBack || (() => navigate('/admin'))}
        onAlchemyClick={onAlchemyClick || (() => navigate('/alchemy'))}
        onHomeClick={onHomeClick || (() => navigate('/home'))}
        activeMenuId={null}
      />
      <header className="admin-settings-header">
        <button type="button" className="admin-settings-back" onClick={() => (onBack ? onBack() : navigate('/admin'))}>
          ← В админку
        </button>
        <h1 className="admin-settings-title">Настройки бота</h1>
      </header>

      {loading && <div className="admin-settings-loading">Загрузка настроек…</div>}
      {error && <div className="admin-settings-error">{error}</div>}

      {!loading && !error && (
        <div className="admin-settings-list">
            {settings.length === 0 ? (
              <p className="admin-settings-empty">Нет настроек</p>
            ) : (
            settings.map((setting) => (
              <div key={setting.key} className="admin-settings-card">
                <div className="admin-settings-card-left">
                  <div className="admin-settings-name">{setting.key}</div>
                  {setting.description && (
                    <div className="admin-settings-description">{setting.description}</div>
                  )}
                </div>
                <div className="admin-settings-card-right">
                  {renderSettingInput(setting)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {toast && (
        <div className={`admin-settings-toast ${toast.isError ? 'admin-settings-toast-error' : ''}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default AdminSettings
