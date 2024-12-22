import { atom } from 'recoil';

export interface Settings {
  providers: {
    [key: string]: {
      enabled: boolean;
      baseUrl?: string;
      apiKey?: string;
    };
  };
}

export const settingsState = atom<Settings>({
  key: 'settingsState',
  default: {
    providers: {},
  },
});
