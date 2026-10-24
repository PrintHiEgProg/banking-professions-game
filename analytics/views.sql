-- Представления для дашборда Superset «Профессии в Банке — HR». Каждое — готовый набор данных для графика.
-- Пересоздаются безопасно: CREATE OR REPLACE.

-- Профессии по-русски и в одном порядке
CREATE OR REPLACE VIEW v_prof AS
SELECT * FROM (VALUES
  ('teller',   '🧾 Операционист',           1),
  ('credit',   '📝 Кредитный эксперт',      2),
  ('advisor',  '📈 Финансовый консультант', 3),
  ('cash',     '🚚 Инкассатор',             4),
  ('security', '🛡 Финансовая безопасность', 5),
  ('hr',       '🤝 HR-специалист',          6),
  ('devops',   '⚙️ DevOps-инженер',         7)
) AS t(prof, prof_title, ord);

-- Все события с понятными подписями
CREATE OR REPLACE VIEW v_events AS
SELECT e.id, e.received_at, (e.received_at AT TIME ZONE 'Europe/Moscow')::date AS day, e.anon_id, e.session_id, e.event,
       e.prof, p.prof_title, e.shift, e.stars, e.value, e.source,
       CASE e.age_group WHEN '7-10' THEN '7–10 лет' WHEN '11-13' THEN '11–13 лет' WHEN '14+' THEN '14+ лет' ELSE 'не указан' END AS age_label,
       CASE e.device WHEN 'mobile' THEN 'Телефон' WHEN 'tablet' THEN 'Планшет' WHEN 'desktop' THEN 'Компьютер' ELSE '—' END AS device_label
FROM game_events e LEFT JOIN v_prof p ON p.prof = e.prof;

-- Главные цифры одной строкой
CREATE OR REPLACE VIEW v_kpi AS
SELECT
  (SELECT count(DISTINCT anon_id) FROM game_events)                                   AS players,
  (SELECT count(*) FROM game_events WHERE event = 'shift_end')                        AS shifts,
  (SELECT count(DISTINCT anon_id) FROM game_events WHERE event = 'profile_ready')     AS profiles,
  (SELECT count(DISTINCT anon_id) FROM game_events WHERE event = 'career_click')      AS career_clicks,
  (SELECT count(*) FROM game_events WHERE event = 'share_card')                       AS shares,
  (SELECT round(avg(value)::numeric / 60, 1) FROM game_events WHERE event = 'shift_end' AND value BETWEEN 10 AND 3600) AS avg_shift_min;

-- Интерес к профессиям: зашли в кабинет, сыграли, звёзды и «Как тебе эта работа?» (последний ответ игрока)
CREATE OR REPLACE VIEW v_prof_interest AS
WITH likes AS (
  SELECT DISTINCT ON (anon_id, prof) anon_id, prof, value
  FROM game_events WHERE event = 'like' AND prof IS NOT NULL
  ORDER BY anon_id, prof, received_at DESC
)
SELECT p.ord, p.prof, p.prof_title,
  (SELECT count(DISTINCT anon_id) FROM game_events e WHERE e.event = 'cabinet_enter' AND e.prof = p.prof) AS players_entered,
  (SELECT count(DISTINCT anon_id) FROM game_events e WHERE e.event = 'shift_end' AND e.prof = p.prof)     AS players_played,
  (SELECT count(*) FROM game_events e WHERE e.event = 'shift_end' AND e.prof = p.prof)                    AS shifts_played,
  (SELECT round(avg(stars)::numeric, 2) FROM game_events e WHERE e.event = 'shift_end' AND e.prof = p.prof) AS avg_stars,
  (SELECT count(*) FROM likes l WHERE l.prof = p.prof AND l.value = 3) AS like_love,
  (SELECT count(*) FROM likes l WHERE l.prof = p.prof AND l.value = 2) AS like_ok,
  (SELECT count(*) FROM likes l WHERE l.prof = p.prof AND l.value = 1) AS like_no,
  (SELECT round(100.0 * count(*) FILTER (WHERE l.value = 3) / NULLIF(count(*), 0), 1) FROM likes l WHERE l.prof = p.prof) AS love_pct,
  (SELECT count(*) FROM (SELECT DISTINCT ON (anon_id) anon_id, prof FROM game_events WHERE event = 'profile_ready' ORDER BY anon_id, received_at DESC) r WHERE r.prof = p.prof) AS recommended
