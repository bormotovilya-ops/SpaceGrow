// Озвучка: Azure, Yandex SpeechKit, Google Cloud TTS, Edge TTS (fallback)
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { MsEdgeTTS, OUTPUT_FORMAT } = require('edge-tts-node')

const MAX_TEXT_LENGTH = 5000

const GOOGLE_VOICE = 'ru-RU-Wavenet-A'
const AZURE_VOICE = 'ru-RU-SvetlanaNeural'

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

/** Azure Speech TTS (Светлана, 500k символов/мес бесплатно F0) */
async function ttsViaAzure(text, key, region) {
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`
  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ru-RU'><voice name='${AZURE_VOICE}'>${escapeXml(text)}</voice></speak>`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'MYMiniapp-TTS/1.0'
    },
    body: ssml
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Azure TTS ${res.status}: ${err}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Yandex SpeechKit TTS v3 (1 млн символов/мес бесплатно, Алена) */
async function ttsViaYandex(text, apiKey, folderId) {
  const url = 'https://tts.api.cloud.yandex.net/tts/v3/utteranceSynthesis'
  const body = {
    text,
    hints: [{ voice: 'alena' }],
    output_audio_spec: { container_audio: { container_audio_type: 'MP3' } },
    unsafe_mode: true
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Api-Key ${apiKey}`,
      'x-folder-id': folderId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Yandex TTS ${res.status}: ${err}`)
  }
  const chunks = []
  const reader = res.body.getReader()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += new TextDecoder().decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const obj = JSON.parse(line)
        const b64 = obj?.audioChunk?.data ?? obj?.result?.audioChunk?.data ?? obj?.audio_chunk?.data
        if (b64) chunks.push(Buffer.from(b64, 'base64'))
      } catch (_) {}
    }
  }
  if (buf.trim()) {
    try {
      const obj = JSON.parse(buf)
      const b64 = obj?.audioChunk?.data ?? obj?.result?.audioChunk?.data
      if (b64) chunks.push(Buffer.from(b64, 'base64'))
    } catch (_) {}
  }
  if (chunks.length === 0) throw new Error('Yandex TTS: no audio in response')
  return Buffer.concat(chunks)
}

/** Google Cloud TTS через REST API (работает на Vercel, HTTP) */
async function ttsViaGoogleCloud(text, apiKey) {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'ru-RU', name: GOOGLE_VOICE },
      audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 24000 }
    })
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google TTS ${res.status}: ${err}`)
  }
  const json = await res.json()
  if (!json.audioContent) throw new Error('Google TTS: no audioContent')
  return Buffer.from(json.audioContent, 'base64')
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

  const azureKey = process.env.AZURE_SPEECH_KEY || process.env.AZURE_TTS_KEY
  const azureRegion = process.env.AZURE_SPEECH_REGION || process.env.AZURE_TTS_REGION || 'westeurope'
  const yandexKey = process.env.YANDEX_SPEECHKIT_API_KEY || process.env.YANDEX_TTS_API_KEY
  const yandexFolder = process.env.YANDEX_SPEECHKIT_FOLDER_ID || process.env.YANDEX_TTS_FOLDER_ID
  const googleKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_CLOUD_API_KEY

  // 1) Azure Speech (Светлана, 500k символов/мес бесплатно F0)
  if (azureKey) {
    try {
      const buffer = await ttsViaAzure(text, azureKey, azureRegion)
      res.setHeader('Content-Type', 'audio/mpeg')
      return res.send(buffer)
    } catch (err) {
      logTtsError('Azure TTS failed', err)
    }
  }

  // 2) Yandex SpeechKit (Алена, 1 млн символов/мес бесплатно)
  if (yandexKey && yandexFolder) {
    try {
      const buffer = await ttsViaYandex(text, yandexKey, yandexFolder)
      res.setHeader('Content-Type', 'audio/mpeg')
      return res.send(buffer)
    } catch (err) {
      logTtsError('Yandex TTS failed', err)
    }
  }

  // 3) Google Cloud TTS
  if (googleKey) {
    try {
      const buffer = await ttsViaGoogleCloud(text, googleKey)
      res.setHeader('Content-Type', 'audio/mpeg')
      return res.send(buffer)
    } catch (err) {
      logTtsError('Google TTS failed', err)
    }
  }

  // 4) Edge TTS (fallback, может не работать на Vercel из‑за WebSocket)
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

  const hasAnyKey = azureKey || (yandexKey && yandexFolder) || googleKey
  res.status(500).json({
    error: 'TTS failed',
    message: hasAnyKey ? 'TTS провайдеры недоступны' : 'Добавьте AZURE_SPEECH_KEY, YANDEX_SPEECHKIT_API_KEY или GOOGLE_TTS_API_KEY (Vercel → Environment Variables)'
  })
}
