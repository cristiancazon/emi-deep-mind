FROM node:20-alpine AS base

# Fase de dependencias
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Fase de construcción
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables públicas para el Build
ARG NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDmzsEDr7h85sz8bmOkueflRUo6clR-G1Y
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=emi-deepmine.firebaseapp.com
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID=emi-deepmine
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=emi-deepmine.firebasestorage.app
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=455340787036
ARG NEXT_PUBLIC_FIREBASE_APP_ID=1:455340787036:web:dff23d0c25594565b1ed99
ARG NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyD3y0CO5JNf-hXEmz1vmMjPPAeB05NkxIc

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_GEMINI_API_KEY=$NEXT_PUBLIC_GEMINI_API_KEY

# DESACTIVAR CHEQUEOS Y TELEMETRÍA
ENV NEXT_TELEMETRY_DISABLED 1
ENV SKIP_TYPESCRIPT_CHECK true
ENV SKIP_ESLINT_CHECK true

# Usa esta línea exacta en tu Dockerfile
ENV FIREBASE_SERVICE_ACCOUNT='{"project_id":"emi-deepmine","private_key":"-----BEGIN PRIVATE KEY-----\nBUILD_DUMMY\n-----END PRIVATE KEY-----","client_email":"build@emi-deepmine.iam.gserviceaccount.com"}'

# Ejecutar el build
RUN npm run build

# Fase de ejecución
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080
ENV PORT 8080
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]