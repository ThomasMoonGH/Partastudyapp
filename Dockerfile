FROM node:20-alpine

WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы
COPY . .

# Открываем порты 3000 (Vite) и 3001 (Token server)
EXPOSE 3000 3001

# Запускаем и Vite dev server, и token server одновременно
CMD ["sh", "-c", "node token-server.js & npm run dev -- --host 0.0.0.0"]

