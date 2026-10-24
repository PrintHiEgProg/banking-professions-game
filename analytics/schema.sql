-- Таблица событий игры. Её же создаёт api/events.js при первом событии — здесь она для справки и для bootstrap.
CREATE TABLE IF NOT EXISTS game_events (
  id          bigserial PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now(),
  client_ts   timestamptz,
  anon_id     text NOT NULL,          -- случайный id браузера, не связан с именем игрока
  session_id  text,
  event       text NOT NULL,          -- session_start, game_start, cabinet_enter, shift_start, shift_end, like, profile_ready, profile_open, career_click, share_card, certificate, tutorial_done
  prof        text,                   -- teller, credit, advisor, cash, security
  shift       smallint,               -- 1..5
  stars       smallint,               -- 1..3
  value       real,                   -- длительность смены (сек), оценка 1..3, % совпадения профиля
  age_group   text,                   -- 7-10, 11-13, 14+ (по выбранной сложности)
  device      text,                   -- mobile, tablet, desktop
  source      text NOT NULL DEFAULT 'game',  -- 'demo' — сгенерированные тестовые данные
  data        jsonb                   -- только числа и коды из белого списка
);
CREATE INDEX IF NOT EXISTS game_events_event_idx ON game_events (event, received_at);
CREATE INDEX IF NOT EXISTS game_events_anon_idx ON game_events (anon_id);
