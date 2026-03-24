FROM golang:1.22-alpine AS build
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /bin/gateway ./cmd/gateway

FROM alpine:3.20
RUN adduser -D -H appuser
USER appuser
WORKDIR /home/appuser
COPY --from=build /bin/gateway /usr/local/bin/gateway
COPY policies /home/appuser/policies
EXPOSE 8080
ENV GATEWAY_PORT=8080
CMD ["gateway"]
