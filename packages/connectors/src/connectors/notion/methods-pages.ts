// Method descriptions sourced from @notionhq/client Client.d.ts JSDoc comments.
// Parameter names sourced from @notionhq/client api-endpoints.js (pathParams, queryParams, bodyParams).

import type { ConnectorMethod } from '@keepai/proto';
import { PAGE_ID_PARAM, PAGINATION_PARAMS } from './params.js';

export const pagesMethods: ConnectorMethod[] = [
  {
    name: 'pages.create',
    description: 'Create a page',
    operationType: 'write',
    params: [
      { name: 'parent', type: 'object', required: true, description: 'Parent — { type: "page_id", page_id } or { type: "database_id", database_id }' },
      { name: 'properties', type: 'object', required: true, description: 'Page properties (title, etc.)' },
      { name: 'icon', type: 'object', required: false, description: 'Page icon' },
      { name: 'cover', type: 'object', required: false, description: 'Page cover image' },
      { name: 'content', type: 'array', required: false, description: 'Block content' },
      { name: 'children', type: 'array', required: false, description: 'Child blocks (legacy, prefer content)' },
      { name: 'markdown', type: 'string', required: false, description: 'Markdown content' },
      { name: 'template', type: 'object', required: false, description: 'Template to use' },
      { name: 'position', type: 'object', required: false, description: 'Position among siblings' },
    ],
    returns: 'Page object',
  },
  {
    name: 'pages.retrieve',
    description: 'Retrieve a page',
    operationType: 'read',
    params: [
      PAGE_ID_PARAM,
      { name: 'filter_properties', type: 'array', required: false, description: 'Property IDs to include' },
    ],
    returns: 'Page object',
  },
  {
    name: 'pages.update',
    description: 'Update page properties',
    operationType: 'write',
    params: [
      PAGE_ID_PARAM,
      { name: 'properties', type: 'object', required: false, description: 'Properties to update' },
      { name: 'icon', type: 'object', required: false, description: 'Page icon' },
      { name: 'cover', type: 'object', required: false, description: 'Page cover image' },
      { name: 'archived', type: 'boolean', required: false, description: 'Archive/unarchive' },
      { name: 'in_trash', type: 'boolean', required: false, description: 'Move to/from trash' },
      { name: 'is_locked', type: 'boolean', required: false, description: 'Lock/unlock editing' },
      { name: 'template', type: 'object', required: false, description: 'Template settings' },
      { name: 'erase_content', type: 'boolean', required: false, description: 'Erase all content' },
      { name: 'is_archived', type: 'boolean', required: false, description: 'Archive status' },
    ],
    returns: 'Updated page object',
  },
  {
    name: 'pages.move',
    description: 'Move a page',
    operationType: 'write',
    params: [
      PAGE_ID_PARAM,
      { name: 'parent', type: 'object', required: true, description: 'New parent' },
    ],
    returns: 'Moved page object',
  },
  {
    name: 'pages.retrieveMarkdown',
    description: 'Retrieve a page as markdown',
    operationType: 'read',
    params: [
      PAGE_ID_PARAM,
      { name: 'include_transcript', type: 'boolean', required: false, description: 'Include audio/video transcript' },
    ],
    returns: 'Markdown content object',
  },
  {
    name: 'pages.updateMarkdown',
    description: "Update a page's content as markdown",
    operationType: 'write',
    params: [
      PAGE_ID_PARAM,
      { name: 'type', type: 'string', required: true, description: 'Update type: insert_content, replace_content_range, update_content, or replace_content' },
      { name: 'insert_content', type: 'object', required: false, description: 'Insert content at position' },
      { name: 'replace_content_range', type: 'object', required: false, description: 'Replace content in range' },
      { name: 'update_content', type: 'object', required: false, description: 'Update existing content' },
      { name: 'replace_content', type: 'object', required: false, description: 'Replace all content' },
    ],
    returns: 'Updated markdown content',
  },
  {
    name: 'pages.properties.retrieve',
    description: 'Retrieve page property',
    operationType: 'read',
    params: [
      PAGE_ID_PARAM,
      { name: 'property_id', type: 'string', required: true, description: 'Property ID' },
      ...PAGINATION_PARAMS,
    ],
    returns: 'Property value object',
  },
];
