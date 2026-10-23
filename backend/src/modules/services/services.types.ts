import { Service } from '../../types/shared.js';

export interface ListServicesQuery {
  tier?: string;
  health?: string;
  environment?: string;
}

export type ServiceRecord = Service;
