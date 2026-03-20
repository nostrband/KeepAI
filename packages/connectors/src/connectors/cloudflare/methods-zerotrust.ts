import type { ConnectorMethod } from '@keepai/proto';
import { ACCOUNT_ID_PARAM, LIST_PARAMS } from './params.js';

// ===== ZERO TRUST =====
export const zeroTrustMethods: ConnectorMethod[] = [
  // Access Applications
  {
    name: 'zeroTrust.access.applications.create',
    description: 'Adds a new application to Access.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Access application object',
  },
  {
    name: 'zeroTrust.access.applications.update',
    description: 'Updates an Access application.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'app_id', type: 'string', required: true, description: 'Application ID' }],
    returns: 'Updated Access application object',
  },
  {
    name: 'zeroTrust.access.applications.list',
    description: 'Lists all Access applications in an account or zone.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of Access applications',
  },
  {
    name: 'zeroTrust.access.applications.delete',
    description: 'Deletes an application from Access.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'app_id', type: 'string', required: true, description: 'Application ID' }],
    returns: 'Deleted Access application confirmation',
  },
  {
    name: 'zeroTrust.access.applications.get',
    description: 'Fetches information about an Access application.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'app_id', type: 'string', required: true, description: 'Application ID' }],
    returns: 'Access application object',
  },
  {
    name: 'zeroTrust.access.applications.revokeTokens',
    description: 'Revokes all tokens issued for an application.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'app_id', type: 'string', required: true, description: 'Application ID' }],
    returns: 'Revoke result',
  },

  // Access Groups
  {
    name: 'zeroTrust.access.groups.create',
    description: 'Creates a new Access group.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Access group object',
  },
  {
    name: 'zeroTrust.access.groups.update',
    description: 'Updates a configured Access group.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'group_id', type: 'string', required: true, description: 'Group ID' }],
    returns: 'Updated Access group object',
  },
  {
    name: 'zeroTrust.access.groups.list',
    description: 'Lists all Access groups.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of Access groups',
  },
  {
    name: 'zeroTrust.access.groups.delete',
    description: 'Deletes an Access group.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'group_id', type: 'string', required: true, description: 'Group ID' }],
    returns: 'Deleted Access group confirmation',
  },
  {
    name: 'zeroTrust.access.groups.get',
    description: 'Fetches a single Access group.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'group_id', type: 'string', required: true, description: 'Group ID' }],
    returns: 'Access group object',
  },

  // Access Policies
  {
    name: 'zeroTrust.access.policies.create',
    description: 'Creates a new Access reusable policy.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Access policy object',
  },
  {
    name: 'zeroTrust.access.policies.update',
    description: 'Updates a Access reusable policy.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'policy_id', type: 'string', required: true, description: 'Policy ID' }],
    returns: 'Updated Access policy object',
  },
  {
    name: 'zeroTrust.access.policies.list',
    description: 'Lists Access reusable policies.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of Access policies',
  },
  {
    name: 'zeroTrust.access.policies.delete',
    description: 'Deletes an Access reusable policy.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'policy_id', type: 'string', required: true, description: 'Policy ID' }],
    returns: 'Deleted Access policy confirmation',
  },
  {
    name: 'zeroTrust.access.policies.get',
    description: 'Fetches a single Access reusable policy.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'policy_id', type: 'string', required: true, description: 'Policy ID' }],
    returns: 'Access policy object',
  },

  // Access Service Tokens
  {
    name: 'zeroTrust.access.serviceTokens.create',
    description: 'Generates a new service token.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Service token object',
  },
  {
    name: 'zeroTrust.access.serviceTokens.update',
    description: 'Updates a configured service token.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'service_token_id', type: 'string', required: true, description: 'Service token ID' }],
    returns: 'Updated service token object',
  },
  {
    name: 'zeroTrust.access.serviceTokens.list',
    description: 'Lists all service tokens.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of service tokens',
  },
  {
    name: 'zeroTrust.access.serviceTokens.delete',
    description: 'Deletes a service token.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'service_token_id', type: 'string', required: true, description: 'Service token ID' }],
    returns: 'Deleted service token confirmation',
  },
  {
    name: 'zeroTrust.access.serviceTokens.get',
    description: 'Fetches a single service token.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'service_token_id', type: 'string', required: true, description: 'Service token ID' }],
    returns: 'Service token object',
  },
  {
    name: 'zeroTrust.access.serviceTokens.refresh',
    description: 'Refreshes the expiration of a service token.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'service_token_id', type: 'string', required: true, description: 'Service token ID' }],
    returns: 'Refreshed service token object',
  },
  {
    name: 'zeroTrust.access.serviceTokens.rotate',
    description: 'Generates a new Client Secret for a service token and revokes the old one.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'service_token_id', type: 'string', required: true, description: 'Service token ID' }],
    returns: 'Rotated service token object',
  },

  // Access Certificates
  {
    name: 'zeroTrust.access.certificates.create',
    description: 'Adds a new mTLS root certificate to Access.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Certificate object',
  },
  {
    name: 'zeroTrust.access.certificates.update',
    description: 'Updates a configured mTLS certificate.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'certificate_id', type: 'string', required: true, description: 'Certificate ID' }],
    returns: 'Updated certificate object',
  },
  {
    name: 'zeroTrust.access.certificates.list',
    description: 'Lists all mTLS root certificates.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of mTLS certificates',
  },
  {
    name: 'zeroTrust.access.certificates.delete',
    description: 'Deletes an mTLS certificate.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'certificate_id', type: 'string', required: true, description: 'Certificate ID' }],
    returns: 'Deleted certificate confirmation',
  },
  {
    name: 'zeroTrust.access.certificates.get',
    description: 'Fetches a single mTLS certificate.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'certificate_id', type: 'string', required: true, description: 'Certificate ID' }],
    returns: 'Certificate object',
  },

  // Access Custom Pages
  {
    name: 'zeroTrust.access.customPages.create',
    description: 'Create a custom page',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Custom page object',
  },
  {
    name: 'zeroTrust.access.customPages.update',
    description: 'Update a custom page',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'custom_page_id', type: 'string', required: true, description: 'Custom page ID' }],
    returns: 'Updated custom page object',
  },
  {
    name: 'zeroTrust.access.customPages.list',
    description: 'List custom pages',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of custom pages',
  },
  {
    name: 'zeroTrust.access.customPages.delete',
    description: 'Delete a custom page',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'custom_page_id', type: 'string', required: true, description: 'Custom page ID' }],
    returns: 'Deleted custom page confirmation',
  },
  {
    name: 'zeroTrust.access.customPages.get',
    description: 'Fetches a custom page and also returns its HTML.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'custom_page_id', type: 'string', required: true, description: 'Custom page ID' }],
    returns: 'Custom page object with HTML',
  },

  // Access Tags
  {
    name: 'zeroTrust.access.tags.create',
    description: 'Create a tag',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Tag object',
  },
  {
    name: 'zeroTrust.access.tags.update',
    description: 'Update a tag',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'tag_name', type: 'string', required: true, description: 'Tag name' }],
    returns: 'Updated tag object',
  },
  {
    name: 'zeroTrust.access.tags.list',
    description: 'List tags',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of tags',
  },
  {
    name: 'zeroTrust.access.tags.delete',
    description: 'Delete a tag',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'tag_name', type: 'string', required: true, description: 'Tag name' }],
    returns: 'Deleted tag confirmation',
  },
  {
    name: 'zeroTrust.access.tags.get',
    description: 'Get a tag',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'tag_name', type: 'string', required: true, description: 'Tag name' }],
    returns: 'Tag object',
  },

  // Access Keys
  {
    name: 'zeroTrust.access.keys.update',
    description: 'Updates the Access key rotation settings for an account.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Updated key rotation settings',
  },
  {
    name: 'zeroTrust.access.keys.get',
    description: 'Gets the Access key rotation settings for an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Key rotation settings',
  },
  {
    name: 'zeroTrust.access.keys.rotate',
    description: 'Perfoms a key rotation for an account.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Rotated key result',
  },

  // Access Users
  {
    name: 'zeroTrust.access.users.list',
    description: 'Gets a list of users for an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of Access users',
  },

  // Access Gateway CA
  {
    name: 'zeroTrust.access.gatewayCA.create',
    description: 'Adds a new SSH Certificate Authority (CA).',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Gateway CA object',
  },
  {
    name: 'zeroTrust.access.gatewayCA.list',
    description: 'Lists SSH Certificate Authorities (CA).',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of Gateway CAs',
  },
  {
    name: 'zeroTrust.access.gatewayCA.delete',
    description: 'Deletes an SSH Certificate Authority.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'certificate_id', type: 'string', required: true, description: 'Certificate ID' }],
    returns: 'Deleted Gateway CA confirmation',
  },

  // Identity Providers
  {
    name: 'zeroTrust.identityProviders.create',
    description: 'Adds a new identity provider to Access.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Identity provider object',
  },
  {
    name: 'zeroTrust.identityProviders.update',
    description: 'Updates a configured identity provider.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'identity_provider_id', type: 'string', required: true, description: 'Identity provider ID' }],
    returns: 'Updated identity provider object',
  },
  {
    name: 'zeroTrust.identityProviders.list',
    description: 'Lists all configured identity providers.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of identity providers',
  },
  {
    name: 'zeroTrust.identityProviders.delete',
    description: 'Deletes an identity provider from Access.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'identity_provider_id', type: 'string', required: true, description: 'Identity provider ID' }],
    returns: 'Deleted identity provider confirmation',
  },
  {
    name: 'zeroTrust.identityProviders.get',
    description: 'Fetches a configured identity provider.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'identity_provider_id', type: 'string', required: true, description: 'Identity provider ID' }],
    returns: 'Identity provider object',
  },

  // Organizations
  {
    name: 'zeroTrust.organizations.create',
    description: 'Sets up a Zero Trust organization for your account or zone.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Organization object',
  },
  {
    name: 'zeroTrust.organizations.update',
    description: 'Updates the configuration for your Zero Trust organization.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Updated organization object',
  },
  {
    name: 'zeroTrust.organizations.list',
    description: 'Returns the configuration for your Zero Trust organization.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Organization object',
  },
  {
    name: 'zeroTrust.organizations.revokeUsers',
    description: 'Revokes a user\'s access across all applications.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Revoke result',
  },

  // Tunnels
  {
    name: 'zeroTrust.tunnels.list',
    description: 'Lists and filters all types of Tunnels in an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of tunnels',
  },

  // Devices
  {
    name: 'zeroTrust.devices.list',
    description: 'Lists WARP devices.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of WARP devices',
  },
  {
    name: 'zeroTrust.devices.get',
    description: 'Fetches a single WARP device.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'device_id', type: 'string', required: true, description: 'Device ID' }],
    returns: 'WARP device object',
  },

  // Connectivity Settings
  {
    name: 'zeroTrust.connectivitySettings.edit',
    description: 'Updates the Zero Trust Connectivity Settings for the given account.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Updated connectivity settings',
  },
  {
    name: 'zeroTrust.connectivitySettings.get',
    description: 'Gets the Zero Trust Connectivity Settings for the given account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Connectivity settings',
  },

  // Seats
  {
    name: 'zeroTrust.seats.edit',
    description: 'Removes a user from a Zero Trust seat when both access_seat and gateway_seat are set to false.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Updated seat object',
  },

  // Risk Scoring
  {
    name: 'zeroTrust.riskScoring.get',
    description: 'Get risk event/score information for a specific user',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'user_id', type: 'string', required: true, description: 'User ID' }],
    returns: 'Risk score object',
  },
  {
    name: 'zeroTrust.riskScoring.reset',
    description: 'Clear the risk score for a particular user',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'user_id', type: 'string', required: true, description: 'User ID' }],
    returns: 'Reset result',
  },
];
