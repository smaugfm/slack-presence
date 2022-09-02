import {Notifier, NotifierFactory, NotifierUrl} from '../types';
import {log} from '../util/misc';
import FormData from 'form-data';
import axios from 'axios';

export const PushoverNotifierFactory: NotifierFactory = {
  createNotifier(): Notifier | undefined {
    const userKey = process.env.PUSHOVER_USER_KEY;
    const apiToken = process.env.PUSHOVER_API_TOKEN;
    if (!userKey || !apiToken || !validateCredentials(apiToken, userKey))
      return undefined;

    return {
      async notify(
          title: string,
          message: string,
          imagePromise?: Promise<Buffer>,
          url?: NotifierUrl,
      ): Promise<void> {
        const userKey = process.env.PUSHOVER_USER_KEY;
        const apiToken = process.env.PUSHOVER_API_TOKEN;
        if (!userKey || !apiToken) {
          log.info('No Pushover credentials. Skipping notification.');
          return;
        }

        let form = new FormData();
        form.append('token', apiToken);
        form.append('user', userKey);
        form.append('title', title);
        form.append('message', message);
        if (url) {
          form.append('url', url.url);
          if (url.urlTitle) form.append('url_title', url.urlTitle);
        }
        const image = await imagePromise;
        if (image) form.append('attachment', image, {filename: 'chrome.jpeg'});

        log.info("Sending Pushover notification: ", {
          title,
          message,
          url
        });
        return axios.post('https://api.pushover.net/1/messages.json', form, {
          headers: form.getHeaders(),
        });
      },
    };
  },
};

async function validateCredentials(token: string, userKey: string) {
  const result = await axios.post(
      `https://api.pushover.net/1/users/validate.json?token=${token}&user=${userKey}`,
  );
  log.info('Pushover keys validation result: ', result.data);

  return result.status === 200;
}
