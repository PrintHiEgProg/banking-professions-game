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

## 2. Где поднять Superset

**Почему не на Vercel.** Vercel подходит для статики и коротких функций: пришёл запрос, функция ответила и уснула.
Superset — это постоянно работающий сервер на Python (около 800 МБ зависимостей) плюс своя база метаданных
(пользователи, графики, дашборды), которая должна где-то жить между запросами. Функция Vercel на Python — до 500 МБ,
постоянного диска у неё нет. Недавно Vercel научился запускать и Docker-контейнеры, но без запросов контейнер
засыпает через 5 минут, а после этого Superset стартует заново (до минуты ожидания), и метаданные всё равно нужно
выносить во внешнюю базу. Мы это не проверяли, для хакатона не советуем.

**Как всё связано.** Игра остаётся на Vercel, Superset работает на другом адресе. Напрямую они не общаются: игра пишет
события в Postgres (Neon), Superset читает оттуда. Поэтому домены могут быть любыми, и в игре настраивать ничего не нужно.

```
игрок ──▶ игра.vercel.app ──POST /api/events──▶ Neon (Postgres) ◀──читает── Superset: https://stats.домен ◀── HR / жюри
```

| Вариант | Когда подходит | Время | Ссылка / QR для жюри |
|---|---|---|---|
| **А. Superset банка** | после хакатона, внутри «Центр-инвест» | 1 команда | во внутренней сети банка |
| **Б. Свой сервер (VPS) + домен** | **лучше всего для защиты**: постоянная ссылка с HTTPS | 15–20 мин | `https://stats.домен/…` |
| **В. Ноутбук на выступлении** | запасной: показать дашборд со своего экрана | 5 мин | нет |
| **Г. Ноутбук + туннель** | нужна временная публичная ссылка прямо сейчас | 5 мин | `https://….trycloudflare.com` (новая при каждом запуске) |
| **Д. Preset.io** (облачный Superset) | без своего сервера | регистрация | бесплатно до 5 пользователей; доступ из РФ и оплату проверить заранее |

### А. У банка уже есть Superset
Сразу шаг 3: `bootstrap.py --superset https://адрес-superset-банка --user … --password … --db "$DATABASE_URL"`.
Пользователю нужны права на создание базы, наборов данных и дашбордов (роль Admin или Alpha).

### Б. Свой сервер с доменом (рекомендуем для защиты)
1. **Сервер.** Любой VPS с Ubuntu 22.04/24.04: 2 vCPU, 4 ГБ RAM (можно 2 ГБ + swap, см. ниже), 20 ГБ диска.
   Подойдут российские облака (Timeweb Cloud, Selectel, Yandex Cloud, VK Cloud и др.) — заказать и подключиться: `ssh root@IP`.
2. **Домен.** Добавь DNS-запись **A**: имя `stats`, значение — IP сервера.
   - Домен игры подключён к Vercel с его DNS → Vercel → **Domains** → домен → **DNS Records** → Add: `stats`, `A`, IP.
   - Домен у регистратора (reg.ru, nic.ru и т.п.) → там же, в разделе «DNS-записи».
   - Своего домена нет → используй `IP-сервера.sslip.io` (например `203.0.113.10.sslip.io`): такой адрес сам указывает на IP,
     и Caddy обычно получает для него сертификат.
3. **Файлы на сервер.** `git clone <репозиторий>` или с компьютера: `scp -r analytics root@IP:~/`.
4. **Запуск одной командой:**
   ```bash
   cd analytics/superset && sudo bash setup-vps.sh
   ```
   Скрипт поставит Docker, спросит домен и `DATABASE_URL` (тот же, что в Vercel: Storage → Neon → `.env.local`),
   сам придумает ключ и пароль admin (сохранит в `.env`), поднимет Superset + **Caddy** (сертификат Let's Encrypt — сам),
   соберёт дашборд и напечатает ссылку. Без скрипта то же самое руками:
   ```bash
   cp .env.example .env && nano .env
   docker compose -f docker-compose.vps.yml up -d --build
   docker compose -f docker-compose.vps.yml exec superset python /app/analytics/superset/bootstrap.py --public
   ```
5. **Ссылка для жюри:** `https://stats.домен/superset/dashboard/professii-hr/` → из неё QR-код на слайд.
   Чтобы на проекторе было без меню Superset: добавь в конец ссылки `?standalone=1`.

Полезные команды (в папке `analytics/superset`):
```bash
docker compose -f docker-compose.vps.yml logs -f superset   # логи
docker compose -f docker-compose.vps.yml restart            # перезапуск
docker compose -f docker-compose.vps.yml down               # остановить (дашборды сохранятся)
```
Если у сервера 2 ГБ памяти — добавь swap, иначе сборка образа может упасть:
`fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`.

Безопасность: наружу открыты только 80/443 (Superset спрятан за Caddy), пароль admin — случайный, `.env` с правами 600.
После хакатона поставь `SUPERSET_PUBLIC=0` в `.env` и перезапусти — дашборд будет только по логину.

### В. Ноутбук на выступлении
```bash
cd analytics/superset
SUPERSET_SECRET_KEY=$(openssl rand -hex 32) ADMIN_PASSWORD=придумай docker compose up -d --build
python bootstrap.py --superset http://localhost:8088 --user admin --password придумай --db "$DATABASE_URL"
```
База Neon доступна откуда угодно, поэтому на ноутбуке будут те же живые данные, что пишет игра на Vercel.
Открой дашборд заранее (первая загрузка графиков дольше) и держи вкладку рядом с игрой.

### Г. Ноутбук + временная публичная ссылка (туннель)
Запусти Superset как в варианте В, но с `SUPERSET_PROXY_FIX=1` и `SUPERSET_PUBLIC=1`, затем `bootstrap.py … --public` и:
```bash
cloudflared tunnel --url http://localhost:8088     # без регистрации; напечатает https://….trycloudflare.com
```
Ссылка живёт, пока ноутбук не уснул и команда работает; при перезапуске адрес новый — QR придётся переделать.
Проверь заранее в той сети, где будет защита.

### Д. Preset.io
Облачный Superset от его создателей; тариф Starter бесплатный до 5 пользователей. Подключи базу (Settings → Database
Connections → PostgreSQL → `DATABASE_URL`). `bootstrap.py` к Preset не подключится (там вход через аккаунт Preset),
поэтому дашборд переносится импортом: в своём Superset открой дашборд → «…» → **Сохранить → Экспорт в YAML**,
в Preset — Dashboards → **Import**. Доступность сервиса из РФ и оплату проверь заранее.

### Без Docker (так дашборд проверен — Superset 4.1.2, Python 3.11)
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
`--public` — открыть дашборд по ссылке без логина (нужен `SUPERSET_PUBLIC=1` у Superset; гость только смотрит).
Адрес Superset может быть и `https://stats.домен` — скрипт работает с компьютера и с сервера.

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
