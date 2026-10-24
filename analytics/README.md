# Анонимная статистика для HR → Superset

Игра сама пишет анонимные события: какие профессии открывают и проходят подростки, как им понравилась работа,
какую профессию посоветовал профиль стажёра, перешли ли на страницу «Карьера» банка. Данные лежат в Postgres,
HR смотрит их в дашборде **Apache Superset** «Профессии в Банке — HR-аналитика» (12 графиков, обновляется раз в минуту).

```
игра (браузер) ──POST /api/events──▶ функция Vercel (api/events.js) ──▶ Postgres ◀── Superset (дашборд HR)
```

## Что собираем и чего НЕ собираем

| Собираем | Не собираем |
|---|---|
| случайный id браузера (не связан с именем) | никнейм, имя, e-mail, телефон |
| событие: зашёл в кабинет, начал/закончил смену, ответ «Как тебе эта работа?», профиль готов, клик «Карьера в банке», карточка для друзей | IP-адрес, User-Agent, геолокацию |
| профессия, номер смены, звёзды, длительность смены | любой свободный текст |
| возрастная группа по выбранной сложности (7–10, 11–13, 14+) | точный возраст, дату рождения |
| тип устройства (телефон / компьютер / планшет) | модель устройства |

Сервер принимает только поля из белого списка (лишние отбрасывает). Адрес функций задаёт строка
`<meta name="bank-api" content="/api">` в `index.html`: без неё игра работает без статистики и прокси курсов. Игрок может выключить статистику на титульном
экране («Статистика: выкл»); если в браузере включено «Не отслеживать», статистика не отправляется вообще.

## 1. База данных (5 минут)

1. Vercel → проект игры → **Storage → Create Database → Neon (Postgres)** → бесплатный план → **Connect** к проекту.
   В проект добавится переменная `DATABASE_URL`.
2. **Redeploy** проекта (Deployments → … → Redeploy) — функция `api/events.js` подхватит базу и сама создаст таблицу
   `game_events` при первом событии.
3. Проверка: сыграй смену, затем в консоли Neon (SQL Editor): `select event, count(*) from game_events group by 1;`

Подойдёт любой Postgres (Supabase, свой сервер банка): нужна только переменная `DATABASE_URL` в Vercel.

## 2. Superset

**Если у банка уже есть Superset** — переходи к шагу 3 и укажи его адрес.

**Свой Superset в Docker:**
```bash
cd analytics/superset
SUPERSET_SECRET_KEY=$(openssl rand -hex 32) ADMIN_PASSWORD=придумай docker compose up -d --build
# через 1–2 минуты: http://localhost:8088  (admin / твой пароль)
```

**Без Docker (так дашборд проверен — Superset 4.1.2, Python 3.11):**
```bash
python3.11 -m venv .venv && . .venv/bin/activate
pip install "apache-superset==4.1.2" psycopg2-binary "marshmallow<4" "setuptools<70"
export SUPERSET_CONFIG_PATH=$PWD/analytics/superset/superset_config.py SUPERSET_METADATA_URI=sqlite:///$PWD/superset.db
export SUPERSET_SECRET_KEY=$(openssl rand -hex 32) FLASK_APP=superset
superset db upgrade && superset fab create-admin --username admin --firstname HR --lastname Bank --email hr@example.com --password admin && superset init
superset run -p 8088 --with-threads
```

## 3. Дашборд одной командой

```bash
pip install requests psycopg2-binary
python analytics/superset/bootstrap.py --superset http://localhost:8088 --user admin --password admin --db "$DATABASE_URL"
```
Скрипт создаёт в базе представления (`analytics/views.sql`), подключает базу к Superset, делает наборы данных,
12 графиков и дашборд `…/superset/dashboard/professii-hr/`. Повторный запуск пересобирает дашборд.

Если Superset в Docker, а база на этом же компьютере, добавь адрес базы «как его видит Superset»:
`--superset-db "postgresql://user:pass@host.docker.internal:5432/db"`.

## Что на дашборде

- **Игроков · Сыграно смен · Получили профиль · Открыли «Карьера в банке»** — главные цифры.
- **Какие профессии выбирают** — сколько игроков сыграли смену в каждой профессии и сколько раз профиль её посоветовал.
- **Как тебе эта работа?** — 😍 / 🙂 / 😐 после смены, по профессиям.
- **Воронка** — от запуска игры до перехода на страницу стажировки банка, с процентами.
- **Что советует профиль стажёра** — доля рекомендаций по профессиям.
- **Игроки и смены по дням**, **С чего играют** (телефон / компьютер).
- **Возраст × профессия** — какие профессии интересны разным возрастам.
- **Сводка по профессиям** — таблица: зашли, сыграли, звёзды, доля «😍», рекомендации.

## Демо-данные

Чтобы посмотреть дашборд до реальных игроков:
```bash
DATABASE_URL=… python analytics/seed_demo.py --players 300   # добавить (помечены source='demo')
DATABASE_URL=… python analytics/seed_demo.py --clear          # удалить перед показом реальных цифр
```
На выступлении лучше показывать **реальные** данные: дай поиграть участникам хакатона по QR-коду — дашборд
обновляется сам раз в минуту.

## Локальная проверка всей цепочки

```bash
npm i                                                    # драйвер pg для функции
DATABASE_URL=postgres://… node tests/devserver.mjs 8790  # игра + /api/events, как на Vercel
# открыть http://localhost:8790/?stats=1 и сыграть смену
```
