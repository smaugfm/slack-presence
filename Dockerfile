FROM ghcr.io/puppeteer/puppeteer:24.8.2

USER root
RUN apt update && apt install dumb-init

RUN mkdir -p /opt/app && chown -R pptruser:pptruser /opt/app
USER pptruser

COPY ./dist /opt/app
WORKDIR /opt/app

ENV HTTP_SERVER_HOST=0.0.0.0
ENV HTTP_SERVER_PORT=9333
ENV CHROME_DEBUG_PORT=9222
ENV REMOTE_URL_BASE=http://${HTTP_SERVER_HOST}:${HTTP_SERVER_PORT}

EXPOSE $CHROME_DEBUG_PORT
EXPOSE $HTTP_SERVER_PORT

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "main.js"]
