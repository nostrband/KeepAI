// Method descriptions sourced from @notionhq/client Client.d.ts JSDoc comments.

import type { ConnectorMethod } from '@keepai/proto';
import { VIEW_ID_PARAM, PAGINATION_PARAMS } from './params.js';

export const viewsMethods: ConnectorMethod[] = [
  {
    name: 'views.create',
    description: 'Create a view',
    operationType: 'write',
    params: [],
    returns: 'View object',
  },
  {
    name: 'views.retrieve',
    description: 'Retrieve a view',
    operationType: 'read',
    params: [VIEW_ID_PARAM],
    returns: 'View object',
  },
  {
    name: 'views.update',
    description: 'Update a view',
    operationType: 'write',
    params: [VIEW_ID_PARAM],
    returns: 'Updated view object',
  },
  {
    name: 'views.delete',
    description: 'Delete a view',
    operationType: 'delete',
    params: [VIEW_ID_PARAM],
    returns: 'Deleted view confirmation',
  },
  {
    name: 'views.list',
    description: 'List views for a database',
    operationType: 'read',
    params: [
      { name: 'database_id', type: 'string', required: false, description: 'Database ID filter' },
      { name: 'data_source_id', type: 'string', required: false, description: 'Data source ID filter' },
      ...PAGINATION_PARAMS,
    ],
    returns: 'Paginated list of view objects',
  },
  {
    name: 'views.queries.create',
    description: 'Create a view query',
    operationType: 'write',
    params: [VIEW_ID_PARAM],
    returns: 'View query object',
  },
  {
    name: 'views.queries.results',
    description: 'Get view query results',
    operationType: 'read',
    params: [
      VIEW_ID_PARAM,
      { name: 'query_id', type: 'string', required: true, description: 'Query ID' },
      ...PAGINATION_PARAMS,
    ],
    returns: 'Paginated query results',
  },
  {
    name: 'views.queries.delete',
    description: 'Delete a view query',
    operationType: 'delete',
    params: [
      VIEW_ID_PARAM,
      { name: 'query_id', type: 'string', required: true, description: 'Query ID' },
    ],
    returns: 'Deletion confirmation',
  },
];
