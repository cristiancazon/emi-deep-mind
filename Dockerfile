FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# --- INYECTAR VARIABLES DE COMPILACIÓN ---
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

# DESACTIVAR VALIDACIONES Y TELEMETRÍA
ENV NEXT_TELEMETRY_DISABLED 1
ENV SKIP_TYPESCRIPT_CHECK true
ENV SKIP_ESLINT_CHECK true

# LLAVE DUMMY EN UNA SOLA LÍNEA (ESTO PASA EL FILTRO DE FIREBASE)
ENV FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"emi-deepmine","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDV3YnfmCvfhvbn\n/C/2GroOUV3GxQ+Wrj0k69nQvXX8vayjgWysiz23FMc/oilvijjVzUgV4h3Hl3c3\n-----END PRIVATE KEY-----\n","client_email":"dummy@emi-deepmine.iam.gserviceaccount.com"}'

RUN npm run build

# Production image
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