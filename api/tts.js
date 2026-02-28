// Озвучка: gTTS (приоритет, без ключей) → Edge TTS (Светлана). Fallback в браузере — Web Speech API.
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const gtts = require('node-gtts')('ru')
const { MsEdgeTTS, OUTPUT_FORMAT } = require('edge-tts-node')

const MAX_TEXT_LENGTH = 5000

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

function logTtsError(label, err) {
  if (err == null) { console.error(`[TTS] ${label}:`, err); return }
  if (typeof err === 'string') { console.error(`[TTS] ${label}:`, err); return }
  const e = err
  const out = { name: e?.name, message: e?.message, code: e?.code, errno: e?.errno }
  for (const key of Object.keys(e)) {
    if (!(key in out) && typeof e[key] !== 'function') out[key] = e[key]
  }
  console.error(`[TTS] ${label}:`, JSON.stringify(out, null, 2))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  let text = ''
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    text = typeof body.text === 'string' ? body.text.trim() : ''
  } catch (_) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  if (!text) return res.status(400).json({ error: 'Missing or empty text' })
  if (text.length > MAX_TEXT_LENGTH) return res.status(400).json({ error: `Text too long (max ${MAX_TEXT_LENGTH} chars)` })

  // 1) gTTS (Google Translate, без ключей, MP3)
  try {
    const buffer = await new Promise((resolve, reject) => {
      const chunks = []
      const s = gtts.stream(text)
      s.on('data', (c) => chunks.push(c))
      s.on('end', () => resolve(Buffer.concat(chunks)))
      s.on('error', reject)
    })
    if (buffer && buffer.length > 0) {
      res.setHeader('Content-Type', 'audio/mpeg')
      return res.send(buffer)
    }
  } catch (err) {
    logTtsError('gTTS failed', err)
  }

  // 2) Edge TTS (Светлана, на Vercel WebSocket может блокироваться)
  const FORMAT = OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS
  let tts
  try {
    tts = new MsEdgeTTS({})
    await tts.setMetadata('ru-RU-SvetlanaNeural', FORMAT)
    const stream = tts.toStream(text)
    const buffer = await streamToBuffer(stream)
    tts.close()
    res.setHeader('Content-Type', 'audio/webm')
    return res.send(buffer)
  } catch (err) {
    if (tts && typeof tts.close === 'function') try { tts.close() } catch (_) {}
    logTtsError('Edge TTS failed', err)
  }

  res.status(500).json({
    error: 'TTS failed',
    message: 'gTTS и Edge TTS недоступны. Браузер использует Web Speech API.'
  })
}
