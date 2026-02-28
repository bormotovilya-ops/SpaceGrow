#!/usr/bin/env python3
"""
Список голосов Microsoft Edge TTS (edge-tts) и генерация примеров для прослушивания.

Установка: pip install edge-tts
Запуск:
  python scripts/list-edge-tts-voices.py           — вывести список русских голосов
  python scripts/list-edge-tts-voices.py --samples  — создать папку edge_tts_samples с MP3 по одному на голос
  python scripts/list-edge-tts-voices.py --all        — вывести все голоса (все языки)
"""

import asyncio
import sys
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("Установите edge-tts: pip install edge-tts")
    sys.exit(1)

SAMPLE_TEXT_RU = "Чувствуете глубину? Что привело вас в этот кабинет?"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "edge_tts_samples"


async def list_voices(lang_filter=None):
    voices = await edge_tts.list_voices()
    if lang_filter:
        voices = [v for v in voices if v["Locale"].lower().startswith(lang_filter.lower())]
    return voices


async def create_sample(voice_name, text, path):
    communicate = edge_tts.Communicate(text, voice_name)
    await communicate.save(path)


async def main():
    only_ru = "--all" not in sys.argv
    gen_samples = "--samples" in sys.argv

    lang = "ru" if only_ru else None
    voices = await list_voices(lang)

    if not voices:
        print("Голоса не найдены (для всех языков используйте --all)")
        return

    print(f"Найдено голосов: {len(voices)}\n")
    print("Locale\tName\tShortName\tGender")
    print("-" * 80)
    for v in sorted(voices, key=lambda x: (x["Locale"], x["ShortName"])):
        print(f"{v['Locale']}\t{v.get('FriendlyName', v['ShortName'])}\t{v['ShortName']}\t{v.get('Gender', '')}")

    if gen_samples:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        print(f"\nГенерирую примеры в {OUTPUT_DIR} ...")
        for v in voices:
            short = v["ShortName"]
            locale = v["Locale"]
            path = OUTPUT_DIR / f"{locale}_{short}.mp3"
            await create_sample(short, SAMPLE_TEXT_RU, str(path))
            print(f"  {path.name}")
        print("Готово. Откройте папку edge_tts_samples и прослушайте файлы.")


if __name__ == "__main__":
    asyncio.run(main())
