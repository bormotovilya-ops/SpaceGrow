#!/usr/bin/env python3
"""
Система сегментации пользователей
Автоматически определяет сегменты пользователей на основе их поведения
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from db import Database

logger = logging.getLogger(__name__)

class UserSegmentation:
    """Класс для сегментации пользователей"""

    def __init__(self, db_path: str = "bot_users.db"):
        self.db = Database(db_path)

    def update_user_segments(self) -> Dict[str, int]:
        """Обновить сегменты для всех активных пользователей"""
        logger.info("Начинаем обновление сегментов пользователей...")

        # Получить всех активных пользователей (с событиями за последние 30 дней)
        active_users = self._get_active_users(days=30)

        segment_counts = {
            'total_processed': 0,
            'newcomer': 0,
            'engaged': 0,
            'converter': 0,
            'loyal': 0
        }

        for user_id in active_users:
            try:
                segment = self.db.get_user_segment(user_id)
                segment_counts[segment['segment']] += 1
                segment_counts['total_processed'] += 1

                # Логируем изменение сегмента (можно сохранить в БД для истории)
                logger.debug(f"Пользователь {user_id}: сегмент {segment['segment']}, вовлеченность {segment['engagement_level']}")

            except Exception as e:
                logger.error(f"Ошибка при обработке пользователя {user_id}: {e}")

        logger.info(f"Обновление сегментов завершено. Обработано: {segment_counts['total_processed']} пользователей")
        return segment_counts

    def get_segment_insights(self, segment: str) -> Dict[str, Any]:
        """Получить аналитику по сегменту"""
        users = self.db.get_segment_users({'segment': segment})

        if not users:
            return {'segment': segment, 'users_count': 0, 'insights': {}}

        insights = {
            'segment': segment,
            'users_count': len(users),
            'insights': {
                'avg_sessions': 0,
                'avg_events': 0,
                'conversion_rate': 0,
                'top_sources': [],
                'top_content_types': [],
                'engagement_distribution': {},
                'behavior_patterns': []
            }
        }

        # Собираем статистику по пользователям сегмента
        total_sessions = 0
        total_events = 0
        converted_users = 0
        sources = {}
        content_types = {}
        behavior_patterns = {}

        for user_id in users[:100]:  # Ограничиваем для производительности
            try:
                analytics = self.db.get_user_analytics(user_id)

                total_sessions += analytics.get('total_sessions', 0)
                total_events += analytics.get('total_events', 0)

                if analytics.get('diagnostics_completed'):
                    converted_users += 1

                # Анализируем источники
                user_patterns = self.db._analyze_behavior_patterns(user_id)
                for pattern in user_patterns:
                    if 'source_' in pattern:
                        sources[pattern] = sources.get(pattern, 0) + 1

                # Анализируем предпочтения контента
                preferences = self.db._analyze_content_preferences(user_id)
                for pref in preferences:
                    if pref.startswith('likes_'):
                        content_types[pref] = content_types.get(pref, 0) + 1

                # Собираем паттерны поведения
                for pattern in user_patterns:
                    behavior_patterns[pattern] = behavior_patterns.get(pattern, 0) + 1

            except Exception as e:
                logger.error(f"Ошибка при анализе пользователя {user_id}: {e}")

        # Вычисляем средние значения
        user_count = len(users)
        if user_count > 0:
            insights['insights']['avg_sessions'] = total_sessions / user_count
            insights['insights']['avg_events'] = total_events / user_count
            insights['insights']['conversion_rate'] = converted_users / user_count

        # Топ источников
        insights['insights']['top_sources'] = sorted(
            sources.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]

        # Топ типов контента
        insights['insights']['top_content_types'] = sorted(
            content_types.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]

        # Паттерны поведения
        insights['insights']['behavior_patterns'] = sorted(
            behavior_patterns.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]

        return insights

    def get_personalized_recommendations(self, tg_user_id: int) -> Dict[str, Any]:
        """Получить персонализированные рекомендации для пользователя"""
        try:
            segment = self.db.get_user_segment(tg_user_id)
            analytics = self.db.get_user_analytics(tg_user_id)

            recommendations = {
                'user_id': tg_user_id,
                'segment': segment['segment'],
                'engagement_level': segment['engagement_level'],
                'recommendations': [],
                'next_best_actions': [],
                'content_suggestions': []
            }

            # Логика рекомендаций на основе сегмента
            if segment['segment'] == 'newcomer':
                recommendations['recommendations'].append({
                    'type': 'onboarding',
                    'priority': 'high',
                    'message': 'Показать приветственный тур по MiniApp'
                })
                recommendations['next_best_actions'].append('diagnostic_start')

            elif segment['segment'] == 'engaged':
                recommendations['recommendations'].append({
                    'type': 'conversion',
                    'priority': 'high',
                    'message': 'Предложить персональную диагностику'
                })
                recommendations['next_best_actions'].append('personal_path_view')

            elif segment['segment'] == 'converter':
                recommendations['recommendations'].append({
                    'type': 'retention',
                    'priority': 'medium',
                    'message': 'Показать дополнительные материалы по теме'
                })
                recommendations['next_best_actions'].append('content_recommendation')

            elif segment['segment'] == 'loyal':
                recommendations['recommendations'].append({
                    'type': 'upsell',
                    'priority': 'medium',
                    'message': 'Предложить премиум услуги'
                })
                recommendations['next_best_actions'].append('advanced_features')

            # Рекомендации контента на основе предпочтений
            content_prefs = segment.get('content_preference', [])
            if 'likes_section' in str(content_prefs):
                recommendations['content_suggestions'].append({
                    'type': 'section',
                    'content': 'Похожие секции для изучения'
                })

            if 'ai_general' in str(content_prefs):
                recommendations['content_suggestions'].append({
                    'type': 'ai_interaction',
                    'content': 'Продолжить разговор с AI помощником'
                })

            return recommendations

        except Exception as e:
            logger.error(f"Ошибка при генерации рекомендаций для пользователя {tg_user_id}: {e}")
            return {'error': str(e)}

    def trigger_automated_actions(self) -> Dict[str, int]:
        """Выполнить автоматические действия на основе сегментов"""
        actions_triggered = {
            'welcome_messages': 0,
            'diagnostic_reminders': 0,
            'content_recommendations': 0,
            'personal_offers': 0
        }

        try:
            # Найти новичков для приветствия (пользователи с 1 сессией, без диагностики)
            newcomers = self.db.get_segment_users({
                'segment': 'newcomer',
                'diagnostics_completed': False
            })

            for user_id in newcomers[:50]:  # Ограничиваем количество
                # Здесь можно интегрировать отправку сообщений в Telegram
                logger.info(f"Триггер: приветственное сообщение для пользователя {user_id}")
                actions_triggered['welcome_messages'] += 1

            # Найти пользователей, которые начали диагностику но не закончили
            engaged_incomplete = self.db.get_segment_users({
                'segment': 'engaged',
                'diagnostics_completed': False
            })

            for user_id in engaged_incomplete[:30]:
                logger.info(f"Триггер: напоминание о диагностике для пользователя {user_id}")
                actions_triggered['diagnostic_reminders'] += 1

            # Найти конвертированных пользователей для персональных рекомендаций
            converters = self.db.get_segment_users({
                'segment': 'converter'
            })

            for user_id in converters[:20]:
                logger.info(f"Триггер: персональное предложение для пользователя {user_id}")
                actions_triggered['personal_offers'] += 1

        except Exception as e:
            logger.error(f"Ошибка при выполнении автоматических действий: {e}")

        logger.info(f"Автоматические действия выполнены: {actions_triggered}")
        return actions_triggered

    def _get_active_users(self, days: int = 30) -> List[int]:
        """Получить активных пользователей за последние N дней"""
        conn = self.db.get_connection()
        cursor = conn.cursor()

        try:
            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()

            cursor.execute('''
                SELECT DISTINCT tg_user_id
                FROM site_events
                WHERE tg_user_id IS NOT NULL
                AND created_at >= ?
                UNION
                SELECT DISTINCT tg_user_id
                FROM site_sessions
                WHERE tg_user_id IS NOT NULL
                AND session_start >= ?
            ''', (cutoff_date, cutoff_date))

            users = [row[0] for row in cursor.fetchall()]
            return users

        except Exception as e:
            logger.error(f"Ошибка при получении активных пользователей: {e}")
            return []
        finally:
            conn.close()

def update_all_segments(db_path: str = "bot_users.db") -> Dict[str, int]:
    """Обновить сегменты для всех пользователей"""
    segmentation = UserSegmentation(db_path)
    return segmentation.update_user_segments()

def get_segment_report(segment: str, db_path: str = "bot_users.db") -> Dict[str, Any]:
    """Получить отчет по сегменту"""
    segmentation = UserSegmentation(db_path)
    return segmentation.get_segment_insights(segment)

def get_user_recommendations(tg_user_id: int, db_path: str = "bot_users.db") -> Dict[str, Any]:
    """Получить рекомендации для пользователя"""
    segmentation = UserSegmentation(db_path)
    return segmentation.get_personalized_recommendations(tg_user_id)

def run_automated_actions(db_path: str = "bot_users.db") -> Dict[str, int]:
    """Запустить автоматические действия"""
    segmentation = UserSegmentation(db_path)
    return segmentation.trigger_automated_actions()

if __name__ == "__main__":
    # Пример использования
    print("Обновление сегментов пользователей...")
    result = update_all_segments()
    print(f"Результат: {result}")

    print("\nПолучение отчета по сегменту 'engaged'...")
    report = get_segment_report('engaged')
    print(f"Отчет: {report}")

    print("\nЗапуск автоматических действий...")
    actions = run_automated_actions()
    print(f"Действия: {actions}")