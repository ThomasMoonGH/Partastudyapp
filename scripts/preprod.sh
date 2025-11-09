#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

DOMAIN=${DOMAIN:-hochip.ru}
EMAIL=${LETSENCRYPT_EMAIL:-}
ACTION=${1:-deploy}

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "❌ Docker Compose не найден. Установите Docker Compose v2 или docker-compose."
  exit 1
fi

compose() {
  "${COMPOSE_CMD[@]}" "$@"
}

require_tools() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Docker не установлен."
    exit 1
  fi
  if ! command -v curl >/dev/null 2>&1; then
    echo "⚠️  curl не найден — пропущу HTTP проверки."
  fi
}

ensure_project_root() {
  if [[ ! -f "docker-compose.yml" ]]; then
    echo "❌ Скрипт нужно запускать из корня репозитория (или через scripts/preprod.sh)."
    exit 1
  fi
}

cert_exists() {
  compose run --rm --entrypoint /bin/sh certbot -c "test -s /etc/letsencrypt/live/${DOMAIN}/fullchain.pem" >/dev/null 2>&1
}

ensure_tls_assets() {
  compose run --rm --entrypoint /bin/sh certbot -c '
set -e
python3 <<"PY"
from pathlib import Path
import urllib.request

target = Path("/etc/letsencrypt")
target.mkdir(parents=True, exist_ok=True)

files = {
    "options-ssl-nginx.conf": "https://raw.githubusercontent.com/certbot/certbot/refs/heads/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf",
    "ssl-dhparams.pem":  "https://raw.githubusercontent.com/certbot/certbot/refs/heads/master/certbot/certbot/ssl-dhparams.pem",
}

for name, url in files.items():
    dst = target / name
    if not dst.exists():
        with urllib.request.urlopen(url, timeout=10) as resp:
            dst.write_bytes(resp.read())
PY
'
}

issue_certificate() {
  if [[ -z "$EMAIL" ]]; then
    echo "❌ Укажите email для Let's Encrypt через переменную окружения LETSENCRYPT_EMAIL."
    exit 1
  fi

  echo "🛑 Останавливаю nginx, чтобы освободить порты 80/443..."
  compose stop nginx >/dev/null 2>&1 || true

  echo "🔐 Выпускаю сертификат для ${DOMAIN}..."
  "${COMPOSE_CMD[@]}" run --rm -p 80:80 -p 443:443 certbot certonly \
    --standalone \
    --preferred-challenges http \
    --agree-tos \
    --no-eff-email \
    --email "$EMAIL" \
    -d "$DOMAIN"

  echo "✅ Сертификат выпущен."
}

ensure_certificate() {
  if cert_exists; then
    echo "🔐 Найден существующий сертификат для ${DOMAIN}."
  else
    echo "🔐 Сертификат для ${DOMAIN} не найден."
    issue_certificate
  fi
}

deploy_stack() {
  echo "🚀 Сборка образа приложения..."
  compose build app

  echo "📦 Запуск внутренних сервисов (app, livekit, redis)..."
  compose up -d app livekit redis

  echo "🌐 Запуск nginx..."
  compose up -d nginx

  if command -v curl >/dev/null 2>&1; then
    echo "🔎 Проверка доступности https://${DOMAIN} ..."
    for attempt in {1..30}; do
      if curl -fsSL --connect-timeout 5 "https://${DOMAIN}" >/dev/null 2>&1; then
        echo "✅ HTTPS работает."
        break
      fi
      if [[ $attempt -eq 30 ]]; then
        echo "⚠️  Не удалось подтвердить доступность https://${DOMAIN}. Проверьте DNS и порты."
      fi
      sleep 2
    done
  fi

  echo "📊 Текущий статус сервисов:"
  compose ps
}

renew_certificates() {
  echo "🔄 Запуск продления сертификатов..."
  compose run --rm certbot renew --webroot -w /var/www/certbot
  echo "🔁 Перезагрузка nginx для применения обновлённых сертификатов..."
  compose exec nginx nginx -s reload
  echo "✅ Продление завершено."
}

force_issue() {
  cert_exists && echo "⚠️  Сертификат уже существует. Используйте renew или удалите существующий перед reissue." && exit 1
  issue_certificate
}

usage() {
  cat <<EOF
Usage: scripts/preprod.sh [deploy|renew|issue]

Commands:
  deploy   Выпускает сертификат при необходимости и запускает стек (по умолчанию).
  renew    Запускает продление сертификата и перезагружает nginx.
  issue    Принудительная первоначальная выдача сертификата (порты 80/443 должны быть свободны).

Environment variables:
  DOMAIN              Домен для HTTPS (по умолчанию hochip.ru)
  LETSENCRYPT_EMAIL   Email для Let's Encrypt (обязателен для issue/deploy при первой выдаче)
EOF
}

main() {
  require_tools
  ensure_project_root

  case "$ACTION" in
    deploy)
      ensure_certificate
      deploy_stack
      ;;
    renew)
      renew_certificates
      ;;
    issue)
      force_issue
      ;;
    -h|--help|help)
      usage
      ;;
    *)
      echo "❌ Неизвестная команда: $ACTION"
      usage
      exit 1
      ;;
  esac
}

main "$@"

