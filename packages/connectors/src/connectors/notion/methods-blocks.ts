// Method descriptions sourced from @notionhq/client Client.d.ts JSDoc comments.
// Parameter names sourced from @notionhq/client api-endpoints.js.

import type { ConnectorMethod } from '@keepai/proto';
import { BLOCK_ID_PARAM, PAGINATION_PARAMS } from './params.js';

export const blocksMethods: ConnectorMethod[] = [
  {
    name: 'blocks.retrieve',
    description: 'Retrieve block',
    operationType: 'read',
    params: [BLOCK_ID_PARAM],
    returns: 'Block object',
  },
  {
    name: 'blocks.update',
    description: 'Update block',
    operationType: 'write',
    params: [
      BLOCK_ID_PARAM,
      { name: 'archived', type: 'boolean', required: false, description: 'Archive/unarchive' },
      { name: 'in_trash', type: 'boolean', required: false, description: 'Move to/from trash' },
      { name: 'type', type: 'string', required: false, description: 'Block type (for type-specific updates)' },
      // Type-specific body params are passed through as-is to the SDK
      { name: 'paragraph', type: 'object', required: false, description: 'Paragraph block content' },
      { name: 'heading_1', type: 'object', required: false, description: 'Heading 1 content' },
      { name: 'heading_2', type: 'object', required: false, description: 'Heading 2 content' },
      { name: 'heading_3', type: 'object', required: false, description: 'Heading 3 content' },
      { name: 'bulleted_list_item', type: 'object', required: false, description: 'Bulleted list item content' },
      { name: 'numbered_list_item', type: 'object', required: false, description: 'Numbered list item content' },
      { name: 'quote', type: 'object', required: false, description: 'Quote block content' },
      { name: 'to_do', type: 'object', required: false, description: 'To-do block content' },
      { name: 'toggle', type: 'object', required: false, description: 'Toggle block content' },
      { name: 'code', type: 'object', required: false, description: 'Code block content' },
      { name: 'callout', type: 'object', required: false, description: 'Callout block content' },
      { name: 'embed', type: 'object', required: false, description: 'Embed block content' },
      { name: 'bookmark', type: 'object', required: false, description: 'Bookmark block content' },
      { name: 'image', type: 'object', required: false, description: 'Image block content' },
      { name: 'video', type: 'object', required: false, description: 'Video block content' },
      { name: 'file', type: 'object', required: false, description: 'File block content' },
      { name: 'audio', type: 'object', required: false, description: 'Audio block content' },
      { name: 'pdf', type: 'object', required: false, description: 'PDF block content' },
      { name: 'equation', type: 'object', required: false, description: 'Equation block content' },
      { name: 'table_row', type: 'object', required: false, description: 'Table row content' },
    ],
    returns: 'Updated block object',
  },
  {
    name: 'blocks.delete',
    description: 'Delete block',
    operationType: 'delete',
    params: [BLOCK_ID_PARAM],
    returns: 'Deleted block confirmation',
  },
  {
    name: 'blocks.children.list',
    description: 'Retrieve block children',
    operationType: 'read',
    params: [
      BLOCK_ID_PARAM,
      ...PAGINATION_PARAMS,
    ],
    returns: 'Paginated list of child block objects',
  },
  {
    name: 'blocks.children.append',
    description: 'Append block children',
    operationType: 'write',
    params: [
      BLOCK_ID_PARAM,
      { name: 'children', type: 'array', required: true, description: 'Block objects to append' },
      { name: 'after', type: 'string', required: false, description: 'Block ID to insert after' },
      { name: 'position', type: 'object', required: false, description: 'Position specification' },
    ],
    returns: 'Appended block children',
  },
];
