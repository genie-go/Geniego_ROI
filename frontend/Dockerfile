# Build
# ★ Node 버전 정본은 저장소 루트의 .nvmrc 다(CI 는 setup-node 의 node-version-file 로 그 값을 읽는다).
#   Dockerfile 의 FROM 은 파일을 읽을 수 없으므로 ARG 로 노출한다 — .nvmrc 변경 시 이 기본값도 함께 맞춘다.
#   빌드 시 덮어쓰려면: docker build --build-arg NODE_VERSION=20 .
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine as build
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build

# Serve
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
