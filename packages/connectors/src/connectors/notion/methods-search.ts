// Method descriptions sourced from @notionhq/client Client.d.ts JSDoc comments.

import type { ConnectorMethod } from '@keepai/proto';
import { PAGINATION_PARAMS } from './params.js';

export const searchMethods: ConnectorMethod[] = [
  {
    name: 'search',
    description: 'Search by title',
    operationType: 'read',
    params: [
      { name: 'query', type: 'string', required: false, description: 'Search query text' },
      { name: 'sort', type: 'object', required: false, description: 'Sort — { direction: "ascending"|"descending", timestamp: "last_edited_time" }' },
      { name: 'filter', type: 'object', required: false, description: 'Filter — { value: "page"|"database", property: "object" }' },
      ...PAGINATION_PARAMS,
    ],
    returns: 'Paginated search results (pages and databases)',
  },
];
