import type { ConnectorMethod } from '@keepai/proto';

type ParamSchema = ConnectorMethod['params'][number];

export const ZONE_ID_PARAM: ParamSchema = { name: 'zone_id', type: 'string' as const, required: true, description: 'Zone ID' };
export const ACCOUNT_ID_PARAM: ParamSchema = { name: 'account_id', type: 'string' as const, required: true, description: 'Account ID' };
export const PAGE_PARAM: ParamSchema = { name: 'page', type: 'number' as const, required: false, description: 'Page number (default 1)' };
export const PER_PAGE_PARAM: ParamSchema = { name: 'per_page', type: 'number' as const, required: false, description: 'Results per page (default 20)' };
export const LIST_PARAMS: ParamSchema[] = [PAGE_PARAM, PER_PAGE_PARAM];
