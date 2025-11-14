#!/bin/bash

# Development script для Partastudyapp с LiveKit

set -e

echo "🚀 Partastudyapp Development Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker Desktop:"
    echo "   https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен"
    exit 1
fi

# Проверка что мы в правильной директории
if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
    echo "❌ Запустите скрипт из корня проекта Partastudyapp"
    exit 1
fi

echo "📦 Проверка зависимостей..."

# Проверка .env файлов
if [ ! -f ".env.development" ]; then
    echo "⚠️  .env.development не найден, создаю..."
    cat > .env.development << 'EOF'
VITE_LIVEKIT_URL=wss://partastudyapp-3jhslurr.livekit.cloud
VITE_SUPABASE_URL=https://bkfvtbgalchwoimwtzsu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZnZ0YmdhbGNod29pbXd0enN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODgwOTYsImV4cCI6MjA3NjQ2NDA5Nn0.QW9TAXDbPpnutULtCGmSjnM619bP1imq6vSObv6K1nY
EOF
fi

echo "✅ Конфигурация готова"
echo ""

# Остановка существующих контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker-compose down 2>/dev/null || true

# Очистка портов если заняты
echo "🧹 Проверка портов..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Порт 3000 занят, освобождаю..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

echo ""

# Запуск сервисов
echo "🚀 Запуск Docker Compose..."
docker-compose up -d

echo ""
echo "⏳ Ожидание запуска сервисов..."

# Ожидание запуска App
echo "   App..."
for i in {1..30}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ App не запустился"
        docker-compose logs app
        exit 1
    fi
    sleep 2
done

echo "✅ Все сервисы запущены!"
echo ""

# Проверка статуса
echo "📊 Статус сервисов:"
docker-compose ps

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Partastudyapp готов к работе!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Приложение: http://localhost:3000"
echo ""
echo "📋 Полезные команды:"
echo "   Логи:       docker-compose logs -f"
echo "   Остановка:  docker-compose down"
echo "   Перезапуск: docker-compose restart"
echo ""

# Открытие браузера (только на Mac)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🚀 Открываю браузер..."
    sleep 2
    open http://localhost:3000
fi

echo "💡 Для тестирования видеозвонков:"
echo "   1. Откройте http://localhost:3000 в двух вкладках"
echo "   2. Создайте тестовую сессию"
echo "   3. Разрешите доступ к камере/микрофону"
echo "   4. Готово! 🎉"
echo ""

# Показываем логи в фоне
echo "📋 Логи (Ctrl+C для остановки):"
echo ""
docker-compose logs -f
