import type { ConnectorMethod } from '@keepai/proto';
import { ZONE_ID_PARAM, ACCOUNT_ID_PARAM, LIST_PARAMS } from './params.js';

// ===== DNS & ZONES =====
export const dnsMethods: ConnectorMethod[] = [
  // Zones
  {
    name: 'zones.create',
    description: 'Create Zone',
    operationType: 'write',
    params: [
      ACCOUNT_ID_PARAM,
      { name: 'name', type: 'string', required: true, description: 'Zone name (domain)' },
      { name: 'type', type: 'string', required: false, description: 'Zone type (full or partial)' },
    ],
    returns: 'Zone object',
  },
  {
    name: 'zones.list',
    description: 'Lists, searches, sorts, and filters your zones.',
    operationType: 'read',
    params: [
      { name: 'name', type: 'string', required: false, description: 'Filter by zone name' },
      ...LIST_PARAMS,
    ],
    returns: 'List of zone objects',
  },
  {
    name: 'zones.get',
    description: 'Zone Details',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'Zone object',
  },
  {
    name: 'zones.edit',
    description: 'Edits a zone. Only one zone property can be changed at a time.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated zone object',
  },
  {
    name: 'zones.delete',
    description: 'Deletes an existing zone.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM],
    returns: 'Deleted zone confirmation',
  },

  // DNS Records
  {
    name: 'dns.records.create',
    description: 'Create a new DNS record for a zone.',
    operationType: 'write',
    params: [
      ZONE_ID_PARAM,
      { name: 'type', type: 'string', required: true, description: 'DNS record type (A, AAAA, CNAME, MX, TXT, etc.)' },
      { name: 'name', type: 'string', required: true, description: 'DNS record name' },
      { name: 'content', type: 'string', required: true, description: 'DNS record content' },
      { name: 'ttl', type: 'number', required: false, description: 'TTL in seconds (1 = automatic)' },
      { name: 'proxied', type: 'boolean', required: false, description: 'Whether the record is proxied through Cloudflare' },
      { name: 'priority', type: 'number', required: false, description: 'Priority (for MX, SRV, URI records)' },
      { name: 'comment', type: 'string', required: false, description: 'Comment for the record' },
      { name: 'tags', type: 'array', required: false, description: 'Tags for the record' },
    ],
    returns: 'DNS record object',
  },
  {
    name: 'dns.records.update',
    description: 'Overwrite an existing DNS record.',
    operationType: 'write',
    params: [
      ZONE_ID_PARAM,
      { name: 'dns_record_id', type: 'string', required: true, description: 'DNS record ID' },
      { name: 'type', type: 'string', required: true, description: 'DNS record type' },
      { name: 'name', type: 'string', required: true, description: 'DNS record name' },
      { name: 'content', type: 'string', required: true, description: 'DNS record content' },
      { name: 'ttl', type: 'number', required: false, description: 'TTL in seconds' },
      { name: 'proxied', type: 'boolean', required: false, description: 'Whether proxied' },
    ],
    returns: 'Updated DNS record object',
  },
  {
    name: 'dns.records.list',
    description: 'List, search, sort, and filter a zones\' DNS records.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of DNS records',
  },
  {
    name: 'dns.records.delete',
    description: 'Delete DNS Record',
    operationType: 'delete',
    params: [
      ZONE_ID_PARAM,
      { name: 'dns_record_id', type: 'string', required: true, description: 'DNS record ID' },
    ],
    returns: 'Deleted DNS record confirmation',
  },
  {
    name: 'dns.records.batch',
    description: 'Send a Batch of DNS Record API calls to be executed together.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Batch result',
  },
  {
    name: 'dns.records.edit',
    description: 'Update an existing DNS record.',
    operationType: 'write',
    params: [
      ZONE_ID_PARAM,
      { name: 'dns_record_id', type: 'string', required: true, description: 'DNS record ID' },
    ],
    returns: 'Updated DNS record object',
  },
  {
    name: 'dns.records.export',
    description: 'You can export your BIND config through this endpoint.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'BIND config string',
  },
  {
    name: 'dns.records.get',
    description: 'DNS Record Details',
    operationType: 'read',
    params: [
      ZONE_ID_PARAM,
      { name: 'dns_record_id', type: 'string', required: true, description: 'DNS record ID' },
    ],
    returns: 'DNS record object',
  },
  {
    name: 'dns.records.import',
    description: 'You can upload your BIND config through this endpoint.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Import result',
  },
  {
    name: 'dns.records.scan',
    description: 'Scan for common DNS records on your domain and automatically add them to your zone.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Scan result',
  },

  // DNSSEC
  {
    name: 'dns.dnssec.delete',
    description: 'Delete DNSSEC.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM],
    returns: 'Deleted DNSSEC confirmation',
  },
  {
    name: 'dns.dnssec.edit',
    description: 'Enable or disable DNSSEC.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated DNSSEC settings',
  },
  {
    name: 'dns.dnssec.get',
    description: 'Details about DNSSEC status and configuration.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'DNSSEC status object',
  },

  // DNS Firewall
  {
    name: 'dnsFirewall.create',
    description: 'Create a DNS Firewall cluster',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'name', type: 'string', required: true, description: 'Cluster name' }],
    returns: 'DNS Firewall cluster object',
  },
  {
    name: 'dnsFirewall.list',
    description: 'List DNS Firewall clusters for an account',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of DNS Firewall clusters',
  },
  {
    name: 'dnsFirewall.delete',
    description: 'Delete a DNS Firewall cluster',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'dns_firewall_id', type: 'string', required: true, description: 'DNS Firewall cluster ID' }],
    returns: 'Deleted DNS Firewall cluster confirmation',
  },
  {
    name: 'dnsFirewall.edit',
    description: 'Modify the configuration of a DNS Firewall cluster',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'dns_firewall_id', type: 'string', required: true, description: 'DNS Firewall cluster ID' }],
    returns: 'Updated DNS Firewall cluster object',
  },
  {
    name: 'dnsFirewall.get',
    description: 'Show a single DNS Firewall cluster for an account',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'dns_firewall_id', type: 'string', required: true, description: 'DNS Firewall cluster ID' }],
    returns: 'DNS Firewall cluster object',
  },
];
