#!/usr/bin/env python3
import sqlite3
import os

SRC = 'telegram-bot/bot_users.db'
OUT_DIR = 'export'
OUT_FILE = os.path.join(OUT_DIR, 'sqlite_dump.sql')

os.makedirs(OUT_DIR, exist_ok=True)

conn = sqlite3.connect(SRC)
with open(OUT_FILE, 'w', encoding='utf-8') as f:
    for line in conn.iterdump():
        f.write(f"{line}\n")

conn.close()
print(f"Wrote sqlite dump to {OUT_FILE}")
