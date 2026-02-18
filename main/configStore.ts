import { AppConfig } from '../shared/types';

export interface ConfigStore {
  get(key: 'config'): AppConfig;
  set(key: 'config', value: AppConfig): void;
}
