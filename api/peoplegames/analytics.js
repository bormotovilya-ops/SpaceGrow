import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/peoplegames/analytics
 * Возвращает агрегированные данные аналитики курса «Люди, которые играют в игры»:
 * - runs: массив завершённых прохождений (points, result, name, date, chapterPoints, wrongByChapter)
 * - wrongChoices: объект { choiceId: count } — частотность ошибочных выборов
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase is not configured' })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    const { data: runEvents, error: errRuns } = await supabase
      .from('site_events')
      .select('metadata, created_at')
      .eq('event_type', 'training')
      .eq('event_name', 'peoplegames_run_complete')
      .order('created_at', { ascending: true })

    if (errRuns) {
      console.error('[peoplegames analytics] runs fetch:', errRuns.message)
      return res.status(500).json({ error: errRuns.message })
    }

    const { data: wrongEvents, error: errWrong } = await supabase
      .from('site_events')
      .select('metadata')
      .eq('event_type', 'training')
      .eq('event_name', 'peoplegames_wrong_choice')

    if (errWrong) {
      console.error('[peoplegames analytics] wrong choices fetch:', errWrong.message)
      return res.status(500).json({ error: errWrong.message })
    }

    const runs = (runEvents || []).map(function (e) {
      const m = (e.metadata && typeof e.metadata === 'object') ? e.metadata : {}
      return {
        ts: e.created_at ? new Date(e.created_at).getTime() : Date.now(),
        date: (m.date || (e.created_at ? new Date(e.created_at).toISOString().slice(0, 10) : '')),
        points: typeof m.points === 'number' ? m.points : 0,
        result: typeof m.result === 'string' ? m.result : '',
        name: (typeof m.name === 'string' && m.name.trim()) ? m.name.trim() : '',
        chapterPoints: m.chapterPoints && typeof m.chapterPoints === 'object' ? m.chapterPoints : { ch1: 0, ch2: 0, ch3: 0, ch4: 0, ch5: 0 },
        wrongByChapter: m.wrongByChapter && typeof m.wrongByChapter === 'object' ? m.wrongByChapter : { ch1: 0, ch2: 0, ch3: 0, ch4: 0, ch5: 0 }
      }
    })

    const wrongChoices = {}
    ;(wrongEvents || []).forEach(function (e) {
      const m = (e.metadata && typeof e.metadata === 'object') ? e.metadata : {}
      const id = m.choiceId || m.choice_id
      if (id) {
        wrongChoices[id] = (wrongChoices[id] || 0) + 1
      }
    })

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    return res.status(200).json({ runs, wrongChoices })
  } catch (err) {
    console.error('[peoplegames analytics]', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
