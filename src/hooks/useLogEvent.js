import { useCallback, useRef, useEffect } from 'react';
import { apiUtils, userUtils, debounce } from '../utils/logging';

// Fallback tg_user_id when testing in browser; must be 888888 to match prepared DB records
const FALLBACK_TG_USER_ID = 888888;

// Global session state
let globalSessionId = null;
let globalCookieId = null;
let globalTgUserId = null;

const SECTION_DEBOUNCE_MS = 1500;

export const useLogEvent = () => {
  const sessionIdRef = useRef(null);
  const cookieIdRef = useRef(null);
  const tgUserIdRef = useRef(null);
  const lastSectionIdRef = useRef(null);
  const lastSectionTimeRef = useRef(0);

  // Initialize user identifiers
  useEffect(() => {
    if (!cookieIdRef.current) {
      cookieIdRef.current = userUtils.getCookieId();
      globalCookieId = cookieIdRef.current;
    }

    if (!tgUserIdRef.current) {
      tgUserIdRef.current = userUtils.getTelegramUserId();
      globalTgUserId = tgUserIdRef.current;
    }

    if (!sessionIdRef.current && globalSessionId) {
      sessionIdRef.current = globalSessionId;
    }
  }, []);

  // Initialize session if not exists
  const ensureSession = useCallback(async () => {
    if (!sessionIdRef.current) {
      try {
        const result = await apiUtils.startSession(
          cookieIdRef.current,
          tgUserIdRef.current,
          userUtils.getUserAgent(),
          userUtils.getReferrer()
        );

        if (result && result.session_id) {
          sessionIdRef.current = result.session_id;
          globalSessionId = result.session_id;

          // Link identities if we have both IDs
          if (tgUserIdRef.current && cookieIdRef.current) {
            await apiUtils.linkIdentities(tgUserIdRef.current, cookieIdRef.current);
          }
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
      }
    }
    return sessionIdRef.current;
  }, []);

  // Generic event logger. options.metadata + options.page/section_id идут в трекер для обогащения custom_data (section_label, section_icon, huntStage).
  const logEvent = useCallback(async (eventType, eventName, options = {}) => {
    const sessionId = await ensureSession();
    if (!sessionId) return null;

    const {
      page,
      metadata = {},
      section_id,
      eventCategory,
      eventSubType,
      elementId,
      elementType,
      section,
      scrollDepth,
      timeSpent,
      interactionCount,
      previousEventId,
      stepNumber,
      completionRate,
      errorMessage,
      customData
    } = options;

    const meta = { ...metadata };
    if (section_id != null) meta.section_id = section_id;
    if (customData != null) meta.customData = customData;

    const finalUserId = tgUserIdRef.current ?? FALLBACK_TG_USER_ID;
    return apiUtils.logEvent(sessionId, eventType, eventName, page ?? meta.page, meta, finalUserId);
  }, [ensureSession]);

  // Specialized logging methods

  // 1. Arrival/Visit logging
  const logArrival = useCallback(async (source = 'direct') => {
    const sessionId = await ensureSession();
    if (!sessionId) return null;

    const utmParams = userUtils.getUTMParams();
    const referrer = userUtils.getReferrer();

    const finalUserId = tgUserIdRef.current ?? FALLBACK_TG_USER_ID;
    return apiUtils.logSourceVisit({
      session_id: sessionId,
      source,
      cookie_id: cookieIdRef.current,
      utm_params: utmParams,
      referrer,
      tg_user_id: finalUserId
    });
  }, [ensureSession]);

  // 2. MiniApp open logging
  const logMiniAppOpen = useCallback(async (pageId = 'main') => {
    const sessionId = await ensureSession();
    if (!sessionId) return null;

    const deviceInfo = userUtils.getDeviceInfo();

    const finalUserId = tgUserIdRef.current ?? FALLBACK_TG_USER_ID;
    return apiUtils.logMiniAppOpen({
      session_id: sessionId,
      device: deviceInfo.deviceType,
      page_id: pageId,
      cookie_id: cookieIdRef.current,
      tg_user_id: finalUserId
    });
  }, [ensureSession]);

  // 3. Content view logging with debounced scroll/time tracking
  const logContentView = useCallback(async (contentType, contentId, options = {}) => {
    // Do not send generic "main" content_id — only real pages (Home, PersonReport, etc.) log their own IDs
    if (contentId === 'main') return null;

    const sessionId = await ensureSession();
    if (!sessionId) return null;

    const {
      contentTitle,
      section,
      timeSpent,
      scrollDepth,
      page
    } = options;

    const finalUserId = tgUserIdRef.current ?? FALLBACK_TG_USER_ID;
    return apiUtils.logContentView({
      session_id: sessionId,
      content_type: contentType,
      content_id: contentId,
      content_title: contentTitle,
      section,
      time_spent: timeSpent,
      scroll_depth: scrollDepth,
      page: page ?? null,
      cookie_id: cookieIdRef.current,
      tg_user_id: finalUserId
    });
  }, [ensureSession]);

  // 4. AI interaction logging
  const logAIInteraction = useCallback(async (messagesCount, topics, duration, conversationType = 'general', options = {}) => {
    const sessionId = await ensureSession();
    if (!sessionId) return null;

    const finalUserId = tgUserIdRef.current ?? FALLBACK_TG_USER_ID;
    return apiUtils.logAIInteraction({
      session_id: sessionId,
      messages_count: messagesCount,
      topics,
      duration,
      conversation_type: conversationType,
      page: options.page ?? null,
      cookie_id: cookieIdRef.current,
      tg_user_id: finalUserId
    });
  }, [ensureSession]);

  // 5. Diagnostics logging
  const logDiagnostics = useCallback(async (action, results = null, startTime = null, endTime = null, progress = null) => {
    const sessionId = await ensureSession();
    if (!sessionId) return null;

    if (action === 'complete') {
      const finalUserId = tgUserIdRef.current ?? FALLBACK_TG_USER_ID;
      return apiUtils.logDiagnosticCompletion({
        session_id: sessionId,
        results,
        start_time: startTime,
        end_time: endTime,
        progress,
        cookie_id: cookieIdRef.current,
        tg_user_id: finalUserId
      });
    } else {
      // Log start or progress events
      return logEvent('diagnostic', `diagnostic_${action}`, {
        custom_data: { results, start_time: startTime, end_time: endTime, progress }
      });
    }
  }, [ensureSession, logEvent]);

  // 6. Game/Calculations logging
  const logGameAction = useCallback(async (gameType, actionType, actionData, options = {}) => {
    const sessionId = await ensureSession();
    if (!sessionId) return null;

    const { score, achievement, duration } = options;

    const finalUserId = tgUserIdRef.current ?? FALLBACK_TG_USER_ID;
    return apiUtils.logGameAction({
      session_id: sessionId,
      game_type: gameType,
      action_type: actionType,
      action_data: actionData,
      score,
      achievement,
      duration,
      page: options.page ?? null,
      cookie_id: cookieIdRef.current,
      tg_user_id: finalUserId
    });
  }, [ensureSession]);

  // 7. CTA click logging. Приоритет label для Hunt 4: element_text (e.target.innerText) → cta_text → custom_label.
  // Передайте element_text: e?.target?.innerText?.trim() при вызове из onClick для захвата текста кнопки.
  const logCTAClick = useCallback(async (ctaType, options = {}) => {
    const sessionId = await ensureSession();
    if (!sessionId) return null;

    const {
      ctaText,
      ctaLocation,
      previousStep,
      stepDuration,
      section_id,
      cta_opens_tg,
      custom_label,
      element_text,
      button_text
    } = options;

    const finalUserId = tgUserIdRef.current ?? FALLBACK_TG_USER_ID;
    return apiUtils.logCTAClick({
      session_id: sessionId,
      cta_type: ctaType,
      cta_text: ctaText,
      cta_location: ctaLocation,
      previous_step: previousStep,
      step_duration: stepDuration,
      page: options.page ?? null,
      section_id: section_id ?? null,
      cta_opens_tg: cta_opens_tg ?? false,
      custom_label: custom_label ?? null,
      element_text: element_text ?? button_text ?? null,
      cookie_id: cookieIdRef.current,
      tg_user_id: finalUserId
    });
  }, [ensureSession]);

  // 8. Personal Path/PDF logging
  const logPersonalPathView = useCallback(async (openTime, duration, downloaded = false) => {
    const sessionId = await ensureSession();
    if (!sessionId) return null;

    const finalUserId = tgUserIdRef.current ?? FALLBACK_TG_USER_ID;
    return apiUtils.logPersonalPathView({
      session_id: sessionId,
      open_time: openTime,
      duration,
      downloaded,
      cookie_id: cookieIdRef.current,
      tg_user_id: finalUserId
    });
  }, [ensureSession]);

  // Debounced scroll tracker
  const createScrollTracker = useCallback((contentId, contentType = 'page') => {
    let lastScrollDepth = 0;
    let startTime = Date.now();

    const debouncedLogScroll = debounce(async (scrollDepth) => {
      if (scrollDepth > lastScrollDepth) {
        lastScrollDepth = scrollDepth;
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);

        await logContentView(contentType, contentId, {
          timeSpent,
          scrollDepth
        });
      }
    }, 1000);

    return {
      trackScroll: (scrollDepth) => {
        debouncedLogScroll(scrollDepth);
      },
      trackTime: debounce(async () => {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        await logContentView(contentType, contentId, {
          timeSpent,
          scrollDepth: lastScrollDepth
        });
      }, 5000)
    };
  }, []);

  // Track section view for Sitemap (custom_data: section_id, label, section_label, parent_label, emoji)
  // Debounce + lastId check to avoid duplicate events when scrolling within same section
  const trackSectionView = useCallback(async (sectionId) => {
    if (!sectionId) return null;
    const now = Date.now();
    const isSameSection = lastSectionIdRef.current === sectionId;
    const withinDebounce = (now - lastSectionTimeRef.current) < SECTION_DEBOUNCE_MS;
    if (isSameSection && withinDebounce) return null;

    lastSectionIdRef.current = sectionId;
    lastSectionTimeRef.current = now;

    const sessionId = await ensureSession();
    if (!sessionId) return null;
    const finalUserId = tgUserIdRef.current ?? FALLBACK_TG_USER_ID;
    return apiUtils.trackSectionView({
      session_id: sessionId,
      section_id: sectionId,
      tg_user_id: finalUserId
    });
  }, [ensureSession]);

  // Get current session info
  const getSessionInfo = useCallback(() => ({
    sessionId: sessionIdRef.current,
    cookieId: cookieIdRef.current,
    tgUserId: tgUserIdRef.current
  }), []);

  return {
    // Core methods
    logEvent,
    ensureSession,
    getSessionInfo,

    // Specialized loggers
    logArrival,
    logMiniAppOpen,
    logContentView,
    logAIInteraction,
    logDiagnostics,
    logGameAction,
    logCTAClick,
    logPersonalPathView,
    trackSectionView,

    // Utilities
    createScrollTracker
  };
};