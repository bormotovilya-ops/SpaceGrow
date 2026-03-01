/**
 * Генерирует аудиофайлы для цитат про чай голосом Светланы (Edge TTS).
 * Использует Python edge-tts (часто работает там, где edge-tts-node даёт 403).
 * Нужны: Python, pip install edge-tts, по желанию ffmpeg для MP3.
 * Запуск: node scripts/generate-tea-audio.js
 */

import { writeFile, mkdir, unlink } from 'fs/promises'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Список должен совпадать с TEA_QUOTES в src/components/Cabinet.jsx
const TEA_QUOTES = [
  { author: 'Лу Юй', text: '«Чай особенно подходит людям чистого поведения и скромной добродетели».' },
  { author: 'Китайская пословица', text: '«Лучше три дня без пищи, чем один день без чая».' },
  { author: 'Чань-буддийская формула', text: '«Чай и дзен — одного вкуса».' },
  { author: 'Русская поговорка', text: '«Чай пить — не дрова рубить».' },
  { author: 'Чжаочжоу', text: 'Монах спрашивает о пути. Мастер отвечает: «Пей чай».' },
  { author: 'Нативная реклама!', text: 'Недавно была в Сочи. Там есть прекрасный чайный клуб, называется Мэр-Пуэр.' },
  { author: 'Нативная реклама', text: 'В Перми лучший чай можно найти в Красоте востока.' },
  { author: 'Тит Нат Хан', text: '«Пей свой чай медленно и с почтением, как будто это ось, вокруг которой вращается Земля».' },
  { author: 'Артур Уинг Пинеро', text: '«Пока есть чай — есть надежда».' },
  { author: 'Клайв Стейплз Льюис', text: '«Невозможно получить чашку чая слишком большой или книгу слишком длинной для меня».' },
  { author: 'Редьярд Киплинг', text: '«Если тебе холодно — чай согреет; если жарко — охладит; если ты подавлен — подбодрит; если взволнован — успокоит».' }
]

const OUT_DIR = path.join(__dirname, '..', 'public', 'audio', 'tea')
const VOICE = 'ru-RU-SvetlanaNeural'

function runEdgeTTS(text) {
  const args = ['--voice', VOICE, '--write-media', '-', '--text', text]
  function run(cmd, cmdArgs) {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, cmdArgs, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
      const chunks = []
      proc.stdout.on('data', (chunk) => chunks.push(chunk))
      proc.stdout.on('end', () => resolve(Buffer.concat(chunks)))
      proc.stdout.on('error', reject)
      proc.stderr.on('data', (d) => process.stderr.write(d))
      proc.on('error', (e) => reject(e))
      proc.on('close', (code, signal) => {
        if (code !== 0) reject(new Error(`exit ${code}${signal ? ` signal ${signal}` : ''}`))
      })
    })
  }
  return run('edge-tts', args)
    .catch((e) => {
      if (e?.code === 'ENOENT') return run('python', ['-m', 'edge_tts', ...args])
      throw e
    })
    .catch((e) => {
      if (e?.code === 'ENOENT') return run('py', ['-m', 'edge_tts', ...args])
      throw e
    })
}

function runFfmpeg(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-y', '-i', inputPath, '-acodec', 'libmp3lame', '-q:a', '2', outputPath], {
      stdio: 'ignore'
    })
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))))
    proc.on('error', reject)
  })
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  // Проверяем, что edge-tts (Светлана) доступен
  try {
    const test = await runEdgeTTS('Проверка.')
    if (!test || test.length === 0) throw new Error('empty output')
  } catch (err) {
    console.error('Голос Светланы (Edge TTS) недоступен:', err?.message || err)
    console.error('')
    console.error('Установите Python и edge-tts:')
    console.error('  pip install edge-tts')
    console.error('Либо:  py -m pip install edge-tts')
    console.error('')
    console.error('Если получаете 403 — попробуйте другую сеть или VPN (Microsoft может блокировать по региону).')
    process.exit(1)
  }

  const hasFfmpeg = await new Promise((res) => {
    const p = spawn('ffmpeg', ['-version'], { stdio: 'ignore' })
    p.on('error', () => res(false))
    p.on('close', (code) => res(code === 0))
  })
  if (!hasFfmpeg) console.log('ffmpeg не найден — сохраняю WebM (браузер проигрывает). Для MP3 установите ffmpeg.')

  console.log('Генерация озвучки Светланы...')
  for (let i = 0; i < TEA_QUOTES.length; i++) {
    const q = TEA_QUOTES[i]
    const fullText = `${q.text} — ${q.author}`
    const base = path.join(OUT_DIR, `tea-${i}`)
    const webmPath = `${base}.webm`
    const mp3Path = `${base}.mp3`
    try {
      const buffer = await runEdgeTTS(fullText)
      if (!buffer || buffer.length === 0) throw new Error('empty')
      await writeFile(webmPath, buffer)
      if (hasFfmpeg) {
        await runFfmpeg(webmPath, mp3Path)
        await unlink(webmPath).catch(() => {})
        console.log(`  tea-${i}.mp3 — ${q.author}`)
      } else {
        console.log(`  tea-${i}.webm — ${q.author}`)
      }
    } catch (err) {
      console.error(`  tea-${i}: ${err.message}`)
    }
  }
  console.log('Готово. Файлы в public/audio/tea/ (голос Светланы).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
