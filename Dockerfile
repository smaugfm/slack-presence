FROM alpine

RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      yarn \
      dumb-init

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup -S pptruser && adduser -S -g pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /opt/app \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /opt/app

# Run everything after as non-privileged user.
USER pptruser

WORKDIR /opt/app

COPY package*.json yarn.lock ./
RUN yarn install

COPY . .

ENV TS_NODE_FILES=true
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--require", "ts-node/register", "index.ts", "--project", "tsconfig.json"]

EXPOSE 9222
