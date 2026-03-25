// Method descriptions sourced from @notionhq/client Client.d.ts JSDoc comments.

import type { ConnectorMethod } from '@keepai/proto';
import { COMMENT_ID_PARAM, PAGINATION_PARAMS } from './params.js';

export const commentsMethods: ConnectorMethod[] = [
  {
    name: 'comments.create',
    description: 'Create a comment',
    operationType: 'write',
    params: [
      { name: 'rich_text', type: 'array', required: true, description: 'Comment content as rich text' },
      { name: 'parent', type: 'object', required: false, description: 'Parent page { page_id } for page-level comment' },
      { name: 'discussion_id', type: 'string', required: false, description: 'Discussion thread ID for reply' },
      { name: 'attachments', type: 'array', required: false, description: 'File attachments' },
      { name: 'display_name', type: 'string', required: false, description: 'Display name override' },
    ],
    returns: 'Comment object',
  },
  {
    name: 'comments.list',
    description: 'List comments',
    operationType: 'read',
    params: [
      { name: 'block_id', type: 'string', required: true, description: 'Block or page ID to list comments for' },
      ...PAGINATION_PARAMS,
    ],
    returns: 'Paginated list of comment objects',
  },
  {
    name: 'comments.retrieve',
    description: 'Retrieve a comment',
    operationType: 'read',
    params: [COMMENT_ID_PARAM],
    returns: 'Comment object',
  },
];
