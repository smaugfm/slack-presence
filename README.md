# slack-presence
Makes you appear _active_ on Slack, even when you are not😉

Runs in a Docker container, so you can self-host it or host in the cloud.</br>
Uses [Pushover](https://pushover.net/) notifications to alert you when you start & stop appearing online to your colleagues.

### Get started

The recommended way is you use a Docker container, Dockerfile and docker-compose.yml and provided in the repo for you.
You will need a Telegram bot token ([docs](https://core.telegram.org/bots#6-botfather)) and a chat id 
of your Telegram account for the bot to communicate only with your ([how to find it](https://www.alphr.com/find-chat-id-telegram/)).
1. Clone this repo (or download zip and unzip somewhere you like)
2. Create and `.env` with your telegram chat id and your bot's token like this:
  ```bash
  MASTER_CHAT_ID=11111111;
  BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
  ```
3. Create a file named `options.json` with a [URL of your Slack workspace](https://slack.com/help/articles/221769328-Locate-your-Slack-URL):
  ```json
  {
  "slackUrl": "https://example.slack.com"
  }
```
4. Run `docker-compose up -d`
5. Then message your bot `/start` command.
6. For the first setup you will need to open `chrome://inspect` and connect to your remote headless Chrome and login to Slack manually.

Available bot commands:
```
/start - Start periodically reloading the Slack page so you can appear to be online
/stop - Stop Slack page reloading
/setschedule - Set desired timespan for you to appear online in Slack. 
/clearschedule - Clear presence schedule and always appear online
/screenshot - Make a screenshot of a current headless chrome state
```


### How does it work

There are several approaches to make Slack beleive that you are active:
1. Actually being active (too hard, boring)
2. Always open Slack on a smartphone with sleep turned off (requires a separate smartphone)
3. Mouse jiggler with a desktop app (unreliable, requires a dedicated PC)
4. Slack API (no longer works)
5. Third-party (usually paid and proprietary) services, like [this](https://presencescheduler.com/) one.
6. Selenium (or simiar) tool to drive a Slack web browser tab.

This tool uses approach #6 as the most reliable and consistent one. 
It uses [Puppeteer](https://pptr.dev/) to start and drive a headless (with no UI but full-blown) Chrome 
instance which logs in to Slack web at your provided URL and then frequently refreshes the page to make you appear active.
As slack uses two-factor authentication and captcha you have to login to Slack web manually for the first time 
but fortunately [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) allows you to remotely 
connect to a headless Chrome and do all the work in a nice way.
