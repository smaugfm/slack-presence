import axios from 'axios';
import FormData from 'form-data';
import {log} from './util';

export async function pushoverNotify(
    title: string,
    message: string,
    getImage?: () => Promise<Buffer> | undefined,
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
  const image = await getImage?.();
  if (image) form.append('attachment', image, {filename: 'chrome.jpeg'});

  return axios.post('https://api.pushover.net/1/messages.json', form, {
    headers: form.getHeaders(),
  });
}
