import type { ConnectorMethod } from '@keepai/proto';
import { ZONE_ID_PARAM, ACCOUNT_ID_PARAM, LIST_PARAMS } from './params.js';

// ===== WORKERS & SERVERLESS =====
export const workersMethods: ConnectorMethod[] = [
  // Workers Scripts
  {
    name: 'workers.scripts.update',
    description: 'Upload a worker module.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'Worker script object',
  },
  {
    name: 'workers.scripts.list',
    description: 'Fetch a list of uploaded workers.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of worker scripts',
  },
  {
    name: 'workers.scripts.delete',
    description: 'Delete your worker.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'Deleted worker confirmation',
  },
  {
    name: 'workers.scripts.get',
    description: 'Fetch raw script content for your worker.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'Worker script content',
  },
  {
    name: 'workers.scripts.search',
    description: 'Search for Workers in an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of matching worker scripts',
  },

  // Workers Scripts Settings
  {
    name: 'workers.scripts.settings.edit',
    description: 'Patch script-level settings when using Worker Versions.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'Updated script settings',
  },
  {
    name: 'workers.scripts.settings.get',
    description: 'Get script-level settings when using Worker Versions.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'Script settings object',
  },

  // Workers Scripts Secrets
  {
    name: 'workers.scripts.secrets.update',
    description: 'Add a secret to a script.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'Secret object',
  },
  {
    name: 'workers.scripts.secrets.list',
    description: 'List secrets bound to a script.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'List of secrets',
  },
  {
    name: 'workers.scripts.secrets.delete',
    description: 'Remove a secret from a script.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }, { name: 'secret_name', type: 'string', required: true, description: 'Secret name' }],
    returns: 'Deleted secret confirmation',
  },
  {
    name: 'workers.scripts.secrets.get',
    description: 'Get a given secret binding (value omitted) on a script.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }, { name: 'secret_name', type: 'string', required: true, description: 'Secret name' }],
    returns: 'Secret binding object',
  },

  // Workers Scripts Deployments
  {
    name: 'workers.scripts.deployments.create',
    description: 'Deployments configure how Worker Versions are deployed to traffic.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'Deployment object',
  },
  {
    name: 'workers.scripts.deployments.list',
    description: 'List of Worker Deployments.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'List of deployments',
  },
  {
    name: 'workers.scripts.deployments.delete',
    description: 'Delete a Worker Deployment.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'Deleted deployment confirmation',
  },
  {
    name: 'workers.scripts.deployments.get',
    description: 'Get information about a Worker Deployment.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'Deployment object',
  },

  // Workers Scripts Versions
  {
    name: 'workers.scripts.versions.create',
    description: 'Upload a Worker Version without deploying to Cloudflare\'s network.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'Worker version object',
  },
  {
    name: 'workers.scripts.versions.list',
    description: 'List of Worker Versions.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'List of worker versions',
  },
  {
    name: 'workers.scripts.versions.get',
    description: 'Get Version Detail',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }, { name: 'version_id', type: 'string', required: true, description: 'Version ID' }],
    returns: 'Worker version object',
  },

  // Workers Scripts Schedules
  {
    name: 'workers.scripts.schedules.update',
    description: 'Updates Cron Triggers for a Worker.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'Updated schedules',
  },
  {
    name: 'workers.scripts.schedules.get',
    description: 'Fetches Cron Triggers for a Worker.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'Schedules object',
  },

  // Workers Scripts Tail
  {
    name: 'workers.scripts.tail.create',
    description: 'Starts a tail that receives logs and exception from a Worker.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'Tail object',
  },
  {
    name: 'workers.scripts.tail.delete',
    description: 'Deletes a tail from a Worker.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }, { name: 'tail_id', type: 'string', required: true, description: 'Tail ID' }],
    returns: 'Deleted tail confirmation',
  },
  {
    name: 'workers.scripts.tail.get',
    description: 'Get list of tails currently deployed on a Worker.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'List of tails',
  },

  // Workers Scripts Subdomain
  {
    name: 'workers.scripts.subdomain.create',
    description: 'Enable or disable the Worker on the workers.dev subdomain.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'Subdomain setting',
  },
  {
    name: 'workers.scripts.subdomain.delete',
    description: 'Disable all workers.dev subdomains for a Worker.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'Deleted subdomain confirmation',
  },
  {
    name: 'workers.scripts.subdomain.get',
    description: 'Get if the Worker is available on the workers.dev subdomain.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'script_name', type: 'string', required: true, description: 'Worker script name' }],
    returns: 'Subdomain status',
  },

  // Workers Routes
  {
    name: 'workers.routes.create',
    description: 'Creates a route that maps a URL pattern to a Worker.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'pattern', type: 'string', required: true, description: 'URL pattern' }, { name: 'script', type: 'string', required: false, description: 'Worker script name' }],
    returns: 'Route object',
  },
  {
    name: 'workers.routes.update',
    description: 'Updates the URL pattern or Worker associated with a route.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'route_id', type: 'string', required: true, description: 'Route ID' }],
    returns: 'Updated route object',
  },
  {
    name: 'workers.routes.list',
    description: 'Returns routes for a zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of routes',
  },
  {
    name: 'workers.routes.delete',
    description: 'Deletes a route.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'route_id', type: 'string', required: true, description: 'Route ID' }],
    returns: 'Deleted route confirmation',
  },
  {
    name: 'workers.routes.get',
    description: 'Returns information about a route, including URL pattern and Worker.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'route_id', type: 'string', required: true, description: 'Route ID' }],
    returns: 'Route object',
  },

  // Workers Domains
  {
    name: 'workers.domains.update',
    description: 'Attaches a Worker to a zone and hostname.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Worker domain object',
  },
  {
    name: 'workers.domains.list',
    description: 'Lists all Worker Domains for an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of worker domains',
  },
  {
    name: 'workers.domains.delete',
    description: 'Detaches a Worker from a zone and hostname.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'domain_id', type: 'string', required: true, description: 'Domain ID' }],
    returns: 'Deleted worker domain confirmation',
  },
  {
    name: 'workers.domains.get',
    description: 'Gets a Worker domain.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'domain_id', type: 'string', required: true, description: 'Domain ID' }],
    returns: 'Worker domain object',
  },

  // Workers Account Settings
  {
    name: 'workers.accountSettings.update',
    description: 'Creates Worker account settings for an account.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Account settings object',
  },
  {
    name: 'workers.accountSettings.get',
    description: 'Fetches Worker account settings for an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Account settings object',
  },

  // Workers Subdomains
  {
    name: 'workers.subdomains.update',
    description: 'Creates a Workers subdomain for an account.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Subdomain object',
  },
  {
    name: 'workers.subdomains.get',
    description: 'Returns a Workers subdomain for an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Subdomain object',
  },

  // KV Namespaces
  {
    name: 'kv.namespaces.create',
    description: 'Creates a namespace under the given title.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'title', type: 'string', required: true, description: 'Namespace title' }],
    returns: 'KV namespace object',
  },
  {
    name: 'kv.namespaces.update',
    description: 'Modifies a namespace\'s title.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'namespace_id', type: 'string', required: true, description: 'Namespace ID' }, { name: 'title', type: 'string', required: true, description: 'New title' }],
    returns: 'Updated KV namespace object',
  },
  {
    name: 'kv.namespaces.list',
    description: 'Returns the namespaces owned by an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of KV namespaces',
  },
  {
    name: 'kv.namespaces.delete',
    description: 'Deletes the namespace corresponding to the given ID.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'namespace_id', type: 'string', required: true, description: 'Namespace ID' }],
    returns: 'Deleted KV namespace confirmation',
  },
  {
    name: 'kv.namespaces.get',
    description: 'Get the namespace corresponding to the given ID.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'namespace_id', type: 'string', required: true, description: 'Namespace ID' }],
    returns: 'KV namespace object',
  },
  {
    name: 'kv.namespaces.bulkUpdate',
    description: 'Write multiple keys and values at once.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'namespace_id', type: 'string', required: true, description: 'Namespace ID' }],
    returns: 'Bulk update result',
  },
  {
    name: 'kv.namespaces.bulkDelete',
    description: 'Remove multiple KV pairs from the namespace.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'namespace_id', type: 'string', required: true, description: 'Namespace ID' }],
    returns: 'Bulk delete result',
  },

  // KV Namespaces Keys
  {
    name: 'kv.namespaces.keys.list',
    description: 'Lists a namespace\'s keys.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'namespace_id', type: 'string', required: true, description: 'Namespace ID' }, ...LIST_PARAMS],
    returns: 'List of KV keys',
  },

  // KV Namespaces Values
  {
    name: 'kv.namespaces.values.update',
    description: 'Write a value identified by a key.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'namespace_id', type: 'string', required: true, description: 'Namespace ID' }, { name: 'key_name', type: 'string', required: true, description: 'Key name' }],
    returns: 'Write result',
  },
  {
    name: 'kv.namespaces.values.delete',
    description: 'Remove a KV pair from the namespace.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'namespace_id', type: 'string', required: true, description: 'Namespace ID' }, { name: 'key_name', type: 'string', required: true, description: 'Key name' }],
    returns: 'Deleted KV pair confirmation',
  },
  {
    name: 'kv.namespaces.values.get',
    description: 'Returns the value associated with the given key in the given namespace.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'namespace_id', type: 'string', required: true, description: 'Namespace ID' }, { name: 'key_name', type: 'string', required: true, description: 'Key name' }],
    returns: 'KV value',
  },

  // KV Namespaces Metadata
  {
    name: 'kv.namespaces.metadata.get',
    description: 'Returns the metadata associated with the given key in the given namespace.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'namespace_id', type: 'string', required: true, description: 'Namespace ID' }, { name: 'key_name', type: 'string', required: true, description: 'Key name' }],
    returns: 'KV metadata object',
  },

  // D1 Database
  {
    name: 'd1.database.create',
    description: 'Returns the created D1 database.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'name', type: 'string', required: true, description: 'Database name' }],
    returns: 'D1 database object',
  },
  {
    name: 'd1.database.update',
    description: 'Updates the specified D1 database.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'database_id', type: 'string', required: true, description: 'Database ID' }],
    returns: 'Updated D1 database object',
  },
  {
    name: 'd1.database.list',
    description: 'Returns a list of D1 databases.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of D1 databases',
  },
  {
    name: 'd1.database.delete',
    description: 'Deletes the specified D1 database.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'database_id', type: 'string', required: true, description: 'Database ID' }],
    returns: 'Deleted D1 database confirmation',
  },
  {
    name: 'd1.database.edit',
    description: 'Updates partially the specified D1 database.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'database_id', type: 'string', required: true, description: 'Database ID' }],
    returns: 'Updated D1 database object',
  },
  {
    name: 'd1.database.get',
    description: 'Returns the specified D1 database.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'database_id', type: 'string', required: true, description: 'Database ID' }],
    returns: 'D1 database object',
  },
  {
    name: 'd1.database.query',
    description: 'Returns the query result as an object.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'database_id', type: 'string', required: true, description: 'Database ID' }, { name: 'sql', type: 'string', required: true, description: 'SQL query' }],
    returns: 'D1 query result',
  },
  {
    name: 'd1.database.raw',
    description: 'Returns the query result rows as arrays rather than objects.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'database_id', type: 'string', required: true, description: 'Database ID' }, { name: 'sql', type: 'string', required: true, description: 'SQL query' }],
    returns: 'D1 raw query result',
  },
  {
    name: 'd1.database.export',
    description: 'Returns a URL where the SQL contents of your D1 can be downloaded.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'database_id', type: 'string', required: true, description: 'Database ID' }],
    returns: 'Export URL',
  },
  {
    name: 'd1.database.import',
    description: 'Generates a temporary URL for uploading an SQL file to, then instructing the D1 to import it.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'database_id', type: 'string', required: true, description: 'Database ID' }],
    returns: 'Import result',
  },

  // Queues
  {
    name: 'queues.create',
    description: 'Create a new queue',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'queue_name', type: 'string', required: true, description: 'Queue name' }],
    returns: 'Queue object',
  },
  {
    name: 'queues.update',
    description: 'Updates a Queue.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'queue_id', type: 'string', required: true, description: 'Queue ID' }],
    returns: 'Updated queue object',
  },
  {
    name: 'queues.list',
    description: 'Returns the queues owned by an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of queues',
  },
  {
    name: 'queues.delete',
    description: 'Deletes a queue',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'queue_id', type: 'string', required: true, description: 'Queue ID' }],
    returns: 'Deleted queue confirmation',
  },
  {
    name: 'queues.edit',
    description: 'Updates a Queue.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'queue_id', type: 'string', required: true, description: 'Queue ID' }],
    returns: 'Updated queue object',
  },
  {
    name: 'queues.get',
    description: 'Get details about a specific queue.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'queue_id', type: 'string', required: true, description: 'Queue ID' }],
    returns: 'Queue object',
  },

  // Queues Messages
  {
    name: 'queues.messages.ack',
    description: 'Acknowledge + Retry messages from a Queue',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'queue_id', type: 'string', required: true, description: 'Queue ID' }],
    returns: 'Ack result',
  },
  {
    name: 'queues.messages.bulkPush',
    description: 'Push a batch of messages to a Queue',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'queue_id', type: 'string', required: true, description: 'Queue ID' }],
    returns: 'Bulk push result',
  },
  {
    name: 'queues.messages.pull',
    description: 'Pull a batch of messages from a Queue',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'queue_id', type: 'string', required: true, description: 'Queue ID' }],
    returns: 'Pulled messages',
  },
  {
    name: 'queues.messages.push',
    description: 'Push a message to a Queue',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'queue_id', type: 'string', required: true, description: 'Queue ID' }],
    returns: 'Push result',
  },

  // Queues Consumers
  {
    name: 'queues.consumers.create',
    description: 'Creates a new consumer for a Queue',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'queue_id', type: 'string', required: true, description: 'Queue ID' }],
    returns: 'Consumer object',
  },
  {
    name: 'queues.consumers.update',
    description: 'Updates the consumer for a queue.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'queue_id', type: 'string', required: true, description: 'Queue ID' }, { name: 'consumer_id', type: 'string', required: true, description: 'Consumer ID' }],
    returns: 'Updated consumer object',
  },
  {
    name: 'queues.consumers.list',
    description: 'Returns the consumers for a Queue',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'queue_id', type: 'string', required: true, description: 'Queue ID' }, ...LIST_PARAMS],
    returns: 'List of consumers',
  },
  {
    name: 'queues.consumers.delete',
    description: 'Deletes the consumer for a queue.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'queue_id', type: 'string', required: true, description: 'Queue ID' }, { name: 'consumer_id', type: 'string', required: true, description: 'Consumer ID' }],
    returns: 'Deleted consumer confirmation',
  },
  {
    name: 'queues.consumers.get',
    description: 'Fetches the consumer for a queue by consumer id',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'queue_id', type: 'string', required: true, description: 'Queue ID' }, { name: 'consumer_id', type: 'string', required: true, description: 'Consumer ID' }],
    returns: 'Consumer object',
  },

  // Durable Objects
  {
    name: 'durableObjects.namespaces.list',
    description: 'Returns the Durable Object namespaces owned by an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of Durable Object namespaces',
  },

  // Workflows
  {
    name: 'workflows.update',
    description: 'Create/modify Workflow',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'workflow_name', type: 'string', required: true, description: 'Workflow name' }],
    returns: 'Workflow object',
  },
  {
    name: 'workflows.list',
    description: 'List all Workflows',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of workflows',
  },
  {
    name: 'workflows.delete',
    description: 'Deletes a Workflow.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'workflow_name', type: 'string', required: true, description: 'Workflow name' }],
    returns: 'Deleted workflow confirmation',
  },
  {
    name: 'workflows.get',
    description: 'Get Workflow details',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'workflow_name', type: 'string', required: true, description: 'Workflow name' }],
    returns: 'Workflow object',
  },
  {
    name: 'workflows.instances.create',
    description: 'Create a new workflow instance',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'workflow_name', type: 'string', required: true, description: 'Workflow name' }],
    returns: 'Workflow instance object',
  },
  {
    name: 'workflows.instances.list',
    description: 'List of workflow instances',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'workflow_name', type: 'string', required: true, description: 'Workflow name' }, ...LIST_PARAMS],
    returns: 'List of workflow instances',
  },
  {
    name: 'workflows.instances.get',
    description: 'Get logs and status from instance',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'workflow_name', type: 'string', required: true, description: 'Workflow name' }, { name: 'instance_id', type: 'string', required: true, description: 'Instance ID' }],
    returns: 'Workflow instance details',
  },
  {
    name: 'workflows.versions.list',
    description: 'List deployed Workflow versions',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'workflow_name', type: 'string', required: true, description: 'Workflow name' }, ...LIST_PARAMS],
    returns: 'List of workflow versions',
  },
  {
    name: 'workflows.versions.get',
    description: 'Get Workflow version details',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'workflow_name', type: 'string', required: true, description: 'Workflow name' }, { name: 'version_id', type: 'string', required: true, description: 'Version ID' }],
    returns: 'Workflow version object',
  },

  // Hyperdrive
  {
    name: 'hyperdrive.configs.create',
    description: 'Creates and returns a new Hyperdrive configuration.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'name', type: 'string', required: true, description: 'Hyperdrive config name' }],
    returns: 'Hyperdrive config object',
  },
  {
    name: 'hyperdrive.configs.update',
    description: 'Updates and returns the specified Hyperdrive configuration.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'hyperdrive_id', type: 'string', required: true, description: 'Hyperdrive config ID' }],
    returns: 'Updated Hyperdrive config object',
  },
  {
    name: 'hyperdrive.configs.list',
    description: 'Returns a list of Hyperdrives.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of Hyperdrive configs',
  },
  {
    name: 'hyperdrive.configs.delete',
    description: 'Deletes the specified Hyperdrive.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'hyperdrive_id', type: 'string', required: true, description: 'Hyperdrive config ID' }],
    returns: 'Deleted Hyperdrive confirmation',
  },
  {
    name: 'hyperdrive.configs.edit',
    description: 'Patches and returns the specified Hyperdrive configuration.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'hyperdrive_id', type: 'string', required: true, description: 'Hyperdrive config ID' }],
    returns: 'Updated Hyperdrive config object',
  },
  {
    name: 'hyperdrive.configs.get',
    description: 'Returns the specified Hyperdrive configuration.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'hyperdrive_id', type: 'string', required: true, description: 'Hyperdrive config ID' }],
    returns: 'Hyperdrive config object',
  },

  // Pipelines
  {
    name: 'pipelines.create',
    description: 'Create a new pipeline.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'name', type: 'string', required: true, description: 'Pipeline name' }],
    returns: 'Pipeline object',
  },
  {
    name: 'pipelines.update',
    description: 'Update an existing pipeline.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'pipeline_name', type: 'string', required: true, description: 'Pipeline name' }],
    returns: 'Updated pipeline object',
  },
  {
    name: 'pipelines.list',
    description: 'List, filter, and paginate pipelines in an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of pipelines',
  },
  {
    name: 'pipelines.delete',
    description: 'Delete a pipeline.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'pipeline_name', type: 'string', required: true, description: 'Pipeline name' }],
    returns: 'Deleted pipeline confirmation',
  },
  {
    name: 'pipelines.get',
    description: 'Get configuration of a pipeline.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'pipeline_name', type: 'string', required: true, description: 'Pipeline name' }],
    returns: 'Pipeline object',
  },
];
