FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --silent || true
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
