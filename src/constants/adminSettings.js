/** Ключи localStorage для настроек администрирования (страница /admin) */

export const LOCAL_SOUND_KEY = 'app_sound_enabled'
export const LOCAL_DEBUG_KEY = 'app_debug_mode'
export const LOCAL_EXPERT_TTS_KEY = 'app_expert_tts_enabled'
export const LOCAL_EXPERT_VOICE_KEY = 'app_expert_tts_voice'

export function getExpertTtsEnabled() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(LOCAL_EXPERT_TTS_KEY) === 'true'
}

export function getExpertTtsVoice() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(LOCAL_EXPERT_VOICE_KEY) || ''
}
