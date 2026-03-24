FROM golang:1.22-alpine AS build
WORKDIR /app
COPY services/gateway/go.mod services/gateway/go.sum* ./
RUN go mod download || true
COPY services/gateway/ ./
RUN CGO_ENABLED=0 go build -o /bin/gateway ./cmd/gateway

FROM alpine:3.19
WORKDIR /app
COPY --from=build /bin/gateway /usr/local/bin/gateway
EXPOSE 8080
ENTRYPOINT ["gateway"]
