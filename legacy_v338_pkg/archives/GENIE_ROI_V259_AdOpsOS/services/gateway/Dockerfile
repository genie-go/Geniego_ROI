
FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod .
RUN go mod tidy
COPY . .
RUN go build -o gateway

FROM alpine:3.20
COPY --from=build /app/gateway /gateway
CMD ["/gateway"]
