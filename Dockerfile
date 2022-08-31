FROM alpine

RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      dumb-init

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup -S pptruser && adduser -S -g pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /opt/app \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /opt/app

# Run everything after as non-privileged user.
USER pptruser

COPY ./dist /opt/app
WORKDIR /opt/app

ARG HTTP_SERVER_PORT=9333

ENV REACT_APP_WS_PORT=$HTTP_SERVER_PORT
ENV HTTP_SERVER_PORT=$HTTP_SERVER_PORT
ENV HTTP_SERVER_HOST=0.0.0.0
ENV CHROME_DEBUG_PORT=9222

EXPOSE $CHROME_DEBUG_PORT
EXPOSE $PORT

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "main.js"]
