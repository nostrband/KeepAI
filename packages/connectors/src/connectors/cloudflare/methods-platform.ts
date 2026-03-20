import type { ConnectorMethod } from '@keepai/proto';
import { ZONE_ID_PARAM, ACCOUNT_ID_PARAM, LIST_PARAMS } from './params.js';

// ===== PLATFORM =====
export const platformMethods: ConnectorMethod[] = [
  // Accounts
  {
    name: 'accounts.create',
    description: 'Create an account (only available for tenant admins at this time)',
    operationType: 'write',
    params: [{ name: 'name', type: 'string', required: true, description: 'Account name' }],
    returns: 'Account object',
  },
  {
    name: 'accounts.update',
    description: 'Update an existing account.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Updated account object',
  },
  {
    name: 'accounts.list',
    description: 'List all accounts you have ownership or verified access to.',
    operationType: 'read',
    params: [...LIST_PARAMS],
    returns: 'List of accounts',
  },
  {
    name: 'accounts.delete',
    description: 'Delete a specific account (only available for tenant admins at this time).',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Deleted account confirmation',
  },
  {
    name: 'accounts.get',
    description: 'Get information about a specific account that you are a member of.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Account object',
  },

  // Accounts Members
  {
    name: 'accounts.members.create',
    description: 'Add a user to the list of members for this account.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'email', type: 'string', required: true, description: 'Member email' }],
    returns: 'Account member object',
  },
  {
    name: 'accounts.members.update',
    description: 'Modify an account member.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'member_id', type: 'string', required: true, description: 'Member ID' }],
    returns: 'Updated account member object',
  },
  {
    name: 'accounts.members.list',
    description: 'List all members of an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of account members',
  },
  {
    name: 'accounts.members.delete',
    description: 'Remove a member from an account.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'member_id', type: 'string', required: true, description: 'Member ID' }],
    returns: 'Deleted member confirmation',
  },
  {
    name: 'accounts.members.get',
    description: 'Get information about a specific member of an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'member_id', type: 'string', required: true, description: 'Member ID' }],
    returns: 'Account member object',
  },

  // Accounts Roles
  {
    name: 'accounts.roles.list',
    description: 'Get all available roles for an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM],
    returns: 'List of roles',
  },
  {
    name: 'accounts.roles.get',
    description: 'Get information about a specific role for an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'role_id', type: 'string', required: true, description: 'Role ID' }],
    returns: 'Role object',
  },

  // Accounts Subscriptions
  {
    name: 'accounts.subscriptions.create',
    description: 'Creates an account subscription.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Subscription object',
  },
  {
    name: 'accounts.subscriptions.update',
    description: 'Updates an account subscription.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'subscription_identifier', type: 'string', required: true, description: 'Subscription ID' }],
    returns: 'Updated subscription object',
  },
  {
    name: 'accounts.subscriptions.delete',
    description: 'Deletes an account\'s subscription.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'subscription_identifier', type: 'string', required: true, description: 'Subscription ID' }],
    returns: 'Deleted subscription confirmation',
  },
  {
    name: 'accounts.subscriptions.get',
    description: 'Lists all of an account\'s subscriptions.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM],
    returns: 'List of subscriptions',
  },

  // Accounts Tokens
  {
    name: 'accounts.tokens.create',
    description: 'Create a new Account Owned API token.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'API token object',
  },
  {
    name: 'accounts.tokens.update',
    description: 'Update an existing token.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'token_id', type: 'string', required: true, description: 'Token ID' }],
    returns: 'Updated API token object',
  },
  {
    name: 'accounts.tokens.list',
    description: 'List all Account Owned API tokens created for this account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of API tokens',
  },
  {
    name: 'accounts.tokens.delete',
    description: 'Destroy an Account Owned API token.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'token_id', type: 'string', required: true, description: 'Token ID' }],
    returns: 'Deleted API token confirmation',
  },
  {
    name: 'accounts.tokens.get',
    description: 'Get information about a specific Account Owned API token.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'token_id', type: 'string', required: true, description: 'Token ID' }],
    returns: 'API token object',
  },
  {
    name: 'accounts.tokens.verify',
    description: 'Test whether a token works.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'token_id', type: 'string', required: true, description: 'Token ID' }],
    returns: 'Token verification result',
  },

  // User
  {
    name: 'user.edit',
    description: 'Edit part of your user details.',
    operationType: 'write',
    params: [],
    returns: 'Updated user object',
  },
  {
    name: 'user.get',
    description: 'User Details',
    operationType: 'read',
    params: [],
    returns: 'User object',
  },

  // User Tokens
  {
    name: 'user.tokens.create',
    description: 'Create a new access token.',
    operationType: 'write',
    params: [],
    returns: 'Access token object',
  },
  {
    name: 'user.tokens.update',
    description: 'Update an existing token.',
    operationType: 'write',
    params: [{ name: 'token_id', type: 'string', required: true, description: 'Token ID' }],
    returns: 'Updated access token object',
  },
  {
    name: 'user.tokens.list',
    description: 'List all access tokens you created.',
    operationType: 'read',
    params: [...LIST_PARAMS],
    returns: 'List of access tokens',
  },
  {
    name: 'user.tokens.delete',
    description: 'Destroy a token.',
    operationType: 'delete',
    params: [{ name: 'token_id', type: 'string', required: true, description: 'Token ID' }],
    returns: 'Deleted token confirmation',
  },
  {
    name: 'user.tokens.get',
    description: 'Get information about a specific token.',
    operationType: 'read',
    params: [{ name: 'token_id', type: 'string', required: true, description: 'Token ID' }],
    returns: 'Access token object',
  },
  {
    name: 'user.tokens.verify',
    description: 'Test whether a token works.',
    operationType: 'read',
    params: [{ name: 'token_id', type: 'string', required: true, description: 'Token ID' }],
    returns: 'Token verification result',
  },

  // User Invites
  {
    name: 'user.invites.list',
    description: 'Lists all invitations associated with my user.',
    operationType: 'read',
    params: [...LIST_PARAMS],
    returns: 'List of invitations',
  },
  {
    name: 'user.invites.edit',
    description: 'Responds to an invitation.',
    operationType: 'write',
    params: [{ name: 'invite_id', type: 'string', required: true, description: 'Invite ID' }],
    returns: 'Updated invitation',
  },

  // User Organizations
  {
    name: 'user.organizations.list',
    description: 'Lists organizations the user is associated with.',
    operationType: 'read',
    params: [...LIST_PARAMS],
    returns: 'List of organizations',
  },
  {
    name: 'user.organizations.delete',
    description: 'Removes association to an organization.',
    operationType: 'delete',
    params: [{ name: 'organization_id', type: 'string', required: true, description: 'Organization ID' }],
    returns: 'Deleted organization association confirmation',
  },
  {
    name: 'user.organizations.get',
    description: 'Gets a specific organization the user is associated with.',
    operationType: 'read',
    params: [{ name: 'organization_id', type: 'string', required: true, description: 'Organization ID' }],
    returns: 'Organization object',
  },

  // Memberships
  {
    name: 'memberships.update',
    description: 'Accept or reject this account invitation.',
    operationType: 'write',
    params: [{ name: 'membership_id', type: 'string', required: true, description: 'Membership ID' }],
    returns: 'Updated membership object',
  },
  {
    name: 'memberships.list',
    description: 'List memberships of accounts the user can access.',
    operationType: 'read',
    params: [...LIST_PARAMS],
    returns: 'List of memberships',
  },
  {
    name: 'memberships.delete',
    description: 'Remove the associated member from an account.',
    operationType: 'delete',
    params: [{ name: 'membership_id', type: 'string', required: true, description: 'Membership ID' }],
    returns: 'Deleted membership confirmation',
  },
  {
    name: 'memberships.get',
    description: 'Get a specific membership.',
    operationType: 'read',
    params: [{ name: 'membership_id', type: 'string', required: true, description: 'Membership ID' }],
    returns: 'Membership object',
  },

  // Audit Logs
  {
    name: 'auditLogs.list',
    description: 'Gets a list of audit logs for an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of audit logs',
  },

  // Registrar
  {
    name: 'registrar.domains.update',
    description: 'Update individual domain.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'domain_name', type: 'string', required: true, description: 'Domain name' }],
    returns: 'Updated registrar domain object',
  },
  {
    name: 'registrar.domains.list',
    description: 'List domains handled by Registrar.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of registrar domains',
  },
  {
    name: 'registrar.domains.get',
    description: 'Show individual domain.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'domain_name', type: 'string', required: true, description: 'Domain name' }],
    returns: 'Registrar domain object',
  },

  // Email Routing
  {
    name: 'emailRouting.disable',
    description: 'Disable your Email Routing zone.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Email routing settings',
  },
  {
    name: 'emailRouting.enable',
    description: 'Enable you Email Routing zone.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Email routing settings',
  },
  {
    name: 'emailRouting.get',
    description: 'Get information about the settings for your Email Routing zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'Email routing settings',
  },

  // Email Routing Rules
  {
    name: 'emailRouting.rules.create',
    description: 'Create an email routing rule.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Email routing rule object',
  },
  {
    name: 'emailRouting.rules.update',
    description: 'Update actions and matches, or enable/disable specific routing rules.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'rule_identifier', type: 'string', required: true, description: 'Rule ID' }],
    returns: 'Updated email routing rule object',
  },
  {
    name: 'emailRouting.rules.list',
    description: 'Lists existing routing rules.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of email routing rules',
  },
  {
    name: 'emailRouting.rules.delete',
    description: 'Delete a specific routing rule.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'rule_identifier', type: 'string', required: true, description: 'Rule ID' }],
    returns: 'Deleted email routing rule confirmation',
  },
  {
    name: 'emailRouting.rules.get',
    description: 'Get information for a specific routing rule already created.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'rule_identifier', type: 'string', required: true, description: 'Rule ID' }],
    returns: 'Email routing rule object',
  },

  // Email Routing Addresses
  {
    name: 'emailRouting.addresses.create',
    description: 'Create a destination address to forward your emails to.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'email', type: 'string', required: true, description: 'Destination email address' }],
    returns: 'Email routing address object',
  },
  {
    name: 'emailRouting.addresses.list',
    description: 'Lists existing destination addresses.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of destination addresses',
  },
  {
    name: 'emailRouting.addresses.delete',
    description: 'Deletes a specific destination address.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'destination_address_identifier', type: 'string', required: true, description: 'Address ID' }],
    returns: 'Deleted address confirmation',
  },
  {
    name: 'emailRouting.addresses.get',
    description: 'Gets information for a specific destination email already created.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'destination_address_identifier', type: 'string', required: true, description: 'Address ID' }],
    returns: 'Email routing address object',
  },

  // Email Routing DNS
  {
    name: 'emailRouting.dns.create',
    description: 'Enable you Email Routing zone. Add and lock the necessary MX and SPF records.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Email routing DNS records',
  },
  {
    name: 'emailRouting.dns.delete',
    description: 'Disable your Email Routing zone.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM],
    returns: 'Deleted email routing DNS confirmation',
  },
  {
    name: 'emailRouting.dns.edit',
    description: 'Unlock MX Records previously locked by Email Routing.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated email routing DNS records',
  },
  {
    name: 'emailRouting.dns.get',
    description: 'Show the DNS records needed to configure your Email Routing zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'Email routing DNS records',
  },

  // Logpush
  {
    name: 'logpush.jobs.create',
    description: 'Creates a new Logpush job for an account or zone.',
    operationType: 'write',
    params: [{ name: 'zone_id', type: 'string', required: false, description: 'Zone ID' }, { name: 'account_id', type: 'string', required: false, description: 'Account ID' }],
    returns: 'Logpush job object',
  },
  {
    name: 'logpush.jobs.update',
    description: 'Updates a Logpush job.',
    operationType: 'write',
    params: [{ name: 'job_id', type: 'number', required: true, description: 'Logpush job ID' }],
    returns: 'Updated Logpush job object',
  },
  {
    name: 'logpush.jobs.list',
    description: 'Lists Logpush jobs for an account or zone.',
    operationType: 'read',
    params: [{ name: 'zone_id', type: 'string', required: false, description: 'Zone ID' }, { name: 'account_id', type: 'string', required: false, description: 'Account ID' }, ...LIST_PARAMS],
    returns: 'List of Logpush jobs',
  },
  {
    name: 'logpush.jobs.delete',
    description: 'Deletes a Logpush job.',
    operationType: 'delete',
    params: [{ name: 'job_id', type: 'number', required: true, description: 'Logpush job ID' }],
    returns: 'Deleted Logpush job confirmation',
  },
  {
    name: 'logpush.jobs.get',
    description: 'Gets the details of a Logpush job.',
    operationType: 'read',
    params: [{ name: 'job_id', type: 'number', required: true, description: 'Logpush job ID' }],
    returns: 'Logpush job object',
  },

  // Logpush Ownership
  {
    name: 'logpush.ownership.create',
    description: 'Gets a new ownership challenge sent to your destination.',
    operationType: 'write',
    params: [{ name: 'zone_id', type: 'string', required: false, description: 'Zone ID' }, { name: 'account_id', type: 'string', required: false, description: 'Account ID' }],
    returns: 'Ownership challenge object',
  },
  {
    name: 'logpush.ownership.validate',
    description: 'Validates ownership challenge of the destination.',
    operationType: 'write',
    params: [{ name: 'zone_id', type: 'string', required: false, description: 'Zone ID' }, { name: 'account_id', type: 'string', required: false, description: 'Account ID' }],
    returns: 'Validation result',
  },

  // Alerting
  {
    name: 'alerting.policies.create',
    description: 'Creates a new Notification policy.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Notification policy object',
  },
  {
    name: 'alerting.policies.update',
    description: 'Update a Notification policy.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'policy_id', type: 'string', required: true, description: 'Policy ID' }],
    returns: 'Updated notification policy object',
  },
  {
    name: 'alerting.policies.list',
    description: 'Get a list of all Notification policies.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of notification policies',
  },
  {
    name: 'alerting.policies.delete',
    description: 'Delete a Notification policy.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'policy_id', type: 'string', required: true, description: 'Policy ID' }],
    returns: 'Deleted notification policy confirmation',
  },
  {
    name: 'alerting.policies.get',
    description: 'Get details for a single policy.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'policy_id', type: 'string', required: true, description: 'Policy ID' }],
    returns: 'Notification policy object',
  },

  // Alerting Webhooks
  {
    name: 'alerting.destinations.webhooks.create',
    description: 'Creates a new webhook destination.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Webhook destination object',
  },
  {
    name: 'alerting.destinations.webhooks.update',
    description: 'Update a webhook destination.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'webhook_id', type: 'string', required: true, description: 'Webhook ID' }],
    returns: 'Updated webhook destination object',
  },
  {
    name: 'alerting.destinations.webhooks.list',
    description: 'Gets a list of all configured webhook destinations.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of webhook destinations',
  },
  {
    name: 'alerting.destinations.webhooks.delete',
    description: 'Delete a configured webhook destination.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'webhook_id', type: 'string', required: true, description: 'Webhook ID' }],
    returns: 'Deleted webhook destination confirmation',
  },

  // Alerting History
  {
    name: 'alerting.history.list',
    description: 'Gets a list of history records for notifications sent to an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of notification history records',
  },

  // Cache
  {
    name: 'cache.variants.delete',
    description: 'Delete cache variants config.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM],
    returns: 'Deleted cache variants confirmation',
  },
  {
    name: 'cache.variants.edit',
    description: 'Update cache variants config.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated cache variants config',
  },
  {
    name: 'cache.variants.get',
    description: 'Get cache variants config.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'Cache variants config',
  },
  {
    name: 'cache.smartTieredCache.delete',
    description: 'Delete Smart Tiered Cache setting.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM],
    returns: 'Deleted Smart Tiered Cache confirmation',
  },
  {
    name: 'cache.smartTieredCache.edit',
    description: 'Update Smart Tiered Cache setting.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated Smart Tiered Cache setting',
  },
  {
    name: 'cache.smartTieredCache.get',
    description: 'Get Smart Tiered Cache setting.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'Smart Tiered Cache setting',
  },
  {
    name: 'cache.regionalTieredCache.edit',
    description: 'Update Regional Tiered Cache setting.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated Regional Tiered Cache setting',
  },
  {
    name: 'cache.regionalTieredCache.get',
    description: 'Get Regional Tiered Cache setting.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'Regional Tiered Cache setting',
  },
  {
    name: 'cache.cacheReserve.edit',
    description: 'Update Cache Reserve setting.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated Cache Reserve setting',
  },
  {
    name: 'cache.cacheReserve.get',
    description: 'Get Cache Reserve setting.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'Cache Reserve setting',
  },

  // Healthchecks
  {
    name: 'healthchecks.create',
    description: 'Create a new health check.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Health check object',
  },
  {
    name: 'healthchecks.update',
    description: 'Update a configured health check.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'healthcheck_id', type: 'string', required: true, description: 'Health check ID' }],
    returns: 'Updated health check object',
  },
  {
    name: 'healthchecks.list',
    description: 'List configured health checks.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of health checks',
  },
  {
    name: 'healthchecks.delete',
    description: 'Delete a health check.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'healthcheck_id', type: 'string', required: true, description: 'Health check ID' }],
    returns: 'Deleted health check confirmation',
  },
  {
    name: 'healthchecks.edit',
    description: 'Patch a configured health check.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'healthcheck_id', type: 'string', required: true, description: 'Health check ID' }],
    returns: 'Updated health check object',
  },
  {
    name: 'healthchecks.get',
    description: 'Fetch a single configured health check.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'healthcheck_id', type: 'string', required: true, description: 'Health check ID' }],
    returns: 'Health check object',
  },

  // Healthcheck Previews
  {
    name: 'healthchecks.previews.create',
    description: 'Create a new preview health check.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Preview health check object',
  },
  {
    name: 'healthchecks.previews.delete',
    description: 'Delete a health check.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'healthcheck_id', type: 'string', required: true, description: 'Health check ID' }],
    returns: 'Deleted preview health check confirmation',
  },
  {
    name: 'healthchecks.previews.get',
    description: 'Fetch a single configured health check preview.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'healthcheck_id', type: 'string', required: true, description: 'Health check ID' }],
    returns: 'Preview health check object',
  },

  // Custom Pages
  {
    name: 'customPages.update',
    description: 'Updates the configuration of an existing custom page.',
    operationType: 'write',
    params: [{ name: 'custom_page_identifier', type: 'string', required: true, description: 'Custom page ID' }],
    returns: 'Updated custom page object',
  },
  {
    name: 'customPages.list',
    description: 'Fetches all the custom pages.',
    operationType: 'read',
    params: [...LIST_PARAMS],
    returns: 'List of custom pages',
  },
  {
    name: 'customPages.get',
    description: 'Fetches the details of a custom page.',
    operationType: 'read',
    params: [{ name: 'custom_page_identifier', type: 'string', required: true, description: 'Custom page ID' }],
    returns: 'Custom page object',
  },

  // Secrets Store
  {
    name: 'secretsStore.stores.create',
    description: 'Creates a store in the account',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Secrets store object',
  },
  {
    name: 'secretsStore.stores.list',
    description: 'Lists all the stores in an account',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of secrets stores',
  },
  {
    name: 'secretsStore.stores.delete',
    description: 'Deletes a single store',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'store_id', type: 'string', required: true, description: 'Store ID' }],
    returns: 'Deleted secrets store confirmation',
  },

  // Origin Post Quantum Encryption
  {
    name: 'originPostQuantumEncryption.update',
    description: 'Instructs Cloudflare to use Post-Quantum key agreement algorithms when connecting to your origin.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated Post-Quantum encryption setting',
  },
  {
    name: 'originPostQuantumEncryption.get',
    description: 'Get Post-Quantum encryption setting.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'Post-Quantum encryption setting',
  },
];
