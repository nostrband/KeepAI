import type { ConnectorMethod } from '@keepai/proto';
import { ZONE_ID_PARAM, ACCOUNT_ID_PARAM, LIST_PARAMS } from './params.js';

// ===== PAGES & SITES =====
export const pagesMethods: ConnectorMethod[] = [
  // Pages Projects
  {
    name: 'pages.projects.create',
    description: 'Create a new project.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'name', type: 'string', required: true, description: 'Project name' }],
    returns: 'Pages project object',
  },
  {
    name: 'pages.projects.list',
    description: 'Fetch a list of all user projects.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of Pages projects',
  },
  {
    name: 'pages.projects.delete',
    description: 'Delete a project by name.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'project_name', type: 'string', required: true, description: 'Project name' }],
    returns: 'Deleted project confirmation',
  },
  {
    name: 'pages.projects.edit',
    description: 'Set new attributes for an existing project.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'project_name', type: 'string', required: true, description: 'Project name' }],
    returns: 'Updated Pages project object',
  },
  {
    name: 'pages.projects.get',
    description: 'Fetch a project by name.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'project_name', type: 'string', required: true, description: 'Project name' }],
    returns: 'Pages project object',
  },
  {
    name: 'pages.projects.purgeBuildCache',
    description: 'Purge all cached build artifacts for a Pages project',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'project_name', type: 'string', required: true, description: 'Project name' }],
    returns: 'Purge result',
  },

  // Pages Projects Deployments
  {
    name: 'pages.projects.deployments.create',
    description: 'Start a new deployment from production.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'project_name', type: 'string', required: true, description: 'Project name' }],
    returns: 'Deployment object',
  },
  {
    name: 'pages.projects.deployments.list',
    description: 'Fetch a list of project deployments.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'project_name', type: 'string', required: true, description: 'Project name' }, ...LIST_PARAMS],
    returns: 'List of deployments',
  },
  {
    name: 'pages.projects.deployments.delete',
    description: 'Delete a deployment.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'project_name', type: 'string', required: true, description: 'Project name' }, { name: 'deployment_id', type: 'string', required: true, description: 'Deployment ID' }],
    returns: 'Deleted deployment confirmation',
  },
  {
    name: 'pages.projects.deployments.get',
    description: 'Fetch information about a deployment.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'project_name', type: 'string', required: true, description: 'Project name' }, { name: 'deployment_id', type: 'string', required: true, description: 'Deployment ID' }],
    returns: 'Deployment object',
  },
  {
    name: 'pages.projects.deployments.retry',
    description: 'Retry a previous deployment.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'project_name', type: 'string', required: true, description: 'Project name' }, { name: 'deployment_id', type: 'string', required: true, description: 'Deployment ID' }],
    returns: 'Retry result',
  },
  {
    name: 'pages.projects.deployments.rollback',
    description: 'Rollback the production deployment to a previous deployment.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'project_name', type: 'string', required: true, description: 'Project name' }, { name: 'deployment_id', type: 'string', required: true, description: 'Deployment ID' }],
    returns: 'Rollback result',
  },

  // Pages Projects Domains
  {
    name: 'pages.projects.domains.create',
    description: 'Add a new domain for the Pages project.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'project_name', type: 'string', required: true, description: 'Project name' }, { name: 'name', type: 'string', required: true, description: 'Domain name' }],
    returns: 'Domain object',
  },
  {
    name: 'pages.projects.domains.list',
    description: 'Fetch a list of all domains associated with a Pages project.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'project_name', type: 'string', required: true, description: 'Project name' }, ...LIST_PARAMS],
    returns: 'List of domains',
  },
  {
    name: 'pages.projects.domains.delete',
    description: 'Delete a Pages project\'s domain.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'project_name', type: 'string', required: true, description: 'Project name' }, { name: 'domain_name', type: 'string', required: true, description: 'Domain name' }],
    returns: 'Deleted domain confirmation',
  },
  {
    name: 'pages.projects.domains.edit',
    description: 'Retry the validation status of a single domain.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'project_name', type: 'string', required: true, description: 'Project name' }, { name: 'domain_name', type: 'string', required: true, description: 'Domain name' }],
    returns: 'Updated domain object',
  },
  {
    name: 'pages.projects.domains.get',
    description: 'Fetch a single domain.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'project_name', type: 'string', required: true, description: 'Project name' }, { name: 'domain_name', type: 'string', required: true, description: 'Domain name' }],
    returns: 'Domain object',
  },

  // Custom Hostnames
  {
    name: 'customHostnames.create',
    description: 'Add a new custom hostname and request that an SSL certificate be issued for it.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'hostname', type: 'string', required: true, description: 'Custom hostname' }],
    returns: 'Custom hostname object',
  },
  {
    name: 'customHostnames.list',
    description: 'List, search, sort, and filter all of your custom hostnames.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of custom hostnames',
  },
  {
    name: 'customHostnames.delete',
    description: 'Delete Custom Hostname (and any issued SSL certificates)',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'custom_hostname_id', type: 'string', required: true, description: 'Custom hostname ID' }],
    returns: 'Deleted custom hostname confirmation',
  },
  {
    name: 'customHostnames.edit',
    description: 'Modify SSL configuration for a custom hostname.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'custom_hostname_id', type: 'string', required: true, description: 'Custom hostname ID' }],
    returns: 'Updated custom hostname object',
  },
  {
    name: 'customHostnames.get',
    description: 'Custom Hostname Details',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'custom_hostname_id', type: 'string', required: true, description: 'Custom hostname ID' }],
    returns: 'Custom hostname object',
  },
  {
    name: 'customHostnames.fallbackOrigin.update',
    description: 'Update Fallback Origin for Custom Hostnames',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Fallback origin object',
  },
  {
    name: 'customHostnames.fallbackOrigin.get',
    description: 'Get Fallback Origin for Custom Hostnames',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'Fallback origin object',
  },

  // Waiting Rooms
  {
    name: 'waitingRooms.create',
    description: 'Creates a new waiting room.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'name', type: 'string', required: true, description: 'Waiting room name' }],
    returns: 'Waiting room object',
  },
  {
    name: 'waitingRooms.update',
    description: 'Updates a configured waiting room.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'waiting_room_id', type: 'string', required: true, description: 'Waiting room ID' }],
    returns: 'Updated waiting room object',
  },
  {
    name: 'waitingRooms.list',
    description: 'Lists waiting rooms for account or zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of waiting rooms',
  },
  {
    name: 'waitingRooms.delete',
    description: 'Deletes a waiting room.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'waiting_room_id', type: 'string', required: true, description: 'Waiting room ID' }],
    returns: 'Deleted waiting room confirmation',
  },
  {
    name: 'waitingRooms.edit',
    description: 'Patches a configured waiting room.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'waiting_room_id', type: 'string', required: true, description: 'Waiting room ID' }],
    returns: 'Updated waiting room object',
  },
  {
    name: 'waitingRooms.get',
    description: 'Fetches a single configured waiting room.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'waiting_room_id', type: 'string', required: true, description: 'Waiting room ID' }],
    returns: 'Waiting room object',
  },

  // Waiting Rooms Events
  {
    name: 'waitingRooms.events.create',
    description: 'Creates an event for a waiting room.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'waiting_room_id', type: 'string', required: true, description: 'Waiting room ID' }],
    returns: 'Event object',
  },
  {
    name: 'waitingRooms.events.update',
    description: 'Updates a configured event for a waiting room.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'waiting_room_id', type: 'string', required: true, description: 'Waiting room ID' }, { name: 'event_id', type: 'string', required: true, description: 'Event ID' }],
    returns: 'Updated event object',
  },
  {
    name: 'waitingRooms.events.list',
    description: 'Lists events for a waiting room.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'waiting_room_id', type: 'string', required: true, description: 'Waiting room ID' }, ...LIST_PARAMS],
    returns: 'List of events',
  },
  {
    name: 'waitingRooms.events.delete',
    description: 'Deletes an event for a waiting room.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'waiting_room_id', type: 'string', required: true, description: 'Waiting room ID' }, { name: 'event_id', type: 'string', required: true, description: 'Event ID' }],
    returns: 'Deleted event confirmation',
  },
  {
    name: 'waitingRooms.events.edit',
    description: 'Patches a configured event for a waiting room.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'waiting_room_id', type: 'string', required: true, description: 'Waiting room ID' }, { name: 'event_id', type: 'string', required: true, description: 'Event ID' }],
    returns: 'Updated event object',
  },
  {
    name: 'waitingRooms.events.get',
    description: 'Fetches a single configured event for a waiting room.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'waiting_room_id', type: 'string', required: true, description: 'Waiting room ID' }, { name: 'event_id', type: 'string', required: true, description: 'Event ID' }],
    returns: 'Event object',
  },

  // Waiting Rooms Rules
  {
    name: 'waitingRooms.rules.create',
    description: 'Creates a rule for a waiting room.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'waiting_room_id', type: 'string', required: true, description: 'Waiting room ID' }],
    returns: 'Rule object',
  },
  {
    name: 'waitingRooms.rules.update',
    description: 'Replaces all rules for a waiting room.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'waiting_room_id', type: 'string', required: true, description: 'Waiting room ID' }],
    returns: 'Updated rules',
  },
  {
    name: 'waitingRooms.rules.delete',
    description: 'Deletes a rule for a waiting room.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'waiting_room_id', type: 'string', required: true, description: 'Waiting room ID' }, { name: 'rule_id', type: 'string', required: true, description: 'Rule ID' }],
    returns: 'Deleted rule confirmation',
  },
  {
    name: 'waitingRooms.rules.edit',
    description: 'Patches a rule for a waiting room.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'waiting_room_id', type: 'string', required: true, description: 'Waiting room ID' }, { name: 'rule_id', type: 'string', required: true, description: 'Rule ID' }],
    returns: 'Updated rule object',
  },

  // Waiting Rooms Statuses & Settings
  {
    name: 'waitingRooms.statuses.get',
    description: 'Fetches the status of a configured waiting room.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'waiting_room_id', type: 'string', required: true, description: 'Waiting room ID' }],
    returns: 'Waiting room status',
  },
  {
    name: 'waitingRooms.settings.update',
    description: 'Update zone-level Waiting Room settings',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated settings',
  },
  {
    name: 'waitingRooms.settings.edit',
    description: 'Patch zone-level Waiting Room settings',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated settings',
  },
  {
    name: 'waitingRooms.settings.get',
    description: 'Get zone-level Waiting Room settings',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'Waiting room settings',
  },

  // Snippets
  {
    name: 'snippets.update',
    description: 'Creates or updates a snippet belonging to the zone.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'snippet_name', type: 'string', required: true, description: 'Snippet name' }],
    returns: 'Snippet object',
  },
  {
    name: 'snippets.list',
    description: 'Fetches all snippets belonging to the zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of snippets',
  },
  {
    name: 'snippets.delete',
    description: 'Deletes a snippet belonging to the zone.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'snippet_name', type: 'string', required: true, description: 'Snippet name' }],
    returns: 'Deleted snippet confirmation',
  },
  {
    name: 'snippets.get',
    description: 'Fetches a snippet belonging to the zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'snippet_name', type: 'string', required: true, description: 'Snippet name' }],
    returns: 'Snippet object',
  },

  // Snippets Rules
  {
    name: 'snippets.rules.update',
    description: 'Updates all snippet rules belonging to the zone.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated snippet rules',
  },
  {
    name: 'snippets.rules.list',
    description: 'Fetches all snippet rules belonging to the zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'List of snippet rules',
  },
  {
    name: 'snippets.rules.delete',
    description: 'Deletes all snippet rules belonging to the zone.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM],
    returns: 'Deleted snippet rules confirmation',
  },

  // Web3 Hostnames
  {
    name: 'web3.hostnames.create',
    description: 'Create Web3 Hostname',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Web3 hostname object',
  },
  {
    name: 'web3.hostnames.list',
    description: 'List Web3 Hostnames',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of Web3 hostnames',
  },
  {
    name: 'web3.hostnames.delete',
    description: 'Delete Web3 Hostname',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'identifier', type: 'string', required: true, description: 'Web3 hostname ID' }],
    returns: 'Deleted Web3 hostname confirmation',
  },
  {
    name: 'web3.hostnames.edit',
    description: 'Edit Web3 Hostname',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'identifier', type: 'string', required: true, description: 'Web3 hostname ID' }],
    returns: 'Updated Web3 hostname object',
  },
  {
    name: 'web3.hostnames.get',
    description: 'Web3 Hostname Details',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'identifier', type: 'string', required: true, description: 'Web3 hostname ID' }],
    returns: 'Web3 hostname object',
  },
];
