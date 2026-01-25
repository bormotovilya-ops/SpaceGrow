import React, { useEffect, useRef } from 'react';
import { useLogEvent } from '../hooks/useLogEvent';

/**
 * LoggingWrapper - HOC для автоматического логирования просмотров контента
 * Автоматически отслеживает:
 * - Время просмотра (с debounce)
 * - Прокрутку контента (scroll depth)
 * - Время на странице
 */
const LoggingWrapper = ({
  children,
  contentType = 'page',
  contentId,
  section,
  enabled = true,
  scrollThreshold = 25, // Каждый 25% прокрутки
  timeThreshold = 5000 // Каждые 5 секунд
}) => {
  const { logContentView, createScrollTracker } = useLogEvent();
  const elementRef = useRef(null);
  const scrollTrackerRef = useRef(null);
  const visibilityTrackerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!enabled || !contentId) return;

    // Инициализируем трекер скролла
    scrollTrackerRef.current = createScrollTracker(contentId, contentType);
    startTimeRef.current = Date.now();

    // Логируем начальный просмотр
    logContentView(contentType, contentId, {
      section,
      timeSpent: 0,
      scrollDepth: 0
    });

    const handleScroll = () => {
      if (!elementRef.current) return;

      const element = elementRef.current;
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Вычисляем глубину прокрутки относительно элемента
      const elementTop = rect.top;
      const elementHeight = rect.height;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      // Позиция элемента относительно viewport
      const elementVisibleTop = Math.max(0, -elementTop);
      const elementVisibleBottom = Math.min(elementHeight, windowHeight - elementTop);
      const visibleHeight = Math.max(0, elementVisibleBottom - elementVisibleTop);

      const scrollDepth = elementHeight > 0 ? Math.round((visibleHeight / elementHeight) * 100) : 0;

      if (scrollTrackerRef.current && scrollDepth > 0) {
        scrollTrackerRef.current.trackScroll(scrollDepth);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Страница стала невидимой - логируем время просмотра
        if (scrollTrackerRef.current) {
          scrollTrackerRef.current.trackTime();
        }
      } else {
        // Страница стала видимой - обновляем время начала
        startTimeRef.current = Date.now();
      }
    };

    // Устанавливаем обработчики событий
    const throttledScroll = throttle(handleScroll, 100);
    window.addEventListener('scroll', throttledScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Периодическое логирование времени (каждые timeThreshold мс)
    const timeInterval = setInterval(() => {
      if (scrollTrackerRef.current && !document.hidden) {
        scrollTrackerRef.current.trackTime();
      }
    }, timeThreshold);

    // Cleanup
    return () => {
      window.removeEventListener('scroll', throttledScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(timeInterval);

      // Финальное логирование при размонтировании
      if (scrollTrackerRef.current) {
        scrollTrackerRef.current.trackTime();
      }
    };
  }, [enabled, contentId, contentType, section, logContentView, createScrollTracker, scrollThreshold, timeThreshold]);

  // Если логирование отключено, просто возвращаем children
  if (!enabled) {
    return children;
  }

  // Оборачиваем children в div с ref для отслеживания
  return (
    <div ref={elementRef} style={{ width: '100%', height: '100%' }}>
      {children}
    </div>
  );
};

/**
 * Утилита для throttling функций
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Specialized wrapper for page-level logging
 */
export const PageLogger = ({ children, pageId, pageTitle }) => (
  <LoggingWrapper
    contentType="page"
    contentId={pageId}
    section={pageTitle}
    enabled={true}
  >
    {children}
  </LoggingWrapper>
);

/**
 * Specialized wrapper for section-level logging
 */
export const SectionLogger = ({ children, sectionId, sectionName, pageId }) => (
  <LoggingWrapper
    contentType="section"
    contentId={sectionId}
    section={sectionName}
    enabled={true}
  >
    {children}
  </LoggingWrapper>
);

/**
 * Hook for manual scroll and time tracking
 */
export const useScrollTracker = (contentId, contentType = 'content') => {
  const { createScrollTracker } = useLogEvent();
  const trackerRef = useRef(null);

  useEffect(() => {
    trackerRef.current = createScrollTracker(contentId, contentType);
  }, [contentId, contentType, createScrollTracker]);

  const trackScroll = (scrollDepth) => {
    if (trackerRef.current) {
      trackerRef.current.trackScroll(scrollDepth);
    }
  };

  const trackTime = () => {
    if (trackerRef.current) {
      trackerRef.current.trackTime();
    }
  };

  return { trackScroll, trackTime };
};

export default LoggingWrapper;