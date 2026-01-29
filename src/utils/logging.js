// Frontend logging utilities for user analytics
// Use relative /api by default in production so the frontend calls the deployed serverless endpoints.
// When VITE_API_URL is set (e.g. http://localhost:5001/api), it must include /api so endpoints like /track-session become /api/track-session.
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Cookie utilities
export const cookieUtils = {
  get(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  },

  set(name, value, days = 365) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  },

  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

// User identification
export const userUtils = {
  getCookieId() {
    let cookieId = cookieUtils.get('user_id');
    if (!cookieId) {
      cookieId = cookieUtils.generateId();
      cookieUtils.set('user_id', cookieId);
    }
    return cookieId;
  },

  getTelegramUserId() {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) {
      return window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    return null;
  },

  getUserAgent() {
    return typeof navigator !== 'undefined' ? navigator.userAgent : '';
  },

  getDeviceInfo() {
    if (typeof navigator === 'undefined') return {};

    const ua = navigator.userAgent;
    const device = {
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
      isTablet: /iPad|Android(?=.*\bMobile\b)|Tablet|PlayBook/i.test(ua),
      isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet|PlayBook/i.test(ua)
    };

    let deviceType = 'desktop';
    if (device.isMobile) deviceType = 'mobile';
    else if (device.isTablet) deviceType = 'tablet';

    return {
      deviceType,
      browser: this.getBrowserInfo(),
      os: this.getOSInfo(),
      screenResolution: `${screen.width}x${screen.height}`
    };
  },

  getBrowserInfo() {
    if (typeof navigator === 'undefined') return 'unknown';

    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'unknown';
  },

  getOSInfo() {
    if (typeof navigator === 'undefined') return 'unknown';

    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'unknown';
  },

  getUTMParams() {
    if (typeof window === 'undefined') return {};

    const urlParams = new URLSearchParams(window.location.search);
    return {
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      utm_term: urlParams.get('utm_term'),
      utm_content: urlParams.get('utm_content')
    };
  },

  getReferrer() {
    return typeof document !== 'undefined' ? document.referrer : '';
  }
};

// API calls
export const apiUtils = {
  async makeRequest(endpoint, data) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API request failed:', error);
      // Don't throw - logging should not break the app
      return null;
    }
  },

  // Session management
  async startSession(cookieId, tgUserId = null, userAgent = '', referrer = '') {
    return this.makeRequest('/track-session', {
      cookie_id: cookieId,
      tg_user_id: tgUserId,
      action: 'start',
      user_agent: userAgent,
      referrer: referrer
    });
  },

  async endSession(sessionId) {
    return this.makeRequest('/track-session', {
      session_id: sessionId,
      action: 'end'
    });
  },

  // Identity linking
  async linkIdentities(tgUserId, cookieId) {
    return this.makeRequest('/link-identities', {
      tg_user_id: tgUserId,
      cookie_id: cookieId
    });
  },

  // Event logging
  async logEvent(sessionId, eventType, eventName, page = null, metadata = {}, tgUserId = null) {
    return this.makeRequest('/track-event', {
      session_id: sessionId,
      event_type: eventType,
      event_name: eventName,
      page,
      metadata,
      tg_user_id: tgUserId
    });
  },

  // Specialized logging endpoints
  async logSourceVisit(data) {
    return this.makeRequest('/log/source-visit', data);
  },

  async logMiniAppOpen(data) {
    return this.makeRequest('/log/miniapp-open', data);
  },

  async logContentView(data) {
    return this.makeRequest('/log/content-view', data);
  },

  async logAIInteraction(data) {
    return this.makeRequest('/log/ai-interaction', data);
  },

  async logDiagnosticCompletion(data) {
    return this.makeRequest('/log/diagnostic-complete', data);
  },

  async logGameAction(data) {
    return this.makeRequest('/log/game-action', data);
  },

  async logCTAClick(data) {
    return this.makeRequest('/log/cta-click', data);
  },

  async logPersonalPathView(data) {
    return this.makeRequest('/log/personal-path-view', data);
  }
};

// Debounced function utility
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};