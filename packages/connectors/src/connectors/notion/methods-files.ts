// Method descriptions sourced from @notionhq/client Client.d.ts JSDoc comments.

import type { ConnectorMethod } from '@keepai/proto';
import { FILE_UPLOAD_ID_PARAM, PAGINATION_PARAMS } from './params.js';

export const fileUploadsMethods: ConnectorMethod[] = [
  {
    name: 'fileUploads.create',
    description: 'Create a file upload',
    operationType: 'write',
    params: [
      { name: 'mode', type: 'string', required: false, description: 'Upload mode: single_part or multi_part' },
      { name: 'filename', type: 'string', required: false, description: 'File name' },
      { name: 'content_type', type: 'string', required: false, description: 'MIME type' },
      { name: 'number_of_parts', type: 'number', required: false, description: 'Part count for multi-part' },
      { name: 'external_url', type: 'string', required: false, description: 'URL for external file' },
    ],
    returns: 'File upload object with id and upload URLs',
  },
  {
    name: 'fileUploads.retrieve',
    description: 'Retrieve a file upload',
    operationType: 'read',
    params: [FILE_UPLOAD_ID_PARAM],
    returns: 'File upload object',
  },
  {
    name: 'fileUploads.list',
    description: 'List file uploads',
    operationType: 'read',
    params: [
      { name: 'status', type: 'string', required: false, description: 'Filter by status' },
      ...PAGINATION_PARAMS,
    ],
    returns: 'Paginated list of file upload objects',
  },
  {
    name: 'fileUploads.send',
    description: 'Send a file upload. Uses multipart/form-data.',
    operationType: 'write',
    params: [
      FILE_UPLOAD_ID_PARAM,
      { name: 'file', type: 'object', required: true, description: 'File data — { data: string|Blob, filename?: string }' },
      { name: 'part_number', type: 'string', required: false, description: 'Part number for multi-part uploads' },
    ],
    returns: 'File upload object',
  },
  {
    name: 'fileUploads.complete',
    description: 'Complete a multi-part file upload',
    operationType: 'write',
    params: [FILE_UPLOAD_ID_PARAM],
    returns: 'Completed file upload object',
  },
];
