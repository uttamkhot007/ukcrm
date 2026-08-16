# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# NOTE: This image targets the self-hosted AWS deployment. The frontend talks
# to the Fastify backend via VITE_API_URL — it does NOT use Supabase. Any
# leftover Supabase or Lovable references are caught by `verify-aws-bundle.mjs`
# below and will fail the build.
ARG VITE_API_URL=""
ARG GIT_COMMIT_SHA=""
ARG APP_RELEASE_ID=""
ARG APP_ENVIRONMENT="production"
ENV VITE_API_URL=$VITE_API_URL
ENV GITHUB_SHA=$GIT_COMMIT_SHA
ENV APP_RELEASE_ID=$APP_RELEASE_ID
ENV APP_ENVIRONMENT=$APP_ENVIRONMENT

# Install dependencies
COPY package.json bun.lock* package-lock.json* ./
RUN npm ci --ignore-scripts || npm install

# Copy source and build (production mode strips Supabase via vite aliases).
COPY . .
RUN npm run build

# CI/CD GATE: fail the image build if the bundle still references Supabase
# or Lovable. This is the last line of defense before the image is pushed
# to ECR. The script lives in scripts/verify-aws-bundle.mjs.
RUN node scripts/verify-aws-bundle.mjs

# Stage 2: Production
FROM nginx:1.27-alpine AS production

# Security: run as non-root
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -D appuser && \
    chown -R appuser:appgroup /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && chown appuser:appgroup /var/run/nginx.pid

# Copy custom nginx config
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

EXPOSE 8080

USER appuser

CMD ["nginx", "-g", "daemon off;"]
