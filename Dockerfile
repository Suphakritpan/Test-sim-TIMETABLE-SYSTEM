# Timetable scheduler — Linux container image.
# Contains poppler-utils so `pdftotext` exists: the one ingest dependency that Windows
# machines do not ship. Build: docker build -t timetable .
FROM node:22-bookworm-slim

# pdftotext (poppler) is required by src/ingest/pdf-text.mjs
RUN apt-get update \
 && apt-get install -y --no-install-recommends poppler-utils \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies first so source edits do not invalidate the install layer
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Generated artifacts land here; mount a volume to keep them on the host
RUN mkdir -p output

# Non-root, matching the host UID by default (override with --build-arg)
ARG UID=1000
ARG GID=1000
RUN groupadd -g "$GID" app 2>/dev/null || true \
 && useradd -u "$UID" -g "$GID" -m app 2>/dev/null || true \
 && chown -R "$UID:$GID" /app
USER "$UID:$GID"

ENV NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false

# Default: run the pipeline. Override for tests / dev server:
#   docker run --rm timetable npm test
#   docker run --rm -v "$PWD/output:/app/output" timetable npm run ingest
CMD ["npm", "run", "ingest"]
