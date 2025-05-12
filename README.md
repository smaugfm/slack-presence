# slack-presence

Makes you appear _active_ on Slack, even when you are not😉

Runs in a Docker container, so you can self-host it or host in the cloud.</br>
Uses [Pushover](https://pushover.net/) notifications to alert you when you start & stop appearing
online.

### Getting started

You will need [Docker](https://docs.docker.com/get-docker/) installed on your system.
For the initial setup follow these steps:

1. Get the
   default [docker-compose.yml](https://raw.githubusercontent.com/smaug-fm/slack-presence/master/docker-compose.yml)
   and place it somewhere on your machine. In that folder slack-presence will create `chrome` folder
   with internal Chrome user data
   and `options.json` with slack-presence settings.

2. Change `TZ=Europe/Kiev` in the `docke-compose.yml` file to your
   local [timezone](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).
3. Run the following command in the workfolder where you placed `docker-compose.yml`
   ```bash
   docker-compopse up -d
   ```
4. Visit [http://localhost:9333](http://localhost:9333) and:
    - Enter your Slack workspace URL.
    - Optionally, change an online appearance schedule, or leave the default 9am to 6pm.
    - Enable Slack-presence
5. For the first time you will have to manually log in to your Slack workspace.
   Ensure you have the Chrome browser installed and follow instructions [here](#manual-log-in).
6. You are good to go! You now appear as Active on Slack from Monday till Friday by your selected
   schedule.
7. Optional. Setup [Pushover](https://pushover.net/) notifications.

From time to time your Slack login session will expire, and you will have to re-log in manually.

### Manual log in

To manually log in to your Slack workspace,
you will use the built-in Chrome feature that enables connection to a remote headless Chrome
instance that Slack workspace launched:

1. Open Chrome browser
2. Go to `chrome://inspect` page
3. Configure a new network target:
    1. Click 'Configure' under the 'Devices' section
    2. Add a new list entry with an IP address or hostname of your Slack presence app and Chrome
       remote debugging port (default is `9222`)
    3. Click 'Done'
4. Now tab or multiple tabs from an internal Slack Presence Chrome headless instance must appear
   under the 'Remote Target' section. Try refreshing `chrome://inspect` page if they don't.
5. Click 'inspect' on the first tab
6. A dedicated DevTools page will open with a page asking you to log in to your Slack workspace
7. Follow your typical log in procedure
8. After a successful login, you will see your Slack workspace loaded, and you have now finished
   manual log in to Slack

### Pushover notifications

Slack-presence can notify you via [Pushover](https://pushover.net/) when you start/stop appearing
online, when your Slack login session has expired or when something went wrong.
I personally also use this feature as a reminder to start/end my workday🙂.
<br/>
<br/>
To setup Pushover you have to create an account there and obtain two keys:

- Your User Key (example: `zLkWytJOeiuBFambEOTHCuTYJCbwTJ`)
- Your API Token/Key (example: `bfRUJGNjsFxJSlYkDlMYdSFXuewHjT`)

Update your `docker-compose.json` with your keys (I used example keys here):

```bash
- PUSHOVER_USER_KEY=zLkWytJOeiuBFambEOTHCuTYJCbwTJ
- PUSHOVER_API_TOKEN=bfRUJGNjsFxJSlYkDlMYdSFXuewHjT
```

Then restart slack-presence:

```bash
docker-compose restart
```

### How does it work

There are several approaches to make Slack believe that you are active:

1. Actually being active (too hard, boring)
2. Always open Slack on a smartphone with sleep turned off (requires a separate smartphone)
3. Mouse jiggler with a desktop app (unreliable, requires a dedicated PC with a GUI)
4. Slack API (no longer works)
5. Third-party (usually paid and proprietary) services, like [this](https://presencescheduler.com/)
   one.
6. Selenium (or similar) tool to drive a Slack web browser tab.

This tool uses approach #6 as the most reliable and consistent one. It's basically like #1, but
automated.
It uses [Puppeteer](https://pptr.dev/) to start and drive a headless (with no graphical UI but
full-featured) Chrome instance which logs in to Slack web app at your provided workspace URL and
then periodically refreshes the page to make you appear active.
As Slack uses two-factor authentication and captcha you have to log in to Slack web manually for the
first time (and then from time to time when login session expires)
but fortunately [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
allows you to remotely
connect to a headless Chrome and do all the work in a nice way.
