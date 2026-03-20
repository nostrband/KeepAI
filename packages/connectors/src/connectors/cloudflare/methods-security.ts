import type { ConnectorMethod } from '@keepai/proto';
import { ZONE_ID_PARAM, ACCOUNT_ID_PARAM, LIST_PARAMS } from './params.js';

// ===== SECURITY =====
export const securityMethods: ConnectorMethod[] = [
  // Rulesets
  {
    name: 'rulesets.create',
    description: 'Creates a ruleset.',
    operationType: 'write',
    params: [{ name: 'zone_id', type: 'string', required: false, description: 'Zone ID (provide zone_id or account_id)' }, { name: 'account_id', type: 'string', required: false, description: 'Account ID' }],
    returns: 'Ruleset object',
  },
  {
    name: 'rulesets.update',
    description: 'Updates an account or zone ruleset, creating a new version.',
    operationType: 'write',
    params: [{ name: 'ruleset_id', type: 'string', required: true, description: 'Ruleset ID' }],
    returns: 'Updated ruleset object',
  },
  {
    name: 'rulesets.list',
    description: 'Fetches all rulesets.',
    operationType: 'read',
    params: [{ name: 'zone_id', type: 'string', required: false, description: 'Zone ID' }, { name: 'account_id', type: 'string', required: false, description: 'Account ID' }, ...LIST_PARAMS],
    returns: 'List of rulesets',
  },
  {
    name: 'rulesets.delete',
    description: 'Deletes all versions of an existing account or zone ruleset.',
    operationType: 'delete',
    params: [{ name: 'ruleset_id', type: 'string', required: true, description: 'Ruleset ID' }],
    returns: 'Deleted ruleset confirmation',
  },
  {
    name: 'rulesets.get',
    description: 'Fetches the latest version of an account or zone ruleset.',
    operationType: 'read',
    params: [{ name: 'ruleset_id', type: 'string', required: true, description: 'Ruleset ID' }],
    returns: 'Ruleset object',
  },

  // Rulesets Phases
  {
    name: 'rulesets.phases.update',
    description: 'Updates an account or zone entry point ruleset, creating a new version.',
    operationType: 'write',
    params: [{ name: 'ruleset_phase', type: 'string', required: true, description: 'Ruleset phase' }],
    returns: 'Updated phase ruleset',
  },
  {
    name: 'rulesets.phases.get',
    description: 'Fetches the latest version of the account or zone entry point ruleset for a given phase.',
    operationType: 'read',
    params: [{ name: 'ruleset_phase', type: 'string', required: true, description: 'Ruleset phase' }],
    returns: 'Phase ruleset object',
  },

  // Rulesets Rules
  {
    name: 'rulesets.rules.create',
    description: 'Adds a new rule to an account or zone ruleset.',
    operationType: 'write',
    params: [{ name: 'ruleset_id', type: 'string', required: true, description: 'Ruleset ID' }],
    returns: 'Updated ruleset with new rule',
  },
  {
    name: 'rulesets.rules.delete',
    description: 'Deletes an existing rule from an account or zone ruleset.',
    operationType: 'delete',
    params: [{ name: 'ruleset_id', type: 'string', required: true, description: 'Ruleset ID' }, { name: 'rule_id', type: 'string', required: true, description: 'Rule ID' }],
    returns: 'Updated ruleset without deleted rule',
  },
  {
    name: 'rulesets.rules.edit',
    description: 'Updates an existing rule in an account or zone ruleset.',
    operationType: 'write',
    params: [{ name: 'ruleset_id', type: 'string', required: true, description: 'Ruleset ID' }, { name: 'rule_id', type: 'string', required: true, description: 'Rule ID' }],
    returns: 'Updated ruleset',
  },

  // Rulesets Versions
  {
    name: 'rulesets.versions.list',
    description: 'Fetches the versions of an account or zone ruleset.',
    operationType: 'read',
    params: [{ name: 'ruleset_id', type: 'string', required: true, description: 'Ruleset ID' }, ...LIST_PARAMS],
    returns: 'List of ruleset versions',
  },
  {
    name: 'rulesets.versions.delete',
    description: 'Deletes an existing version of an account or zone ruleset.',
    operationType: 'delete',
    params: [{ name: 'ruleset_id', type: 'string', required: true, description: 'Ruleset ID' }, { name: 'ruleset_version', type: 'string', required: true, description: 'Ruleset version' }],
    returns: 'Deleted version confirmation',
  },
  {
    name: 'rulesets.versions.get',
    description: 'Fetches a specific version of an account or zone ruleset.',
    operationType: 'read',
    params: [{ name: 'ruleset_id', type: 'string', required: true, description: 'Ruleset ID' }, { name: 'ruleset_version', type: 'string', required: true, description: 'Ruleset version' }],
    returns: 'Ruleset version object',
  },

  // Firewall Rules
  {
    name: 'firewall.rules.create',
    description: 'Create one or more firewall rules.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Firewall rule object',
  },
  {
    name: 'firewall.rules.update',
    description: 'Updates an existing firewall rule.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'rule_id', type: 'string', required: true, description: 'Firewall rule ID' }],
    returns: 'Updated firewall rule object',
  },
  {
    name: 'firewall.rules.list',
    description: 'Fetches firewall rules in a zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of firewall rules',
  },
  {
    name: 'firewall.rules.delete',
    description: 'Deletes an existing firewall rule.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'rule_id', type: 'string', required: true, description: 'Firewall rule ID' }],
    returns: 'Deleted firewall rule confirmation',
  },
  {
    name: 'firewall.rules.edit',
    description: 'Updates the priority of an existing firewall rule.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'rule_id', type: 'string', required: true, description: 'Firewall rule ID' }],
    returns: 'Updated firewall rule object',
  },
  {
    name: 'firewall.rules.get',
    description: 'Fetches the details of a firewall rule.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'rule_id', type: 'string', required: true, description: 'Firewall rule ID' }],
    returns: 'Firewall rule object',
  },

  // Firewall Lockdowns
  {
    name: 'firewall.lockdowns.create',
    description: 'Creates a new Zone Lockdown rule.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Zone Lockdown rule object',
  },
  {
    name: 'firewall.lockdowns.update',
    description: 'Updates an existing Zone Lockdown rule.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'lock_id', type: 'string', required: true, description: 'Lockdown rule ID' }],
    returns: 'Updated Zone Lockdown rule object',
  },
  {
    name: 'firewall.lockdowns.list',
    description: 'Fetches Zone Lockdown rules.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of Zone Lockdown rules',
  },
  {
    name: 'firewall.lockdowns.delete',
    description: 'Deletes an existing Zone Lockdown rule.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'lock_id', type: 'string', required: true, description: 'Lockdown rule ID' }],
    returns: 'Deleted Zone Lockdown rule confirmation',
  },
  {
    name: 'firewall.lockdowns.get',
    description: 'Fetches the details of a Zone Lockdown rule.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'lock_id', type: 'string', required: true, description: 'Lockdown rule ID' }],
    returns: 'Zone Lockdown rule object',
  },

  // Firewall Access Rules
  {
    name: 'firewall.accessRules.create',
    description: 'Creates a new IP Access rule for an account or zone.',
    operationType: 'write',
    params: [{ name: 'zone_id', type: 'string', required: false, description: 'Zone ID' }, { name: 'account_id', type: 'string', required: false, description: 'Account ID' }],
    returns: 'IP Access rule object',
  },
  {
    name: 'firewall.accessRules.list',
    description: 'Fetches IP Access rules of an account or zone.',
    operationType: 'read',
    params: [{ name: 'zone_id', type: 'string', required: false, description: 'Zone ID' }, { name: 'account_id', type: 'string', required: false, description: 'Account ID' }, ...LIST_PARAMS],
    returns: 'List of IP Access rules',
  },
  {
    name: 'firewall.accessRules.delete',
    description: 'Deletes an existing IP Access rule.',
    operationType: 'delete',
    params: [{ name: 'identifier', type: 'string', required: true, description: 'Access rule ID' }],
    returns: 'Deleted IP Access rule confirmation',
  },
  {
    name: 'firewall.accessRules.edit',
    description: 'Updates an IP Access rule.',
    operationType: 'write',
    params: [{ name: 'identifier', type: 'string', required: true, description: 'Access rule ID' }],
    returns: 'Updated IP Access rule object',
  },
  {
    name: 'firewall.accessRules.get',
    description: 'Fetches the details of an IP Access rule.',
    operationType: 'read',
    params: [{ name: 'identifier', type: 'string', required: true, description: 'Access rule ID' }],
    returns: 'IP Access rule object',
  },

  // Firewall UA Rules
  {
    name: 'firewall.uaRules.create',
    description: 'Creates a new User Agent Blocking rule in a zone.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'UA rule object',
  },
  {
    name: 'firewall.uaRules.update',
    description: 'Updates an existing User Agent Blocking rule.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'ua_rule_id', type: 'string', required: true, description: 'UA rule ID' }],
    returns: 'Updated UA rule object',
  },
  {
    name: 'firewall.uaRules.list',
    description: 'Fetches User Agent Blocking rules in a zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of UA rules',
  },
  {
    name: 'firewall.uaRules.delete',
    description: 'Deletes an existing User Agent Blocking rule.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'ua_rule_id', type: 'string', required: true, description: 'UA rule ID' }],
    returns: 'Deleted UA rule confirmation',
  },
  {
    name: 'firewall.uaRules.get',
    description: 'Fetches the details of a User Agent Blocking rule.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'ua_rule_id', type: 'string', required: true, description: 'UA rule ID' }],
    returns: 'UA rule object',
  },

  // SSL Certificate Packs
  {
    name: 'ssl.certificatePacks.create',
    description: 'For a given zone, order an advanced certificate pack.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Certificate pack object',
  },
  {
    name: 'ssl.certificatePacks.list',
    description: 'For a given zone, list all active certificate packs.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of certificate packs',
  },
  {
    name: 'ssl.certificatePacks.delete',
    description: 'For a given zone, delete an advanced certificate pack.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'certificate_pack_id', type: 'string', required: true, description: 'Certificate pack ID' }],
    returns: 'Deleted certificate pack confirmation',
  },
  {
    name: 'ssl.certificatePacks.edit',
    description: 'For a given zone, restart validation for an advanced certificate pack.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'certificate_pack_id', type: 'string', required: true, description: 'Certificate pack ID' }],
    returns: 'Updated certificate pack object',
  },
  {
    name: 'ssl.certificatePacks.get',
    description: 'For a given zone, get a certificate pack.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'certificate_pack_id', type: 'string', required: true, description: 'Certificate pack ID' }],
    returns: 'Certificate pack object',
  },

  // SSL Analyze
  {
    name: 'ssl.analyze.create',
    description: 'Returns the set of hostnames, the signature algorithm, and the expiration date of the certificate.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'SSL analysis result',
  },

  // SSL Verification
  {
    name: 'ssl.verification.edit',
    description: 'Edit SSL validation method for a certificate pack.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'certificate_pack_id', type: 'string', required: true, description: 'Certificate pack ID' }],
    returns: 'Updated verification object',
  },
  {
    name: 'ssl.verification.get',
    description: 'Get SSL Verification Info for a Zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'SSL verification info',
  },

  // SSL Recommendations
  {
    name: 'ssl.recommendations.get',
    description: 'Retrieve the SSL/TLS Recommender\'s recommendation for a zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'SSL recommendation',
  },

  // Custom Certificates
  {
    name: 'customCertificates.create',
    description: 'Upload a new SSL certificate for a zone.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Custom certificate object',
  },
  {
    name: 'customCertificates.list',
    description: 'List, search, and filter all of your custom SSL certificates.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of custom certificates',
  },
  {
    name: 'customCertificates.delete',
    description: 'Remove a SSL certificate from a zone.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'custom_certificate_id', type: 'string', required: true, description: 'Custom certificate ID' }],
    returns: 'Deleted custom certificate confirmation',
  },
  {
    name: 'customCertificates.edit',
    description: 'Upload a new private key and/or PEM/CRT for the SSL certificate.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'custom_certificate_id', type: 'string', required: true, description: 'Custom certificate ID' }],
    returns: 'Updated custom certificate object',
  },
  {
    name: 'customCertificates.get',
    description: 'SSL Configuration Details',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'custom_certificate_id', type: 'string', required: true, description: 'Custom certificate ID' }],
    returns: 'Custom certificate object',
  },

  // Origin CA Certificates
  {
    name: 'originCACertificates.create',
    description: 'Create an Origin CA certificate.',
    operationType: 'write',
    params: [],
    returns: 'Origin CA certificate object',
  },
  {
    name: 'originCACertificates.list',
    description: 'List all existing Origin CA certificates for a given zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of Origin CA certificates',
  },
  {
    name: 'originCACertificates.delete',
    description: 'Revoke an existing Origin CA certificate by its serial number.',
    operationType: 'delete',
    params: [{ name: 'certificate_id', type: 'string', required: true, description: 'Certificate ID' }],
    returns: 'Revoked Origin CA certificate confirmation',
  },
  {
    name: 'originCACertificates.get',
    description: 'Get an existing Origin CA certificate by its serial number.',
    operationType: 'read',
    params: [{ name: 'certificate_id', type: 'string', required: true, description: 'Certificate ID' }],
    returns: 'Origin CA certificate object',
  },

  // Keyless Certificates
  {
    name: 'keylessCertificates.create',
    description: 'Create Keyless SSL Configuration',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Keyless certificate object',
  },
  {
    name: 'keylessCertificates.list',
    description: 'List all Keyless SSL configurations for a given zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of keyless certificates',
  },
  {
    name: 'keylessCertificates.delete',
    description: 'Delete Keyless SSL Configuration',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'keyless_certificate_id', type: 'string', required: true, description: 'Keyless certificate ID' }],
    returns: 'Deleted keyless certificate confirmation',
  },
  {
    name: 'keylessCertificates.edit',
    description: 'This will update attributes of a Keyless SSL.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'keyless_certificate_id', type: 'string', required: true, description: 'Keyless certificate ID' }],
    returns: 'Updated keyless certificate object',
  },
  {
    name: 'keylessCertificates.get',
    description: 'Get details for one Keyless SSL configuration.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'keyless_certificate_id', type: 'string', required: true, description: 'Keyless certificate ID' }],
    returns: 'Keyless certificate object',
  },

  // Client Certificates
  {
    name: 'clientCertificates.create',
    description: 'Create a new API Shield mTLS Client Certificate',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Client certificate object',
  },
  {
    name: 'clientCertificates.list',
    description: 'List all of your Zone\'s API Shield mTLS Client Certificates by Status and/or using Pagination',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of client certificates',
  },
  {
    name: 'clientCertificates.delete',
    description: 'Set a API Shield mTLS Client Certificate to pending_revocation status.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'client_certificate_id', type: 'string', required: true, description: 'Client certificate ID' }],
    returns: 'Revoked client certificate confirmation',
  },
  {
    name: 'clientCertificates.edit',
    description: 'If a API Shield mTLS Client Certificate is in a pending_revocation state, you may reactivate it.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'client_certificate_id', type: 'string', required: true, description: 'Client certificate ID' }],
    returns: 'Updated client certificate object',
  },
  {
    name: 'clientCertificates.get',
    description: 'Get Details for a single mTLS API Shield Client Certificate',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'client_certificate_id', type: 'string', required: true, description: 'Client certificate ID' }],
    returns: 'Client certificate object',
  },

  // Turnstile
  {
    name: 'turnstile.widgets.create',
    description: 'Lists challenge widgets.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Turnstile widget object',
  },
  {
    name: 'turnstile.widgets.update',
    description: 'Update the configuration of a widget.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'sitekey', type: 'string', required: true, description: 'Widget site key' }],
    returns: 'Updated widget object',
  },
  {
    name: 'turnstile.widgets.list',
    description: 'Lists all turnstile widgets of an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of turnstile widgets',
  },
  {
    name: 'turnstile.widgets.delete',
    description: 'Destroy a Turnstile Widget.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'sitekey', type: 'string', required: true, description: 'Widget site key' }],
    returns: 'Deleted widget confirmation',
  },
  {
    name: 'turnstile.widgets.get',
    description: 'Show a single challenge widget configuration.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'sitekey', type: 'string', required: true, description: 'Widget site key' }],
    returns: 'Turnstile widget object',
  },
  {
    name: 'turnstile.widgets.rotateSecret',
    description: 'Generate a new secret key for this widget.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'sitekey', type: 'string', required: true, description: 'Widget site key' }],
    returns: 'Rotated secret result',
  },

  // Bot Management
  {
    name: 'botManagement.update',
    description: 'Updates the Bot Management configuration for a zone.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated bot management config',
  },
  {
    name: 'botManagement.get',
    description: 'Retrieve a zone\'s Bot Management Config',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'Bot management config',
  },

  // Page Shield
  {
    name: 'pageShield.update',
    description: 'Updates Page Shield settings.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated Page Shield settings',
  },
  {
    name: 'pageShield.get',
    description: 'Fetches the Page Shield settings.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'Page Shield settings',
  },
  {
    name: 'pageShield.scripts.list',
    description: 'Lists all scripts detected by Page Shield.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of detected scripts',
  },
  {
    name: 'pageShield.scripts.get',
    description: 'Fetches a script detected by Page Shield by script ID.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'script_id', type: 'string', required: true, description: 'Script ID' }],
    returns: 'Detected script object',
  },
  {
    name: 'pageShield.connections.list',
    description: 'Lists all connections detected by Page Shield.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of detected connections',
  },
  {
    name: 'pageShield.connections.get',
    description: 'Fetches a connection detected by Page Shield by connection ID.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'connection_id', type: 'string', required: true, description: 'Connection ID' }],
    returns: 'Detected connection object',
  },

  // Page Rules
  {
    name: 'pageRules.create',
    description: 'Creates a new Page Rule.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Page Rule object',
  },
  {
    name: 'pageRules.update',
    description: 'Replaces the configuration of an existing Page Rule.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'pagerule_id', type: 'string', required: true, description: 'Page Rule ID' }],
    returns: 'Updated Page Rule object',
  },
  {
    name: 'pageRules.list',
    description: 'Fetches Page Rules in a zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of Page Rules',
  },
  {
    name: 'pageRules.delete',
    description: 'Deletes an existing Page Rule.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'pagerule_id', type: 'string', required: true, description: 'Page Rule ID' }],
    returns: 'Deleted Page Rule confirmation',
  },
  {
    name: 'pageRules.edit',
    description: 'Updates one or more fields of an existing Page Rule.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'pagerule_id', type: 'string', required: true, description: 'Page Rule ID' }],
    returns: 'Updated Page Rule object',
  },
  {
    name: 'pageRules.get',
    description: 'Fetches the details of a Page Rule.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'pagerule_id', type: 'string', required: true, description: 'Page Rule ID' }],
    returns: 'Page Rule object',
  },

  // Rate Limits
  {
    name: 'rateLimits.create',
    description: 'Creates a new rate limit for a zone.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Rate limit object',
  },
  {
    name: 'rateLimits.list',
    description: 'Fetches the rate limits for a zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of rate limits',
  },
  {
    name: 'rateLimits.delete',
    description: 'Deletes an existing rate limit.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'rate_limit_id', type: 'string', required: true, description: 'Rate limit ID' }],
    returns: 'Deleted rate limit confirmation',
  },
  {
    name: 'rateLimits.edit',
    description: 'Updates an existing rate limit.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'rate_limit_id', type: 'string', required: true, description: 'Rate limit ID' }],
    returns: 'Updated rate limit object',
  },
  {
    name: 'rateLimits.get',
    description: 'Fetches the details of a rate limit.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'rate_limit_id', type: 'string', required: true, description: 'Rate limit ID' }],
    returns: 'Rate limit object',
  },

  // Managed Transforms
  {
    name: 'managedTransforms.list',
    description: 'Fetches a list of all Managed Transforms.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'List of Managed Transforms',
  },
  {
    name: 'managedTransforms.delete',
    description: 'Disables all Managed Transforms.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM],
    returns: 'Deleted Managed Transforms confirmation',
  },
  {
    name: 'managedTransforms.edit',
    description: 'Updates the status of one or more Managed Transforms.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated Managed Transforms',
  },

  // URL Normalization
  {
    name: 'urlNormalization.update',
    description: 'Updates the URL Normalization settings.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated URL Normalization settings',
  },
  {
    name: 'urlNormalization.get',
    description: 'Fetches the current URL Normalization settings.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'URL Normalization settings',
  },

  // Security TXT
  {
    name: 'securityTXT.update',
    description: 'Update security.txt',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated security.txt',
  },
  {
    name: 'securityTXT.delete',
    description: 'Delete security.txt',
    operationType: 'delete',
    params: [ZONE_ID_PARAM],
    returns: 'Deleted security.txt confirmation',
  },
  {
    name: 'securityTXT.get',
    description: 'Get security.txt',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'security.txt content',
  },
];
