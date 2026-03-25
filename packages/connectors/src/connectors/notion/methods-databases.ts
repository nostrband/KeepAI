// Method descriptions sourced from @notionhq/client Client.d.ts JSDoc comments.
// Parameter names sourced from @notionhq/client api-endpoints.js.

import type { ConnectorMethod } from '@keepai/proto';
import { DATABASE_ID_PARAM } from './params.js';

export const databasesMethods: ConnectorMethod[] = [
  {
    name: 'databases.retrieve',
    description: 'Retrieve a database',
    operationType: 'read',
    params: [DATABASE_ID_PARAM],
    returns: 'Database object',
  },
  {
    name: 'databases.create',
    description: 'Create a database',
    operationType: 'write',
    params: [
      { name: 'parent', type: 'object', required: true, description: 'Parent page — { type: "page_id", page_id }' },
      { name: 'title', type: 'array', required: false, description: 'Rich text title' },
      { name: 'description', type: 'array', required: false, description: 'Rich text description' },
      { name: 'is_inline', type: 'boolean', required: false, description: 'Inline database' },
      { name: 'initial_data_source', type: 'object', required: false, description: 'Initial data source config' },
      { name: 'icon', type: 'object', required: false, description: 'Database icon' },
      { name: 'cover', type: 'object', required: false, description: 'Cover image' },
    ],
    returns: 'Database object',
  },
  {
    name: 'databases.update',
    description: 'Update a database',
    operationType: 'write',
    params: [
      DATABASE_ID_PARAM,
      { name: 'parent', type: 'object', required: false, description: 'Move database to new parent' },
      { name: 'title', type: 'array', required: false, description: 'Rich text title' },
      { name: 'description', type: 'array', required: false, description: 'Rich text description' },
      { name: 'is_inline', type: 'boolean', required: false, description: 'Inline status' },
      { name: 'icon', type: 'object', required: false, description: 'Database icon' },
      { name: 'cover', type: 'object', required: false, description: 'Cover image' },
      { name: 'in_trash', type: 'boolean', required: false, description: 'Move to/from trash' },
      { name: 'is_locked', type: 'boolean', required: false, description: 'Lock/unlock' },
    ],
    returns: 'Updated database object',
  },
];
