/**
 * Airtable connector — bases, tables, fields, records, comments, webhooks, and user info.
 */

import type {
  Connector,
  ConnectorMethod,
  PermissionMetadata,
  ServiceHelp,
  OAuthCredentials,
} from '@keepai/proto';
import { classifyFetchError } from '../classify-fetch-error.js';

const AIRTABLE_API = 'https://api.airtable.com/v0';

async function airtableFetch(
  path: string,
  credentials: OAuthCredentials,
  options: RequestInit = {}
): Promise<unknown> {
  const url = `${AIRTABLE_API}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw classifyFetchError(response.status, `Airtable API error ${response.status}: ${text}`, 'airtable');
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return { success: true };
  }

  return response.json();
}

function tableLabel(params: Record<string, unknown>): string {
  return `"${params.tableIdOrName || 'unknown table'}"`;
}

function describeAirtableRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case 'bases.list':
      return 'List accessible bases';
    case 'base.tables':
      return 'List tables in base';
    case 'records.list':
      return `List records from ${tableLabel(params)}${params.filterByFormula ? ` (filter: ${params.filterByFormula})` : ''}`;
    case 'records.get':
      return `Get record ${params.recordId || '(unknown)'} from ${tableLabel(params)}`;
    case 'records.create': {
      const count = Array.isArray(params.records) ? params.records.length : 1;
      return `Create ${count} record(s) in ${tableLabel(params)}`;
    }
    case 'records.update': {
      const count = Array.isArray(params.records) ? params.records.length : 1;
      return `Update ${count} record(s) in ${tableLabel(params)}`;
    }
    case 'records.upsert': {
      const count = Array.isArray(params.records) ? params.records.length : 1;
      return `Upsert ${count} record(s) in ${tableLabel(params)}`;
    }
    case 'records.delete': {
      const count = Array.isArray(params.records) ? params.records.length : 1;
      return `Delete ${count} record(s) from ${tableLabel(params)}`;
    }
    case 'comments.list':
      return `List comments on record ${params.recordId || '(unknown)'} in ${tableLabel(params)}`;
    case 'comments.create':
      return `Add comment to record ${params.recordId || '(unknown)'} in ${tableLabel(params)}`;
    case 'comments.update':
      return `Update comment ${params.commentId || '(unknown)'} on record ${params.recordId || '(unknown)'} in ${tableLabel(params)}`;
    case 'comments.delete':
      return `Delete comment ${params.commentId || '(unknown)'} from record ${params.recordId || '(unknown)'} in ${tableLabel(params)}`;
    case 'table.create':
      return `Create table "${params.name || '(unnamed)'}" in base ${params.baseId || '(unknown)'}`;
    case 'table.update':
      return `Update table ${params.tableId || '(unknown)'} in base ${params.baseId || '(unknown)'}`;
    case 'field.create':
      return `Create field "${params.name || '(unnamed)'}" in table ${params.tableId || '(unknown)'}`;
    case 'field.update':
      return `Update field ${params.fieldId || '(unknown)'} in table ${params.tableId || '(unknown)'}`;
    case 'webhooks.list':
      return `List webhooks for base ${params.baseId || '(unknown)'}`;
    case 'webhook.create':
      return `Create webhook for base ${params.baseId || '(unknown)'}`;
    case 'webhook.delete':
      return `Delete webhook ${params.webhookId || '(unknown)'} from base ${params.baseId || '(unknown)'}`;
    case 'webhook.payloads':
      return `Get payloads for webhook ${params.webhookId || '(unknown)'} in base ${params.baseId || '(unknown)'}`;
    case 'webhook.refresh':
      return `Refresh webhook ${params.webhookId || '(unknown)'} in base ${params.baseId || '(unknown)'}`;
    case 'whoami':
      return 'Get current user info';
    default:
      return `Airtable ${method}`;
  }
}

const methods: ConnectorMethod[] = [
  {
    name: 'bases.list',
    description: 'List all accessible bases',
    operationType: 'read',
    params: [
      { name: 'offset', type: 'string', required: false, description: 'Pagination offset from previous response' },
    ],
    returns: 'List of base objects with id, name, permissionLevel',
    responseExample: {
      bases: [
        { id: 'appXXXXXXXXXXXXXX', name: 'My Base', permissionLevel: 'create' },
      ],
      offset: 'itrXXXXXXXX/appXXXXXXXXXX',
    },
    seeAlso: ['base.tables'],
  },
  {
    name: 'base.tables',
    description: 'List tables and their fields in a base',
    operationType: 'read',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID (from bases.list)' },
    ],
    returns: 'List of table objects with id, name, fields, views',
    responseExample: {
      tables: [
        {
          id: 'tblXXXXXXXXXXXXXX',
          name: 'Tasks',
          fields: [
            { id: 'fldXXX', name: 'Name', type: 'singleLineText' },
            { id: 'fldYYY', name: 'Status', type: 'singleSelect' },
          ],
        },
      ],
    },
    notes: ['Use the returned table and field info to construct records.list queries'],
    seeAlso: ['bases.list', 'records.list'],
  },
  {
    name: 'records.list',
    description: 'List records from a table',
    operationType: 'read',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'tableIdOrName', type: 'string', required: true, description: 'Table ID or name' },
      { name: 'fields', type: 'array', required: false, description: 'Field names to include in response' },
      { name: 'filterByFormula', type: 'string', required: false, description: 'Airtable formula to filter records (e.g., "{Status} = \'Done\'")' },
      { name: 'maxRecords', type: 'number', required: false, description: 'Maximum total records to return' },
      { name: 'pageSize', type: 'number', required: false, description: 'Records per page (max 100)', default: 100 },
      { name: 'sort', type: 'array', required: false, description: 'Sort order — array of {field, direction} where direction is "asc" or "desc"' },
      { name: 'view', type: 'string', required: false, description: 'View ID or name to filter by' },
      { name: 'offset', type: 'string', required: false, description: 'Pagination offset from previous response' },
    ],
    returns: 'List of record objects with id, fields, createdTime',
    responseExample: {
      records: [
        { id: 'recXXXXXXXXXXXXXX', fields: { Name: 'Task 1', Status: 'In Progress' }, createdTime: '2024-01-15T10:30:00.000Z' },
      ],
      offset: 'itrXXXX/recXXXX',
    },
    notes: [
      "When 'offset' is present in the response, pass it to get the next page",
      'Use base.tables to discover field names and types',
    ],
    seeAlso: ['records.get', 'base.tables'],
  },
  {
    name: 'records.get',
    description: 'Get a single record by ID',
    operationType: 'read',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'tableIdOrName', type: 'string', required: true, description: 'Table ID or name' },
      { name: 'recordId', type: 'string', required: true, description: 'Record ID (from records.list)' },
    ],
    returns: 'Record object with id, fields, createdTime',
    responseExample: {
      id: 'recXXXXXXXXXXXXXX',
      fields: { Name: 'Task 1', Status: 'In Progress' },
      createdTime: '2024-01-15T10:30:00.000Z',
    },
    seeAlso: ['records.list'],
  },
  {
    name: 'records.create',
    description: 'Create records in a table (up to 10 per request)',
    operationType: 'write',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'tableIdOrName', type: 'string', required: true, description: 'Table ID or name' },
      { name: 'records', type: 'array', required: true, description: 'Array of {fields} objects (max 10)' },
      { name: 'typecast', type: 'boolean', required: false, description: 'If true, Airtable auto-converts string values to the appropriate cell type' },
    ],
    returns: 'Array of created record objects',
    example: {
      params: {
        baseId: 'appXXX',
        tableIdOrName: 'Tasks',
        records: [{ fields: { Name: 'New Task', Status: 'To Do' } }],
      },
      description: 'Create a task',
    },
    responseExample: {
      records: [
        { id: 'recXXX', fields: { Name: 'New Task', Status: 'To Do' }, createdTime: '2024-01-15T10:30:00.000Z' },
      ],
    },
    notes: ['Maximum 10 records per request'],
    seeAlso: ['records.update', 'base.tables'],
  },
  {
    name: 'records.update',
    description: 'Update records in a table (up to 10 per request)',
    operationType: 'write',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'tableIdOrName', type: 'string', required: true, description: 'Table ID or name' },
      { name: 'records', type: 'array', required: true, description: 'Array of {id, fields} objects (max 10)' },
      { name: 'typecast', type: 'boolean', required: false, description: 'If true, Airtable auto-converts string values' },
    ],
    returns: 'Array of updated record objects',
    example: {
      params: {
        baseId: 'appXXX',
        tableIdOrName: 'Tasks',
        records: [{ id: 'recXXX', fields: { Status: 'Done' } }],
      },
      description: 'Mark a task as done',
    },
    notes: ['Maximum 10 records per request', 'Only specified fields are updated (PATCH semantics)'],
    seeAlso: ['records.create', 'records.list'],
  },
  {
    name: 'records.upsert',
    description: 'Upsert records — update if matching fields found, create otherwise (up to 10 per request)',
    operationType: 'write',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'tableIdOrName', type: 'string', required: true, description: 'Table ID or name' },
      { name: 'records', type: 'array', required: true, description: 'Array of {fields} objects (max 10)' },
      { name: 'fieldsToMergeOn', type: 'array', required: true, description: 'Field names to match existing records on (unique key)' },
      { name: 'typecast', type: 'boolean', required: false, description: 'If true, Airtable auto-converts string values' },
    ],
    returns: 'Object with createdRecords, updatedRecords arrays and records array',
    notes: ['Maximum 10 records per request', 'fieldsToMergeOn fields must have unique values in the table'],
    seeAlso: ['records.create', 'records.update'],
  },
  {
    name: 'records.delete',
    description: 'Delete records from a table (up to 10 per request)',
    operationType: 'delete',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'tableIdOrName', type: 'string', required: true, description: 'Table ID or name' },
      { name: 'records', type: 'array', required: true, description: 'Array of record IDs to delete (max 10)' },
    ],
    returns: 'Array of deleted record objects with id and deleted flag',
    responseExample: {
      records: [{ id: 'recXXX', deleted: true }],
    },
    notes: ['Maximum 10 records per request', 'This is permanent — records cannot be recovered'],
    seeAlso: ['records.list'],
  },
  {
    name: 'comments.list',
    description: 'List comments on a record',
    operationType: 'read',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'tableIdOrName', type: 'string', required: true, description: 'Table ID or name' },
      { name: 'recordId', type: 'string', required: true, description: 'Record ID' },
      { name: 'offset', type: 'string', required: false, description: 'Pagination offset' },
    ],
    returns: 'List of comment objects',
    responseExample: {
      comments: [
        { id: 'comXXX', text: 'Looking good!', author: { id: 'usrXXX', name: 'Alice' }, createdTime: '2024-01-15T10:30:00.000Z' },
      ],
      offset: 'itrXXX',
    },
    seeAlso: ['comments.create', 'records.get'],
  },
  {
    name: 'comments.create',
    description: 'Add a comment to a record',
    operationType: 'write',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'tableIdOrName', type: 'string', required: true, description: 'Table ID or name' },
      { name: 'recordId', type: 'string', required: true, description: 'Record ID' },
      { name: 'text', type: 'string', required: true, description: 'Comment text' },
    ],
    returns: 'Created comment object',
    example: {
      params: { baseId: 'appXXX', tableIdOrName: 'Tasks', recordId: 'recXXX', text: 'Looks good!' },
      description: 'Comment on a record',
    },
    seeAlso: ['comments.list'],
  },
  {
    name: 'comments.update',
    description: 'Update a comment on a record',
    operationType: 'write',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'tableIdOrName', type: 'string', required: true, description: 'Table ID or name' },
      { name: 'recordId', type: 'string', required: true, description: 'Record ID' },
      { name: 'commentId', type: 'string', required: true, description: 'Comment ID' },
      { name: 'text', type: 'string', required: true, description: 'Updated comment text' },
    ],
    returns: 'Updated comment object',
    seeAlso: ['comments.list', 'comments.create', 'comments.delete'],
  },
  {
    name: 'comments.delete',
    description: 'Delete a comment from a record',
    operationType: 'delete',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'tableIdOrName', type: 'string', required: true, description: 'Table ID or name' },
      { name: 'recordId', type: 'string', required: true, description: 'Record ID' },
      { name: 'commentId', type: 'string', required: true, description: 'Comment ID' },
    ],
    returns: 'Deleted comment object with id and deleted flag',
    responseExample: { id: 'comXXX', deleted: true },
    seeAlso: ['comments.list', 'comments.create'],
  },
  {
    name: 'table.create',
    description: 'Create a new table in a base',
    operationType: 'write',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'name', type: 'string', required: true, description: 'Table name' },
      { name: 'description', type: 'string', required: false, description: 'Table description' },
      { name: 'fields', type: 'array', required: true, description: 'Array of field definitions — each must have name and type (e.g., singleLineText, number, singleSelect)' },
    ],
    returns: 'Created table object with id, name, fields',
    example: {
      params: {
        baseId: 'appXXX',
        name: 'Projects',
        fields: [
          { name: 'Name', type: 'singleLineText' },
          { name: 'Status', type: 'singleSelect', options: { choices: [{ name: 'Todo' }, { name: 'Done' }] } },
        ],
      },
      description: 'Create a Projects table with Name and Status fields',
    },
    notes: ['At least one field is required', 'Field types: singleLineText, multilineText, number, percent, currency, singleSelect, multipleSelects, date, dateTime, checkbox, email, url, phoneNumber, richText, etc.'],
    seeAlso: ['base.tables', 'table.update', 'field.create'],
  },
  {
    name: 'table.update',
    description: 'Update a table name or description',
    operationType: 'write',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'tableId', type: 'string', required: true, description: 'Table ID' },
      { name: 'name', type: 'string', required: false, description: 'New table name' },
      { name: 'description', type: 'string', required: false, description: 'New table description' },
    ],
    returns: 'Updated table object',
    notes: ['At least one of name or description must be provided'],
    seeAlso: ['base.tables', 'table.create'],
  },
  {
    name: 'field.create',
    description: 'Create a new field in a table',
    operationType: 'write',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'tableId', type: 'string', required: true, description: 'Table ID' },
      { name: 'name', type: 'string', required: true, description: 'Field name' },
      { name: 'type', type: 'string', required: true, description: 'Field type (e.g., singleLineText, number, singleSelect)' },
      { name: 'description', type: 'string', required: false, description: 'Field description' },
      { name: 'options', type: 'object', required: false, description: 'Type-specific options (e.g., choices for singleSelect)' },
    ],
    returns: 'Created field object with id, name, type',
    example: {
      params: {
        baseId: 'appXXX',
        tableId: 'tblXXX',
        name: 'Priority',
        type: 'singleSelect',
        options: { choices: [{ name: 'High' }, { name: 'Medium' }, { name: 'Low' }] },
      },
      description: 'Add a Priority select field',
    },
    seeAlso: ['base.tables', 'field.update', 'table.create'],
  },
  {
    name: 'field.update',
    description: 'Update a field name, description, or options',
    operationType: 'write',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'tableId', type: 'string', required: true, description: 'Table ID' },
      { name: 'fieldId', type: 'string', required: true, description: 'Field ID' },
      { name: 'name', type: 'string', required: false, description: 'New field name' },
      { name: 'description', type: 'string', required: false, description: 'New field description' },
      { name: 'options', type: 'object', required: false, description: 'Updated type-specific options' },
    ],
    returns: 'Updated field object',
    notes: ['Cannot change field type — only name, description, and options'],
    seeAlso: ['base.tables', 'field.create'],
  },
  {
    name: 'webhooks.list',
    description: 'List webhooks for a base',
    operationType: 'read',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
    ],
    returns: 'List of webhook objects with id, type, notificationUrl, specification',
    responseExample: {
      webhooks: [
        { id: 'ach00000000000001', type: 'client', notificationUrl: 'https://example.com/hook', isHookEnabled: true },
      ],
    },
    seeAlso: ['webhook.create', 'webhook.delete', 'webhook.payloads'],
  },
  {
    name: 'webhook.create',
    description: 'Create a webhook to receive notifications for changes in a base',
    operationType: 'write',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'notificationUrl', type: 'string', required: false, description: 'URL to receive POST notifications (optional — if omitted, use webhook.payloads to poll)' },
      { name: 'specification', type: 'object', required: true, description: 'Webhook specification with options.filters defining what changes to watch' },
    ],
    returns: 'Created webhook object with id, macSecretBase64, expirationTime',
    example: {
      params: {
        baseId: 'appXXX',
        specification: {
          options: {
            filters: {
              dataTypes: ['tableData'],
              recordChangeScope: 'tblXXX',
            },
          },
        },
      },
      description: 'Watch for record changes in a specific table',
    },
    notes: [
      'Webhooks expire after 7 days — use webhook.refresh to extend',
      'macSecretBase64 is only returned on creation — store it to verify notification signatures',
    ],
    seeAlso: ['webhooks.list', 'webhook.delete', 'webhook.payloads', 'webhook.refresh'],
  },
  {
    name: 'webhook.delete',
    description: 'Delete a webhook',
    operationType: 'delete',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'webhookId', type: 'string', required: true, description: 'Webhook ID' },
    ],
    returns: 'Empty response on success',
    seeAlso: ['webhooks.list', 'webhook.create'],
  },
  {
    name: 'webhook.payloads',
    description: 'Get payloads (change events) for a webhook',
    operationType: 'read',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'webhookId', type: 'string', required: true, description: 'Webhook ID' },
      { name: 'cursor', type: 'number', required: false, description: 'Cursor to fetch payloads after (from previous response)' },
    ],
    returns: 'List of payload objects with timestamp, baseTransactionNumber, actionMetadata, and changedTablesById',
    notes: ['Payloads are retained for 7 days', 'Use cursor from previous response to paginate'],
    seeAlso: ['webhooks.list', 'webhook.create'],
  },
  {
    name: 'webhook.refresh',
    description: 'Extend a webhook expiration time',
    operationType: 'write',
    params: [
      { name: 'baseId', type: 'string', required: true, description: 'Base ID' },
      { name: 'webhookId', type: 'string', required: true, description: 'Webhook ID' },
    ],
    returns: 'Object with new expirationTime',
    notes: ['Extends expiration by 7 days from now'],
    seeAlso: ['webhooks.list', 'webhook.create'],
  },
  {
    name: 'whoami',
    description: 'Get current user info (user ID and granted scopes)',
    operationType: 'read',
    params: [],
    returns: 'User object with id and scopes',
    responseExample: { id: 'usrXXXXXXXXXXXXXX', scopes: ['data.records:read', 'schema.bases:read'] },
  },
];

async function executeAirtable(
  method: string,
  params: Record<string, unknown>,
  credentials: OAuthCredentials
): Promise<unknown> {
  switch (method) {
    case 'bases.list': {
      const query = new URLSearchParams();
      if (params.offset) query.set('offset', String(params.offset));
      const qs = query.toString();
      return airtableFetch(`/meta/bases${qs ? `?${qs}` : ''}`, credentials);
    }

    case 'base.tables':
      return airtableFetch(`/meta/bases/${params.baseId}/tables`, credentials);

    case 'records.list': {
      const query = new URLSearchParams();
      if (params.filterByFormula) query.set('filterByFormula', String(params.filterByFormula));
      if (params.maxRecords) query.set('maxRecords', String(params.maxRecords));
      if (params.pageSize) query.set('pageSize', String(params.pageSize));
      if (params.view) query.set('view', String(params.view));
      if (params.offset) query.set('offset', String(params.offset));
      if (Array.isArray(params.fields)) {
        for (const f of params.fields) query.append('fields[]', String(f));
      }
      if (Array.isArray(params.sort)) {
        for (let i = 0; i < params.sort.length; i++) {
          const s = params.sort[i] as { field: string; direction?: string };
          query.set(`sort[${i}][field]`, s.field);
          if (s.direction) query.set(`sort[${i}][direction]`, s.direction);
        }
      }
      const qs = query.toString();
      return airtableFetch(`/${params.baseId}/${params.tableIdOrName}${qs ? `?${qs}` : ''}`, credentials);
    }

    case 'records.get':
      return airtableFetch(`/${params.baseId}/${params.tableIdOrName}/${params.recordId}`, credentials);

    case 'records.create': {
      const body: Record<string, unknown> = {
        records: params.records,
      };
      if (params.typecast) body.typecast = true;
      return airtableFetch(`/${params.baseId}/${params.tableIdOrName}`, credentials, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }

    case 'records.update': {
      const body: Record<string, unknown> = {
        records: params.records,
      };
      if (params.typecast) body.typecast = true;
      return airtableFetch(`/${params.baseId}/${params.tableIdOrName}`, credentials, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    }

    case 'records.upsert': {
      const body: Record<string, unknown> = {
        performUpsert: { fieldsToMergeOn: params.fieldsToMergeOn },
        records: params.records,
      };
      if (params.typecast) body.typecast = true;
      return airtableFetch(`/${params.baseId}/${params.tableIdOrName}`, credentials, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    }

    case 'records.delete': {
      const ids = params.records as string[];
      const query = new URLSearchParams();
      for (const id of ids) query.append('records[]', id);
      return airtableFetch(`/${params.baseId}/${params.tableIdOrName}?${query.toString()}`, credentials, {
        method: 'DELETE',
      });
    }

    case 'comments.list': {
      const query = new URLSearchParams();
      if (params.offset) query.set('offset', String(params.offset));
      const qs = query.toString();
      return airtableFetch(
        `/${params.baseId}/${params.tableIdOrName}/${params.recordId}/comments${qs ? `?${qs}` : ''}`,
        credentials
      );
    }

    case 'comments.create':
      return airtableFetch(
        `/${params.baseId}/${params.tableIdOrName}/${params.recordId}/comments`,
        credentials,
        {
          method: 'POST',
          body: JSON.stringify({ text: params.text }),
        }
      );

    case 'comments.update':
      return airtableFetch(
        `/${params.baseId}/${params.tableIdOrName}/${params.recordId}/comments/${params.commentId}`,
        credentials,
        {
          method: 'PATCH',
          body: JSON.stringify({ text: params.text }),
        }
      );

    case 'comments.delete':
      return airtableFetch(
        `/${params.baseId}/${params.tableIdOrName}/${params.recordId}/comments/${params.commentId}`,
        credentials,
        { method: 'DELETE' }
      );

    case 'table.create': {
      const body: Record<string, unknown> = {
        name: params.name,
        fields: params.fields,
      };
      if (params.description) body.description = params.description;
      return airtableFetch(`/meta/bases/${params.baseId}/tables`, credentials, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }

    case 'table.update': {
      const body: Record<string, unknown> = {};
      if (params.name !== undefined) body.name = params.name;
      if (params.description !== undefined) body.description = params.description;
      return airtableFetch(`/meta/bases/${params.baseId}/tables/${params.tableId}`, credentials, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    }

    case 'field.create': {
      const body: Record<string, unknown> = {
        name: params.name,
        type: params.type,
      };
      if (params.description) body.description = params.description;
      if (params.options) body.options = params.options;
      return airtableFetch(`/meta/bases/${params.baseId}/tables/${params.tableId}/fields`, credentials, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }

    case 'field.update': {
      const body: Record<string, unknown> = {};
      if (params.name !== undefined) body.name = params.name;
      if (params.description !== undefined) body.description = params.description;
      if (params.options !== undefined) body.options = params.options;
      return airtableFetch(
        `/meta/bases/${params.baseId}/tables/${params.tableId}/fields/${params.fieldId}`,
        credentials,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        }
      );
    }

    case 'webhooks.list':
      return airtableFetch(`/bases/${params.baseId}/webhooks`, credentials);

    case 'webhook.create': {
      const body: Record<string, unknown> = {
        specification: params.specification,
      };
      if (params.notificationUrl) body.notificationUrl = params.notificationUrl;
      return airtableFetch(`/bases/${params.baseId}/webhooks`, credentials, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }

    case 'webhook.delete':
      return airtableFetch(`/bases/${params.baseId}/webhooks/${params.webhookId}`, credentials, {
        method: 'DELETE',
      });

    case 'webhook.payloads': {
      const query = new URLSearchParams();
      if (params.cursor) query.set('cursor', String(params.cursor));
      const qs = query.toString();
      return airtableFetch(
        `/bases/${params.baseId}/webhooks/${params.webhookId}/payloads${qs ? `?${qs}` : ''}`,
        credentials
      );
    }

    case 'webhook.refresh':
      return airtableFetch(`/bases/${params.baseId}/webhooks/${params.webhookId}/refresh`, credentials, {
        method: 'POST',
      });

    case 'whoami':
      return airtableFetch('/meta/whoami', credentials);

    default:
      throw new Error(`Unknown Airtable method: ${method}`);
  }
}

function getResourceType(method: string): string | undefined {
  const [resource] = method.split('.');
  switch (resource) {
    case 'bases':
    case 'base': return 'base';
    case 'table': return 'table';
    case 'field': return 'field';
    case 'records': return 'record';
    case 'comments': return 'comment';
    case 'webhooks':
    case 'webhook': return 'webhook';
    case 'whoami': return 'user';
    default: return undefined;
  }
}

export const airtableConnector: Connector = {
  service: 'airtable',
  name: 'Airtable',
  methods,
  groupDescriptions: {
    bases: 'List accessible bases',
    base: 'List tables and fields in a base',
    records: 'List, get, create, update, upsert, and delete records',
    comments: 'List, create, update, and delete record comments',
    table: 'Create and update tables',
    field: 'Create and update fields',
    webhooks: 'List webhooks for a base',
    webhook: 'Create, delete, poll, and refresh webhooks',
  },

  extractPermMetadata(
    method: string,
    params: Record<string, unknown>,
    accountId: string
  ): PermissionMetadata {
    const methodDef = methods.find((m) => m.name === method);
    if (!methodDef) {
      throw new Error(`Unknown Airtable method: ${method}`);
    }
    return {
      service: 'airtable',
      accountId,
      method,
      operationType: methodDef.operationType,
      resourceType: getResourceType(method),
      description: describeAirtableRequest(method, params),
    };
  },

  async execute(
    method: string,
    params: Record<string, unknown>,
    credentials: OAuthCredentials
  ): Promise<unknown> {
    return executeAirtable(method, params, credentials);
  },

  help(method?: string): ServiceHelp {
    if (method) {
      const m = methods.find((md) => md.name === method);
      return {
        service: 'airtable',
        name: 'Airtable',
        summary: 'Bases, tables, fields, records, comments, and webhooks',
        methods: m ? [m] : [],
      };
    }
    return {
      service: 'airtable',
      name: 'Airtable',
      summary: 'Bases, tables, fields, records, comments, and webhooks',
      methods,
    };
  },
};
