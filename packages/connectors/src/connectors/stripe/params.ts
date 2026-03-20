import type { ConnectorMethod } from '@keepai/proto';

type ParamSchema = ConnectorMethod['params'][number];

export const ID_PARAM: ParamSchema = { name: 'id', type: 'string' as const, required: true, description: 'Resource ID' };
export const LIMIT_PARAM: ParamSchema = { name: 'limit', type: 'number' as const, required: false, description: 'Number of results (1-100, default 10)', default: 10 };
export const STARTING_AFTER_PARAM: ParamSchema = { name: 'starting_after', type: 'string' as const, required: false, description: 'Cursor for pagination — ID of last object from previous page' };
export const ENDING_BEFORE_PARAM: ParamSchema = { name: 'ending_before', type: 'string' as const, required: false, description: 'Cursor for reverse pagination' };
export const METADATA_PARAM: ParamSchema = { name: 'metadata', type: 'object' as const, required: false, description: 'Key-value metadata' };
export const LIST_PARAMS: ParamSchema[] = [LIMIT_PARAM, STARTING_AFTER_PARAM, ENDING_BEFORE_PARAM];
export const SEARCH_QUERY_PARAM: ParamSchema = { name: 'query', type: 'string' as const, required: true, description: 'Search query using Stripe Search Query Language' };
export const SEARCH_PAGE_PARAM: ParamSchema = { name: 'page', type: 'string' as const, required: false, description: 'Pagination cursor from previous search response' };

// Quick helper to build a simple CRUD method set
export function crudMethods(
  resource: string,
  singular: string,
  opts: {
    create?: { params: any[]; returns?: string };
    retrieve?: { params?: any[]; returns?: string };
    update?: { params?: any[]; returns?: string };
    list?: { params?: any[]; returns?: string };
    del?: { returns?: string; description?: string };
    search?: boolean;
    extra?: ConnectorMethod[];
  },
): ConnectorMethod[] {
  const result: ConnectorMethod[] = [];

  if (opts.create) {
    result.push({
      name: `${resource}.create`,
      description: `Create a ${singular}`,
      operationType: 'write',
      params: [...opts.create.params, METADATA_PARAM],
      returns: opts.create.returns || `${singular} object`,
    });
  }

  if (opts.retrieve) {
    result.push({
      name: `${resource}.retrieve`,
      description: `Retrieve a ${singular} by ID`,
      operationType: 'read',
      params: opts.retrieve.params || [ID_PARAM],
      returns: opts.retrieve.returns || `${singular} object`,
    });
  }

  if (opts.update) {
    result.push({
      name: `${resource}.update`,
      description: `Update a ${singular}`,
      operationType: 'write',
      params: opts.update.params || [ID_PARAM, METADATA_PARAM],
      returns: opts.update.returns || `Updated ${singular} object`,
    });
  }

  if (opts.list) {
    result.push({
      name: `${resource}.list`,
      description: `List ${resource}`,
      operationType: 'read',
      params: [...(opts.list.params || []), ...LIST_PARAMS],
      returns: opts.list.returns || `List of ${singular} objects`,
    });
  }

  if (opts.del) {
    result.push({
      name: `${resource}.delete`,
      description: opts.del.description || `Delete a ${singular}`,
      operationType: 'delete',
      params: [ID_PARAM],
      returns: opts.del.returns || `Deleted ${singular} confirmation`,
    });
  }

  if (opts.search) {
    result.push({
      name: `${resource}.search`,
      description: `Search ${resource} using Stripe Search Query Language`,
      operationType: 'read',
      params: [SEARCH_QUERY_PARAM, SEARCH_PAGE_PARAM, LIMIT_PARAM],
      returns: `Search results with ${singular} objects`,
    });
  }

  if (opts.extra) result.push(...opts.extra);

  return result;
}
