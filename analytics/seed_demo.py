"""Тестовые (ДЕМО) данные для проверки дашборда, пока реальных игроков мало.

Все строки помечены source='demo'. Перед показом реальной статистики их нужно удалить:
    python seed_demo.py --clear

Запуск:  DATABASE_URL=postgres://... python seed_demo.py [--players 300]
Нужен пакет psycopg2-binary.
"""
import argparse
import json
import os
import random
import uuid
from datetime import datetime, timedelta, timezone

import psycopg2

PROFS = ["teller", "credit", "advisor", "cash", "security"]
# демо-предпочтения: какие профессии чаще пробуют и как они «заходят»
APPEAL = {"teller": 0.75, "credit": 0.6, "advisor": 0.7, "cash": 0.8, "security": 0.9}
AGES = [("7-10", 0.2), ("11-13", 0.45), ("14+", 0.35)]
DEVICES = [("mobile", 0.62), ("desktop", 0.33), ("tablet", 0.05)]


def pick(pairs):
    r, acc = random.random(), 0.0
    for v, w in pairs:
        acc += w
        if r <= acc:
            return v
    return pairs[-1][0]


def url():
    u = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
    if not u:
        raise SystemExit("Задай DATABASE_URL")
    return u


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--players", type=int, default=300)
    ap.add_argument("--days", type=int, default=10)
    ap.add_argument("--clear", action="store_true", help="удалить все демо-данные")
    a = ap.parse_args()
    con = psycopg2.connect(url())
    cur = con.cursor()
    here = os.path.dirname(os.path.abspath(__file__))
    cur.execute(open(os.path.join(here, "schema.sql"), encoding="utf-8").read())
    if a.clear:
        cur.execute("DELETE FROM game_events WHERE source = 'demo'")
        print(f"Удалено демо-строк: {cur.rowcount}")
        con.commit()
        return
    rows = []
    now = datetime.now(timezone.utc)
    for _ in range(a.players):
        anon, sess = str(uuid.uuid4()), str(uuid.uuid4())
        age, dev = pick(AGES), pick(DEVICES)
        t = now - timedelta(days=random.random() * a.days, minutes=random.random() * 600)

        def ev(name, **kw):
            nonlocal t
            t += timedelta(seconds=random.randint(5, 90))
            rows.append((t, anon, sess, name, kw.get("prof"), kw.get("shift"), kw.get("stars"), kw.get("value"), age, dev, json.dumps(kw["data"]) if kw.get("data") else None))

        ev("session_start", data={"returning": False})
        if random.random() < 0.12:
            continue
        ev("game_start")
        if random.random() < 0.8:
            ev("tutorial_done")
        n_try = random.choices([1, 2, 3, 4, 5], weights=[22, 14, 12, 10, 42])[0]
        order = sorted(PROFS, key=lambda p: -APPEAL[p] * random.random())[:n_try]
        likes = {}
        for p in order:
            ev("cabinet_enter", prof=p)
            for s in range(1, random.choices([1, 2, 3], weights=[60, 28, 12])[0] + 1):
                ev("shift_start", prof=p, shift=s)
                stars = random.choices([1, 2, 3], weights=[2, 4, 4 + APPEAL[p] * 6])[0]
                t += timedelta(minutes=random.uniform(3, 8))
                ev("shift_end", prof=p, shift=s, stars=stars, value=random.randint(200, 480))
                if random.random() < 0.85:
                    v = 3 if random.random() < APPEAL[p] * 0.75 else (2 if random.random() < 0.7 else 1)
                    likes[p] = v
                    ev("like", prof=p, shift=s, value=v)
        if n_try == 5:
            top = max(PROFS, key=lambda p: likes.get(p, 2) + APPEAL[p] + random.random())
            second = random.choice([p for p in PROFS if p != top])
            tr = {k: round(random.uniform(0.35, 0.95), 3) for k in ("people", "numbers", "attention", "pressure")}
            ev("profile_ready", prof=top, value=random.randint(72, 96), data={"second": second, "tried": 5, **tr})
            ev("profile_open", prof=top, data={"source": "auto", "tried": 5})
            if random.random() < 0.3:
                ev("career_click", prof=top)
            if random.random() < 0.25:
                ev("share_card", prof=top, data={"action": random.choice(["download", "share"])})
    cur.executemany(
        "INSERT INTO game_events (received_at, client_ts, anon_id, session_id, event, prof, shift, stars, value, age_group, device, source, data) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'demo', %s)",
        [(r[0], r[0], *r[1:]) for r in rows],
    )
    con.commit()
    print(f"Добавлено демо-событий: {len(rows)} от {a.players} игроков (source='demo'). Удалить: python seed_demo.py --clear")


if __name__ == "__main__":
    main()
