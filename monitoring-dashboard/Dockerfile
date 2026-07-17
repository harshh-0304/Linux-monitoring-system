FROM node:22-alpine AS builder
WORKDIR /app
COPY monitoring-dashboard/package.json monitoring-dashboard/package-lock.json ./
RUN npm ci
COPY monitoring-dashboard/ .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