FROM v_prof p;

-- Что советует профиль стажёра (последний профиль каждого игрока) + стиль игры
CREATE OR REPLACE VIEW v_recommendations AS
SELECT DISTINCT ON (e.anon_id) e.anon_id, e.received_at, e.prof, p.prof_title, e.value AS match_pct,
       CASE e.age_group WHEN '7-10' THEN '7–10 лет' WHEN '11-13' THEN '11–13 лет' WHEN '14+' THEN '14+ лет' ELSE 'не указан' END AS age_label,
       (e.data->>'people')::float * 100    AS people,
       (e.data->>'numbers')::float * 100   AS numbers,
       (e.data->>'attention')::float * 100 AS attention,
       (e.data->>'pressure')::float * 100  AS pressure,
       (e.data->>'tech')::float * 100      AS tech
FROM game_events e LEFT JOIN v_prof p ON p.prof = e.prof
WHERE e.event = 'profile_ready'
ORDER BY e.anon_id, e.received_at DESC;

-- Воронка: от первого запуска до перехода на страницу «Карьера» банка
CREATE OR REPLACE VIEW v_funnel AS
WITH pl AS (
  SELECT anon_id,
         bool_or(event = 'game_start')    AS started,
         bool_or(event = 'shift_end')     AS played,
         count(DISTINCT prof) FILTER (WHERE event = 'shift_end') AS tried,
         bool_or(event = 'profile_ready') AS profiled,
         bool_or(event = 'career_click')  AS career
  FROM game_events GROUP BY anon_id
)
SELECT * FROM (VALUES
  (1, '1. Открыли игру',               (SELECT count(*) FROM pl)),
  (2, '2. Начали игру',                (SELECT count(*) FROM pl WHERE started)),
  (3, '3. Сыграли смену',              (SELECT count(*) FROM pl WHERE played)),
  (4, '4. Попробовали 3+ профессии',   (SELECT count(*) FROM pl WHERE tried >= 3)),
  (5, '5. Получили профиль',           (SELECT count(*) FROM pl WHERE profiled)),
  (6, '6. Открыли «Карьера в банке»',  (SELECT count(*) FROM pl WHERE career))
) AS f(step, stage, players);

-- Активность по дням
CREATE OR REPLACE VIEW v_daily AS
SELECT (received_at AT TIME ZONE 'Europe/Moscow')::date AS day,
       count(DISTINCT anon_id)                                  AS players,
       count(*) FILTER (WHERE event = 'shift_end')              AS shifts,
       count(DISTINCT anon_id) FILTER (WHERE event = 'game_start') AS new_players
FROM game_events GROUP BY 1;

-- Кто во что играет: возраст × профессия (игроки, сыгравшие хотя бы одну смену)
DROP VIEW IF EXISTS v_age_prof;
CREATE VIEW v_age_prof AS
SELECT p.prof_title AS "Профессия", p.ord,
       CASE e.age_group WHEN '7-10' THEN '7–10 лет' WHEN '11-13' THEN '11–13 лет' WHEN '14+' THEN '14+ лет' ELSE 'не указан' END AS "Возраст",
       count(DISTINCT e.anon_id) AS players
FROM game_events e JOIN v_prof p ON p.prof = e.prof
WHERE e.event = 'shift_end'
GROUP BY 1, 2, 3;

-- Устройства
CREATE OR REPLACE VIEW v_devices AS
SELECT CASE device WHEN 'mobile' THEN 'Телефон' WHEN 'tablet' THEN 'Планшет' WHEN 'desktop' THEN 'Компьютер' ELSE '—' END AS device_label,
       count(DISTINCT anon_id) AS players
FROM game_events WHERE event = 'session_start' GROUP BY 1;
