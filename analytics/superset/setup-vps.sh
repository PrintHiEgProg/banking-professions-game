#!/usr/bin/env bash
# Superset для «Профессии в Банке» на чистом сервере Ubuntu 22.04/24.04 — одной командой.
#   1) ставит Docker (если его нет);
#   2) создаёт .env: спросит домен и адрес базы, сам придумает ключ и пароль admin;
#   3) поднимает Superset + Caddy (HTTPS-сертификат Let's Encrypt — автоматически);
#   4) собирает дашборд (bootstrap.py) и печатает ссылку.
# Запуск (на сервере, из папки analytics/superset):  sudo bash setup-vps.sh
# Повторный запуск безопасен: пересоберёт контейнеры и дашборд, .env не трогает.
set -euo pipefail
cd "$(dirname "$0")"
COMPOSE="docker compose -f docker-compose.vps.yml"

say() { printf '\n\033[1;32m▶ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }

if ! command -v docker >/dev/null 2>&1; then
  say "Ставлю Docker"
  curl -fsSL https://get.docker.com | sh
fi

if [ ! -f .env ]; then
  say "Настройка (.env)"
  read -rp "Домен для дашборда (например stats.mysite.ru; без домена — Enter, возьму <IP>.sslip.io): " DOMAIN
  if [ -z "$DOMAIN" ]; then
    IP=$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')
    DOMAIN="${IP}.sslip.io"
  fi
  read -rp "DATABASE_URL (та же база Neon, что у игры на Vercel): " DATABASE_URL
  read -rp "Открыть дашборд по ссылке без логина (для жюри)? [Y/n]: " PUB
  [[ "${PUB:-Y}" =~ ^[Nn] ]] && PUBLIC=0 || PUBLIC=1
  PASS=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)
  cat > .env <<EOF
DOMAIN=$DOMAIN
SUPERSET_SECRET_KEY=$(openssl rand -hex 32)
ADMIN_PASSWORD=$PASS
DATABASE_URL=$DATABASE_URL
SUPERSET_PUBLIC=$PUBLIC
EOF
  chmod 600 .env
  echo "Сохранено в .env (пароль admin: $PASS)"
fi

set -a
# shellcheck disable=SC1091
. ./.env
set +a

# DNS должен указывать на этот сервер, иначе Let's Encrypt не выдаст сертификат
MYIP=$(curl -fsS https://api.ipify.org 2>/dev/null || true)
DNSIP=$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1{print $1}' || true)
if [ -n "$MYIP" ] && [ "$DNSIP" != "$MYIP" ]; then
  warn "$DOMAIN указывает на «${DNSIP:-ничего}», а IP этого сервера — $MYIP."
  warn "Добавь у регистратора домена запись A: ${DOMAIN%%.*} → $MYIP (обновляется 5–30 минут), потом запусти скрипт ещё раз."
fi

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null && ufw allow 443/tcp >/dev/null
fi

say "Собираю и запускаю Superset + Caddy (первый раз 3–5 минут)"
$COMPOSE up -d --build

say "Жду, пока Superset запустится"
for _ in $(seq 1 60); do
  if $COMPOSE exec -T superset curl -fsS http://localhost:8088/health >/dev/null 2>&1; then break; fi
  sleep 5
done
$COMPOSE exec -T superset curl -fsS http://localhost:8088/health >/dev/null || {
  warn "Superset не отвечает. Логи: $COMPOSE logs superset --tail 80"
  exit 1
}

if [ -n "${DATABASE_URL:-}" ]; then
  say "Собираю дашборд"
  ARGS=()
  [ "${SUPERSET_PUBLIC:-0}" = "1" ] && ARGS+=(--public)
  $COMPOSE exec -T superset python /app/analytics/superset/bootstrap.py "${ARGS[@]}"
else
  warn "DATABASE_URL пуст — впиши его в .env и запусти скрипт ещё раз, чтобы собрать дашборд."
fi

say "Готово"
echo "Дашборд: https://$DOMAIN/superset/dashboard/professii-hr/"
echo "Вход:    https://$DOMAIN/login/  (admin / пароль из .env)"
[ "${SUPERSET_PUBLIC:-0}" = "1" ] && echo "Открыт по ссылке без логина — можно делать QR-код."
echo "Если HTTPS не открывается сразу: Caddy получает сертификат 1–2 минуты ($COMPOSE logs caddy)."
