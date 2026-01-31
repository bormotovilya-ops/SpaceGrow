import { getSupabase } from './supabaseClient';

const IS_DEV = import.meta.env.MODE === 'development';
const FALLBACK_TG_USER_ID = 888888;

/**
 * Очистка метаданных
 */
function buildCleanMetadata(metadata) {
  const out = {};
  if (metadata && typeof metadata === 'object') {
    Object.keys(metadata).forEach(k => {
      if (k !== 'profile_id') out[k] = metadata[k];
    });
  }
  return out;
}

/**
 * Основная функция трекинга
 */
export async function trackEvent(sessionId, eventType, eventName, page = null, metadata = {}, tgUserId = null) {
  const finalTgUserId = Number(tgUserId) || FALLBACK_TG_USER_ID;
  const safeSessionId = Number(sessionId) || 0;

  const cleanPayload = {
    tg_user_id: finalTgUserId,
    session_id: safeSessionId,
    event_type: eventType,
    event_name: eventName,
    page: page || null,
    metadata: buildCleanMetadata(metadata)
  };

  try {
    const supabase = await getSupabase();
    if (!supabase) return { ok: false };

    // Простая вставка без возврата данных (id)
    const { error } = await supabase
      .from('site_events')
      .insert(cleanPayload);

    if (error) {
      console.error('[trackEvent] insert failed:', error.message);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}

/**
 * Утилиты для пользователя
 */
export const userUtils = {
  getCookieId() {
    let id = document.cookie.split('; ').find(row => row.startsWith('user_id='))?.split('=')[1];
    if (!id) {
      id = crypto.randomUUID();
      document.cookie = `user_id=${id};path=/;max-age=31536000;SameSite=Lax`;
    }
    return id;
  },
  getTelegramUserId() {
    return window.Telegram?.WebApp?.initDataUnsafe?.user?.id || null;
  },
  getUTMParams() {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get('utm_source'),
      utm_medium: p.get('utm_medium'),
      utm_campaign: p.get('utm_campaign')
    };
  },
  getUserAgent() { return navigator.userAgent || ''; },
  getReferrer() { return document.referrer || ''; },
  
  // ВОССТАНОВЛЕНО: Методы для определения устройства
  getBrowserInfo() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    return 'unknown';
  },
  getOSInfo() {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'unknown';
  },
  getDeviceInfo() {
    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    return {
      deviceType: isMobile ? 'mobile' : 'desktop',
      browser: this.getBrowserInfo(),
      os: this.getOSInfo(),
      screenResolution: `${window.screen?.width}x${window.screen?.height}`
    };
  }
};

/**
 * Утилиты API
 */
export const apiUtils = {
  async startSession(cookieId, tgUserId, userAgent, referrer) {
    const supabase = await getSupabase();
    if (!supabase) return IS_DEV ? { session_id: 0 } : null;
    try {
      const { data, error } = await supabase.from('site_sessions').insert({
        cookie_id: cookieId,
        tg_user_id: Number(tgUserId) || null,
        user_agent: userAgent,
        referrer: referrer
      }).select('id').single();
      if (error) throw error;
      return { session_id: data?.id };
    } catch (e) {
      return IS_DEV ? { session_id: 0 } : null;
    }
  },
  
  async logEvent(sId, type, name, page, meta, tgId) {
    return trackEvent(sId, type, name, page, meta, tgId);
  },
  
  async logSourceVisit(d) { return trackEvent(d.session_id, 'visit', 'source_visit', null, d, d.tg_user_id); },
  async logMiniAppOpen(d) { return trackEvent(d.session_id, 'app', 'miniapp_open', d.page_id, d, d.tg_user_id); },
  async logContentView(d) { return trackEvent(d.session_id, 'content', 'content_view', d.page, d, d.tg_user_id); },
  async logAIInteraction(d) { return trackEvent(d.session_id, 'ai', 'ai_interaction', d.page, d, d.tg_user_id); },
  async logDiagnosticCompletion(d) { return trackEvent(d.session_id, 'diagnostic', 'diagnostic_complete', d.page, d, d.tg_user_id); },
  async logGameAction(d) { return trackEvent(d.session_id, 'game', 'game_action', d.page, d, d.tg_user_id); },
  async logCTAClick(d) { return trackEvent(d.session_id, 'cta', 'cta_click', d.page, d, d.tg_user_id); },
  async logPersonalPathView(d) { return trackEvent(d.session_id, 'content', 'personal_path_view', d.page, d, d.tg_user_id); }
};

export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const cookieUtils = {
  get: (name) => userUtils.getCookieId(),
  set: (name, val) => { document.cookie = `${name}=${val};path=/`; }
};