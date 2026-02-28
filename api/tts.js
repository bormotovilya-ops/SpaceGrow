// Озвучка через Microsoft Edge TTS (женский голос ru-RU-SvetlanaNeural)
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { MsEdgeTTS, OUTPUT_FORMAT } = require('edge-tts-node')

const VOICE = 'ru-RU-SvetlanaNeural'
// WEBM стабильнее в edge-tts-node; при необходимости можно вернуть MP3
const FORMAT = OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS
const MAX_TEXT_LENGTH = 5000

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

/** Лог ошибки с полными деталями (message/code/stack и прочие поля) */
function logTtsError(label, err) {
  if (err == null) {
    console.error(`[TTS] ${label}:`, err)
    return
  }
  if (typeof err === 'string') {
    console.error(`[TTS] ${label}:`, err)
    return
  }
  const e = err
  const out = {
    name: e?.name,
    message: e?.message,
    code: e?.code,
    errno: e?.errno,
    stack: e?.stack,
    cause: e?.cause ? { message: e.cause?.message, code: e.cause?.code } : undefined
  }
  for (const key of Object.keys(e)) {
    if (!(key in out) && typeof e[key] !== 'function') out[key] = e[key]
  }
  console.error(`[TTS] ${label}:`, JSON.stringify(out, null, 2))
  if (e?.stack) console.error(e.stack)
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

  if (!text) {
    return res.status(400).json({ error: 'Missing or empty text' })
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({ error: `Text too long (max ${MAX_TEXT_LENGTH} chars)` })
  }

  let tts
  try {
    tts = new MsEdgeTTS({})
    await tts.setMetadata(VOICE, FORMAT)
    const stream = tts.toStream(text)
    const buffer = await streamToBuffer(stream)
    tts.close()
    res.setHeader('Content-Type', FORMAT === OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3 ? 'audio/mpeg' : 'audio/webm')
    res.send(buffer)
  } catch (err) {
    if (tts && typeof tts.close === 'function') try { tts.close() } catch (_) {}
    logTtsError('error', err)
    const msg = err?.message || String(err)
    const code = err?.code
    res.status(500).json({
      error: 'TTS failed',
      message: msg,
      code: code || undefined,
      hint: msg.includes('Connect') ? 'WebSocket к speech.platform.bing.com недоступен (сеть/файрвол/сервер)' : undefined
    })
  }
}
