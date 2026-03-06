/**
 * Airtable connector — bases, tables, records, comments, and user info.
 */

import type {
  Connector,
  ConnectorMethod,
  PermissionMetadata,
  ServiceHelp,
  OAuthCredentials,
} from '@keepai/proto';

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
    throw new Error(`Airtable API error ${response.status}: ${text}`);
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
    case 'records': return 'record';
    case 'comments': return 'comment';
    case 'whoami': return 'user';
    default: return undefined;
  }
}

export const airtableConnector: Connector = {
  service: 'airtable',
  name: 'Airtable',
  methods,

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
        summary: 'Bases, tables, records, and comments',
        methods: m ? [m] : [],
      };
    }
    return {
      service: 'airtable',
      name: 'Airtable',
      summary: 'Bases, tables, records, and comments',
      methods,
    };
  },
};
