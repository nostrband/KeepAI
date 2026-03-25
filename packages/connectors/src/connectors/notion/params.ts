import type { ConnectorMethod } from '@keepai/proto';

type ParamSchema = ConnectorMethod['params'][number];

export const PAGE_ID_PARAM: ParamSchema = { name: 'page_id', type: 'string' as const, required: true, description: 'Page ID' };
export const BLOCK_ID_PARAM: ParamSchema = { name: 'block_id', type: 'string' as const, required: true, description: 'Block ID' };
export const DATABASE_ID_PARAM: ParamSchema = { name: 'database_id', type: 'string' as const, required: true, description: 'Database ID' };
export const DATA_SOURCE_ID_PARAM: ParamSchema = { name: 'data_source_id', type: 'string' as const, required: true, description: 'Data source ID' };
export const USER_ID_PARAM: ParamSchema = { name: 'user_id', type: 'string' as const, required: true, description: 'User ID' };
export const VIEW_ID_PARAM: ParamSchema = { name: 'view_id', type: 'string' as const, required: true, description: 'View ID' };
export const COMMENT_ID_PARAM: ParamSchema = { name: 'comment_id', type: 'string' as const, required: true, description: 'Comment ID' };
export const FILE_UPLOAD_ID_PARAM: ParamSchema = { name: 'file_upload_id', type: 'string' as const, required: true, description: 'File upload ID' };
export const START_CURSOR_PARAM: ParamSchema = { name: 'start_cursor', type: 'string' as const, required: false, description: 'Pagination cursor from previous response' };
export const PAGE_SIZE_PARAM: ParamSchema = { name: 'page_size', type: 'number' as const, required: false, description: 'Number of results (max 100)' };
export const PAGINATION_PARAMS: ParamSchema[] = [START_CURSOR_PARAM, PAGE_SIZE_PARAM];
