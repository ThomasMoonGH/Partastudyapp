#!/bin/bash

# Тест интеграции LiveKit + Partastudyapp

echo "🧪 Тест интеграции LiveKit + Partastudyapp"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен"
    exit 1
fi

echo "✅ Docker и Docker Compose установлены"
echo ""

# Остановка существующих контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker-compose down 2>/dev/null || true

# Очистка портов
echo "🧹 Очистка портов..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo ""

# Запуск сервисов
echo "🚀 Запуск сервисов..."
docker-compose up -d

echo ""
echo "⏳ Ожидание запуска сервисов..."



# Проверка App
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
echo "🎉 Интеграция готова к тестированию!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Приложение: http://localhost:3000"
echo ""
echo "📋 Для тестирования:"
echo "   1. Откройте http://localhost:3000 в двух браузерах"
echo "   2. Создайте тестовую сессию"
echo "   3. Разрешите доступ к камере/микрофону"
echo "   4. Проверьте видеозвонок"
echo ""
echo "📋 Полезные команды:"
echo "   Логи:       docker-compose logs -f"
echo "   Остановка:  docker-compose down"
echo "   Перезапуск: docker-compose restart"
echo ""

# Показываем логи
echo "📋 Логи (Ctrl+C для остановки):"
echo ""
docker-compose logs -f
