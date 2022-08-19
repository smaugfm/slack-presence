import { Notifier, NotifierFactory } from '../types';
import { log } from '../../util/misc';
import FormData from 'form-data';
import axios from 'axios';

export class PushoverNotifier implements NotifierFactory {
  createNotifier(): Notifier | undefined {
    const userKey = process.env.PUSHOVER_USER_KEY;
    const apiToken = process.env.PUSHOVER_API_TOKEN;
    if (!userKey || !apiToken || !this.validateCredentials(apiToken, userKey))
      return undefined;

    return {
      async notify(
        title: string,
        message: string,
        imagePromise?: Promise<Buffer>,
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
        const image = await imagePromise;
        if (image) form.append('attachment', image, { filename: 'chrome.jpeg' });

        return axios.post('https://api.pushover.net/1/messages.json', form, {
          headers: form.getHeaders(),
        });
      },
    };
  }

  async validateCredentials(token: string, userKey: string) {
    const result = await axios.post(
      `https://api.pushover.net/1/users/validate.json?token=${token}&user=${userKey}`,
    );
    log.info('Pushover keys validation result: ', result.data);

    return result.status === 200;
  }
}
