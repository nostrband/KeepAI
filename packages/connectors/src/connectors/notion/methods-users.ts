// Method descriptions sourced from @notionhq/client Client.d.ts JSDoc comments.

import type { ConnectorMethod } from '@keepai/proto';
import { USER_ID_PARAM, PAGINATION_PARAMS } from './params.js';

export const usersMethods: ConnectorMethod[] = [
  {
    name: 'users.retrieve',
    description: 'Retrieve a user',
    operationType: 'read',
    params: [USER_ID_PARAM],
    returns: 'User object',
  },
  {
    name: 'users.list',
    description: 'List all users',
    operationType: 'read',
    params: [...PAGINATION_PARAMS],
    returns: 'Paginated list of user objects',
  },
  {
    name: 'users.me',
    description: 'Get details about bot',
    operationType: 'read',
    params: [],
    returns: 'Bot user object',
  },
];
