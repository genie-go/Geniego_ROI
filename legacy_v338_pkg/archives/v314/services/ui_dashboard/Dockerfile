FROM node:20-alpine
WORKDIR /app
COPY services/ui_dashboard/package.json services/ui_dashboard/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY services/ui_dashboard/ .
EXPOSE 3000
CMD ["npm","run","dev"]
