import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  Settings,
  SlackStatus,
  WsClientMessage,
  WsServerMessage,
} from '../common/common';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { isEqual } from 'lodash';

type ServerContextProps = {
  status?: SlackStatus;
  settings?: Settings;
};

const Context = createContext<ServerContextProps>({});

export function useSettings(): [
  Settings | undefined,
  <T extends keyof Settings>(key: T, value: Settings[T]) => Promise<void>,
] {
  const context = useContext(Context);

  const onChange = useCallback(
    async <T extends keyof Settings>(key: T, value: Settings[T]) => {
      if (isEqual(context?.settings?.[key], value)) {
        console.log(`Setting hasn't changed. '${key}: ${value}'`);
      } else console.log(`PATCHing settings ${key}: ${value}`);
      const resp = await fetch('/api/options', {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [key]: value,
        }),
      });
      if (!resp.ok) {
        console.log('Failed to PATCH settings', resp);
      }
    },
    [context?.settings],
  );

  return [context.settings, onChange];
}

function changeHostnameToLocationHostname(url: string | undefined) {
  if (!url) return undefined;

  return url.replaceAll(new URL(url).hostname, window.location.hostname);
}

export function useStatus() {
  const value = useContext(Context);
  if (value.status?.status === 'needsReLogin' && value.status.devtoolsFrontendUrl) {
    value.status.devtoolsFrontendUrl = changeHostnameToLocationHostname(
      value.status.devtoolsFrontendUrl,
    );
  }
  return value.status;
}

const connectionStatus = {
  [ReadyState.CONNECTING]: 'Connecting',
  [ReadyState.OPEN]: 'Open',
  [ReadyState.CLOSING]: 'Closing',
  [ReadyState.CLOSED]: 'Closed',
  [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
};

export function ServerContext(props: PropsWithChildren<unknown>) {
  const port = process.env.REACT_APP_WS_PORT || '9333';
  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket<WsServerMessage>(
    `ws://${window.location.hostname}:${port}/api/socket`,
  );
  useEffect(() => {
    if (readyState) console.log('[ws] ' + connectionStatus[readyState]);
    if (readyState === ReadyState.OPEN) {
      console.log('[ws] sending initial request');
      sendJsonMessage({
        type: 'initial',
      } as WsClientMessage);
    }
  }, [readyState, sendJsonMessage]);
  const [value, setValue] = useState<ServerContextProps>({});
  useEffect(() => {
    if (lastJsonMessage) {
      console.log(`[ws] received ${lastJsonMessage?.type}`, lastJsonMessage);
      switch (lastJsonMessage.type) {
        case 'status':
          setValue(prev => ({
            ...prev,
            status: lastJsonMessage.status,
          }));
          break;
        case 'settings':
          setValue(prev => ({
            ...prev,
            settings: lastJsonMessage.settings,
          }));
          break;
      }
    }
  }, [lastJsonMessage]);

  return <Context.Provider value={value}>{props.children}</Context.Provider>;
}
