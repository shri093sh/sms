FROM node:20-alpine AS base
WORKDIR /app

# pg_dump (server/src/jobs/backupJob.js shells out to it) needs the matching
# client major version — postgresql16-client to match the docker-compose
# postgres:16-alpine service below. If you point this at a different major
# version of Postgres in production, change this package to match.
RUN apk add --no-cache postgresql16-client

# Install deps first so this layer is cached across code-only changes.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 4000

# Apply any pending migrations, then start the API. `migrate deploy` (not
# `migrate dev`) is the production-safe form: it never prompts and never
# generates a new migration from schema drift.
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
