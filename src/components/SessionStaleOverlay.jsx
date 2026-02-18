import React from 'react';

/**
 * Оверлей «сессия устарела»: показывается после долгой неактивности в Telegram Mini App.
 * Предлагает перезагрузить страницу или закрыть приложение, чтобы избежать зависания WebView.
 */
export default function SessionStaleOverlay({ onReload, onClose, onDismiss }) {
  return (
    <div
      className="session-stale-overlay"
      role="dialog"
      aria-labelledby="session-stale-title"
      aria-describedby="session-stale-desc"
    >
      <div className="session-stale-overlay__backdrop" />
      <div className="session-stale-overlay__card">
        <h2 id="session-stale-title" className="session-stale-overlay__title">
          Вы давно не заходили
        </h2>
        <p id="session-stale-desc" className="session-stale-overlay__text">
          Чтобы приложение не зависало, закройте и откройте Mini App заново или нажмите «Перезагрузить».
        </p>
        <div className="session-stale-overlay__actions">
          <button
            type="button"
            className="session-stale-overlay__btn session-stale-overlay__btn--primary"
            onClick={onReload}
          >
            Перезагрузить
          </button>
          <button
            type="button"
            className="session-stale-overlay__btn session-stale-overlay__btn--secondary"
            onClick={onClose}
          >
            Закрыть Mini App
          </button>
          <button
            type="button"
            className="session-stale-overlay__btn session-stale-overlay__btn--link"
            onClick={onDismiss}
          >
            Продолжить без перезагрузки
          </button>
        </div>
      </div>
    </div>
  );
}
