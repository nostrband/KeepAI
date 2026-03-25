// Method descriptions sourced from @notionhq/client Client.d.ts JSDoc comments.
// Parameter names sourced from @notionhq/client api-endpoints.js.

import type { ConnectorMethod } from '@keepai/proto';
import { DATA_SOURCE_ID_PARAM, PAGINATION_PARAMS } from './params.js';

export const dataSourcesMethods: ConnectorMethod[] = [
  {
    name: 'dataSources.retrieve',
    description: 'Retrieve a data source',
    operationType: 'read',
    params: [DATA_SOURCE_ID_PARAM],
    returns: 'Data source object',
  },
  {
    name: 'dataSources.query',
    description: 'Query a data source',
    operationType: 'read',
    params: [
      DATA_SOURCE_ID_PARAM,
      { name: 'filter', type: 'object', required: false, description: 'Filter conditions' },
      { name: 'sorts', type: 'array', required: false, description: 'Sort criteria' },
      { name: 'filter_properties', type: 'array', required: false, description: 'Property IDs to include' },
      { name: 'archived', type: 'boolean', required: false, description: 'Include archived' },
      { name: 'in_trash', type: 'boolean', required: false, description: 'Include trashed' },
      { name: 'result_type', type: 'string', required: false, description: 'Result type' },
      ...PAGINATION_PARAMS,
    ],
    returns: 'Paginated query results',
  },
  {
    name: 'dataSources.create',
    description: 'Create a data source',
    operationType: 'write',
    params: [
      { name: 'parent', type: 'object', required: true, description: 'Parent' },
      { name: 'properties', type: 'object', required: false, description: 'Properties schema' },
      { name: 'title', type: 'array', required: false, description: 'Rich text title' },
      { name: 'icon', type: 'object', required: false, description: 'Icon' },
    ],
    returns: 'Data source object',
  },
  {
    name: 'dataSources.update',
    description: 'Update a data source',
    operationType: 'write',
    params: [
      DATA_SOURCE_ID_PARAM,
      { name: 'archived', type: 'boolean', required: false, description: 'Archive status' },
      { name: 'title', type: 'array', required: false, description: 'Title' },
      { name: 'icon', type: 'object', required: false, description: 'Icon' },
      { name: 'properties', type: 'object', required: false, description: 'Properties schema' },
      { name: 'in_trash', type: 'boolean', required: false, description: 'Trash status' },
      { name: 'parent', type: 'object', required: false, description: 'Move to new parent' },
    ],
    returns: 'Updated data source object',
  },
  {
    name: 'dataSources.listTemplates',
    description: 'List page templates that are available for a data source',
    operationType: 'read',
    params: [
      DATA_SOURCE_ID_PARAM,
      { name: 'name', type: 'string', required: false, description: 'Filter by template name' },
      ...PAGINATION_PARAMS,
    ],
    returns: 'Paginated list of template objects',
  },
];
