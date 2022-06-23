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
ARG SERVER_PORT=8080
ENV REACT_APP_WS_PORT=$SERVER_PORT
RUN yarn build

ENV PORT=$SERVER_PORT
ENV HOST=0.0.0.0
ENV CHROME_DEBUG_PORT=9222
ENV TS_NODE_FILES=true
EXPOSE $CHROME_DEBUG_PORT
EXPOSE $PORT
ENTRYPOINT ["dumb-init", "--"]
CMD ["yarn", "express"]

