export default {
  translation: {
    commands: {
      start: "Starting to appear online on Slack at [{{displayUrl}}]({{url}}) from {{start}} to {{end}}",
      stop: "Stopping to appear online on Slack",
      clearschedule: "Online appearance schedule has been cleared",
      setschedule: {
        first: "Send slack online appearance automatic start time (24h format). Example: 08:00",
        second: "Send end time. Example: 16:00",
        third: "Online appearance schedule has been set to:\n    *{{start}}* to *{{end}}*",
      },
    },
    loginFailed:
      "Slack login session has probably expired\\.\nGo to chrome *chrome://inspect* tab in Chrome browser, connect to this " +
      "headless Chrome instance and manually re\\-login to Slack\\. To re\\-activate Slack online presence send me a /start command\\.",
    pageClosed: "Presence is stopped so no page to make screenshot of",
    error: "Unexpected error occurred.",
    fatal: "Unexpected error occurred. Exiting bot",
  },
};
