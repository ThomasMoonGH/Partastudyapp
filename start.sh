# Запускаем сервер токенов в фоне
node token-server.js &

# Запускаем Vite dev server
npm run dev -- --host 0.0.0.0
