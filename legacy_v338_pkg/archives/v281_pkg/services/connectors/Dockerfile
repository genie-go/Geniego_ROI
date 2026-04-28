FROM node:20-alpine
WORKDIR /app
COPY services/connectors/package.json services/connectors/package-lock.json* ./
RUN npm install --omit=dev || npm install
COPY services/connectors/ ./
RUN npm run build
EXPOSE 9100
CMD ["node", "dist/index.js"]
