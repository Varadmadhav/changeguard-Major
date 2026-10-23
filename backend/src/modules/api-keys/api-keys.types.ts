import { ApiKey, CreateApiKeyResponse } from '../../types/shared.js';

export interface CreateApiKeyBody {
  name: string;
}

export type MaskedApiKey = ApiKey;
export type CreatedApiKeyResult = CreateApiKeyResponse;
