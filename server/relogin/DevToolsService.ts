import axios from "axios";
import {log} from "../util/misc";

export class DevToolsService {
  private readonly host: string;
  private readonly chromeDebugPort: number;
  constructor(host: string, chromeDebugPort: number) {
    this.chromeDebugPort = chromeDebugPort;
    this.host = host;
  }

  async getDevtoolsFrontendUrl() {
    const chromeUrl = `http://${this.host}:${this.chromeDebugPort}`;
    const result = await axios.get(`${chromeUrl}/json`);
    let devtoolsFrontendUrl = result?.data?.[0]?.devtoolsFrontendUrl;
    log.info('DevTools URL: ' + devtoolsFrontendUrl);
    if (devtoolsFrontendUrl) devtoolsFrontendUrl = `${chromeUrl}${devtoolsFrontendUrl}`;

    return devtoolsFrontendUrl;
  }
}
