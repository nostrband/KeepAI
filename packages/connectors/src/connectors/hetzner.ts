/**
 * Hetzner Cloud connector — ~122 methods covering servers, volumes, networks,
 * load balancers, firewalls, floating IPs, primary IPs, images, SSH keys,
 * certificates, placement groups, and read-only reference resources.
 *
 * Uses direct HTTP calls to the Hetzner Cloud REST API (no SDK).
 * Auth is via API token (manual entry).
 */

import type {
  Connector,
  ConnectorMethod,
  PermissionMetadata,
  ServiceHelp,
  ServiceHelpGroup,
  OAuthCredentials,
} from '@keepai/proto';

// ---------------------------------------------------------------------------
// HTTP client helper
// ---------------------------------------------------------------------------

const HETZNER_API = 'https://api.hetzner.cloud/v1';

async function hetznerFetch(
  path: string,
  credentials: OAuthCredentials,
  options: RequestInit = {},
): Promise<unknown> {
  const res = await fetch(`${HETZNER_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = (body as any)?.error;
    throw Object.assign(
      new Error(error?.message || `Hetzner API error: ${res.status}`),
      { status: res.status, code: error?.code, retryAfter: res.headers.get('retry-after') },
    );
  }

  if (res.status === 204) return {};
  return res.json();
}

function buildQuery(params: Record<string, unknown>, keys: string[]): string {
  const entries: [string, string][] = [];
  for (const k of keys) {
    if (params[k] != null) entries.push([k, String(params[k])]);
  }
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ---------------------------------------------------------------------------
// Common param helpers
// ---------------------------------------------------------------------------

const ID_PARAM = { name: 'id', type: 'number' as const, required: true, description: 'Resource ID' };
const PAGE_PARAM = { name: 'page', type: 'number' as const, required: false, description: 'Page number (default 1)' };
const PER_PAGE_PARAM = { name: 'per_page', type: 'number' as const, required: false, description: 'Results per page (1-50, default 25)' };
const LIST_PARAMS = [PAGE_PARAM, PER_PAGE_PARAM];
const NAME_FILTER = { name: 'name', type: 'string' as const, required: false, description: 'Filter by exact name' };
const LABEL_SELECTOR = { name: 'label_selector', type: 'string' as const, required: false, description: 'Filter by label selector (e.g., "env=prod,app!=test")' };
const SORT_PARAM = { name: 'sort', type: 'string' as const, required: false, description: 'Sort by field (e.g., "id:asc", "name:desc", "created:desc")' };
const LABELS_PARAM = { name: 'labels', type: 'object' as const, required: false, description: 'Key-value labels' };

const STD_LIST_PARAMS = [NAME_FILTER, LABEL_SELECTOR, SORT_PARAM, ...LIST_PARAMS];
const LIST_QUERY_KEYS = ['name', 'label_selector', 'sort', 'status', 'type', 'fingerprint', 'architecture', 'include_deprecated', 'include_architecture_wildcard', 'page', 'per_page'];

// ---------------------------------------------------------------------------
// Method definitions — organized by group
// ---------------------------------------------------------------------------

// ===== COMPUTE =====
const computeMethods: ConnectorMethod[] = [
  // --- Servers ---
  { name: 'servers.list', description: 'List all servers in the project', operationType: 'read',
    params: [NAME_FILTER, LABEL_SELECTOR, { name: 'status', type: 'string', required: false, description: 'Filter by status: initializing, starting, running, stopping, off, deleting, rebuilding, migrating, unknown' }, SORT_PARAM, ...LIST_PARAMS],
    returns: 'List of server objects with pagination metadata' },
  { name: 'servers.get', description: 'Get a server by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'Server object' },
  { name: 'servers.create', description: 'Create a new server', operationType: 'write',
    params: [
      { name: 'name', type: 'string', required: true, description: 'Server name (unique within project)' },
      { name: 'server_type', type: 'string', required: true, description: 'Server type name or ID (e.g., cx22, cpx11)' },
      { name: 'image', type: 'string', required: true, description: 'Image name or ID (e.g., ubuntu-24.04, debian-12)' },
      { name: 'location', type: 'string', required: false, description: 'Location name (e.g., fsn1, nbg1, hel1, ash, hil)' },
      { name: 'datacenter', type: 'string', required: false, description: 'Datacenter name (e.g., fsn1-dc14) — alternative to location' },
      { name: 'ssh_keys', type: 'array', required: false, description: 'Array of SSH key names or IDs' },
      { name: 'user_data', type: 'string', required: false, description: 'Cloud-init user data' },
      LABELS_PARAM,
      { name: 'volumes', type: 'array', required: false, description: 'Volume IDs to attach' },
      { name: 'networks', type: 'array', required: false, description: 'Network IDs to attach to' },
      { name: 'firewalls', type: 'array', required: false, description: 'Firewall objects [{ firewall: id }]' },
      { name: 'placement_group', type: 'number', required: false, description: 'Placement group ID' },
      { name: 'public_net', type: 'object', required: false, description: 'Public network config: { enable_ipv4, enable_ipv6, ipv4, ipv6 }' },
      { name: 'start_after_create', type: 'boolean', required: false, description: 'Start server after creation (default: true)' },
      { name: 'automount', type: 'boolean', required: false, description: 'Auto-mount volumes (default: false)' },
    ],
    returns: 'Created server object with action and root_password (if no SSH keys)',
    example: { params: { name: 'web-1', server_type: 'cx22', image: 'ubuntu-24.04', location: 'fsn1' }, description: 'Create a basic server' },
  },
  { name: 'servers.update', description: 'Update server name and labels', operationType: 'write',
    params: [ID_PARAM, { name: 'name', type: 'string', required: false, description: 'New server name' }, LABELS_PARAM],
    returns: 'Updated server object' },
  { name: 'servers.delete', description: 'Delete a server (irreversible)', operationType: 'delete',
    params: [ID_PARAM], returns: 'Action object' },
  { name: 'servers.getMetrics', description: 'Get server metrics (CPU, disk, network)', operationType: 'read',
    params: [ID_PARAM,
      { name: 'type', type: 'string', required: true, description: 'Metric type: cpu, disk, network' },
      { name: 'start', type: 'string', required: true, description: 'Start time (ISO 8601)' },
      { name: 'end', type: 'string', required: true, description: 'End time (ISO 8601)' },
      { name: 'step', type: 'number', required: false, description: 'Resolution in seconds' },
    ], returns: 'Metrics time series data' },
  // Server actions
  { name: 'servers.poweron', description: 'Power on a stopped server', operationType: 'write', params: [ID_PARAM], returns: 'Action object' },
  { name: 'servers.poweroff', description: 'Hard power off (like pulling the plug)', operationType: 'write', params: [ID_PARAM], returns: 'Action object' },
  { name: 'servers.reboot', description: 'Soft reboot (sends ACPI signal)', operationType: 'write', params: [ID_PARAM], returns: 'Action object' },
  { name: 'servers.reset', description: 'Hard reset (like pressing reset button)', operationType: 'write', params: [ID_PARAM], returns: 'Action object' },
  { name: 'servers.shutdown', description: 'Graceful shutdown via ACPI', operationType: 'write', params: [ID_PARAM], returns: 'Action object' },
  { name: 'servers.resetPassword', description: 'Reset root password (returns new password)', operationType: 'write', params: [ID_PARAM], returns: 'Action object with root_password' },
  { name: 'servers.createImage', description: 'Create a snapshot or backup image from server', operationType: 'write',
    params: [ID_PARAM,
      { name: 'description', type: 'string', required: false, description: 'Image description' },
      { name: 'type', type: 'string', required: false, description: 'snapshot (default) or backup', enum: ['snapshot', 'backup'] },
      LABELS_PARAM,
    ], returns: 'Image object with action' },
  { name: 'servers.enableRescue', description: 'Boot into rescue system', operationType: 'write',
    params: [ID_PARAM,
      { name: 'type', type: 'string', required: false, description: 'Rescue system type: linux64 (default)', enum: ['linux64'] },
      { name: 'ssh_keys', type: 'array', required: false, description: 'SSH key IDs to inject' },
    ], returns: 'Action object with root_password' },
  { name: 'servers.disableRescue', description: 'Disable rescue mode', operationType: 'write', params: [ID_PARAM], returns: 'Action object' },
  { name: 'servers.rebuild', description: 'Rebuild server from an image (destroys all data)', operationType: 'write',
    params: [ID_PARAM, { name: 'image', type: 'string', required: true, description: 'Image name or ID to rebuild from' }],
    returns: 'Action object with root_password',
    notes: ['This destroys all data on the server'] },
  { name: 'servers.changeType', description: 'Resize — change server type (upgrade/downgrade)', operationType: 'write',
    params: [ID_PARAM,
      { name: 'server_type', type: 'string', required: true, description: 'New server type name or ID' },
      { name: 'upgrade_disk', type: 'boolean', required: true, description: 'Whether to upgrade disk size (cannot downgrade if true)' },
    ], returns: 'Action object' },
  { name: 'servers.attachIso', description: 'Attach an ISO image to server', operationType: 'write',
    params: [ID_PARAM, { name: 'iso', type: 'string', required: true, description: 'ISO name or ID' }],
    returns: 'Action object' },
  { name: 'servers.detachIso', description: 'Detach the current ISO image', operationType: 'write', params: [ID_PARAM], returns: 'Action object' },
  { name: 'servers.enableBackup', description: 'Enable automatic daily backups', operationType: 'write', params: [ID_PARAM], returns: 'Action object' },
  { name: 'servers.disableBackup', description: 'Disable automatic backups', operationType: 'write', params: [ID_PARAM], returns: 'Action object' },
  { name: 'servers.changeDnsPtr', description: 'Set reverse DNS entry for server IP', operationType: 'write',
    params: [ID_PARAM,
      { name: 'ip', type: 'string', required: true, description: 'IP address to set reverse DNS for' },
      { name: 'dns_ptr', type: 'string', required: true, description: 'Hostname for reverse DNS (or null to reset)' },
    ], returns: 'Action object' },
  { name: 'servers.changeProtection', description: 'Enable/disable delete and rebuild protection', operationType: 'write',
    params: [ID_PARAM,
      { name: 'delete', type: 'boolean', required: false, description: 'Enable/disable delete protection' },
      { name: 'rebuild', type: 'boolean', required: false, description: 'Enable/disable rebuild protection' },
    ], returns: 'Action object' },
  { name: 'servers.requestConsole', description: 'Get VNC console URL and password', operationType: 'read',
    params: [ID_PARAM], returns: 'Console URL and password' },
  { name: 'servers.attachToNetwork', description: 'Attach server to a private network', operationType: 'write',
    params: [ID_PARAM,
      { name: 'network', type: 'number', required: true, description: 'Network ID' },
      { name: 'ip', type: 'string', required: false, description: 'Specific IP in the network to assign' },
      { name: 'alias_ips', type: 'array', required: false, description: 'Additional alias IPs' },
    ], returns: 'Action object' },
  { name: 'servers.detachFromNetwork', description: 'Detach server from a private network', operationType: 'write',
    params: [ID_PARAM, { name: 'network', type: 'number', required: true, description: 'Network ID' }],
    returns: 'Action object' },
  { name: 'servers.changeAliasIps', description: 'Change alias IPs on a network interface', operationType: 'write',
    params: [ID_PARAM,
      { name: 'network', type: 'number', required: true, description: 'Network ID' },
      { name: 'alias_ips', type: 'array', required: true, description: 'New set of alias IPs' },
    ], returns: 'Action object' },
  { name: 'servers.addToPlacementGroup', description: 'Add server to a placement group', operationType: 'write',
    params: [ID_PARAM, { name: 'placement_group', type: 'number', required: true, description: 'Placement group ID' }],
    returns: 'Action object' },
  { name: 'servers.removeFromPlacementGroup', description: 'Remove server from its placement group', operationType: 'write',
    params: [ID_PARAM], returns: 'Action object' },

  // --- Server Types (read-only) ---
  { name: 'serverTypes.list', description: 'List all available server types', operationType: 'read',
    params: [NAME_FILTER, ...LIST_PARAMS], returns: 'List of server type objects' },
  { name: 'serverTypes.get', description: 'Get a server type by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'Server type object' },

  // --- Images ---
  { name: 'images.list', description: 'List images (system, snapshot, backup)', operationType: 'read',
    params: [NAME_FILTER, LABEL_SELECTOR,
      { name: 'type', type: 'string', required: false, description: 'Filter by type: system, snapshot, backup, app' },
      { name: 'status', type: 'string', required: false, description: 'Filter by status: available, creating, unavailable' },
      { name: 'architecture', type: 'string', required: false, description: 'Filter by architecture: x86, arm' },
      { name: 'include_deprecated', type: 'boolean', required: false, description: 'Include deprecated images' },
      SORT_PARAM, ...LIST_PARAMS,
    ], returns: 'List of image objects' },
  { name: 'images.get', description: 'Get image by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'Image object' },
  { name: 'images.update', description: 'Update image description, type, labels', operationType: 'write',
    params: [ID_PARAM,
      { name: 'description', type: 'string', required: false, description: 'New description' },
      { name: 'type', type: 'string', required: false, description: 'New type: snapshot' },
      LABELS_PARAM,
    ], returns: 'Updated image object' },
  { name: 'images.delete', description: 'Delete an image (snapshots only)', operationType: 'delete',
    params: [ID_PARAM], returns: 'Empty response' },
  { name: 'images.changeProtection', description: 'Enable/disable delete protection on image', operationType: 'write',
    params: [ID_PARAM, { name: 'delete', type: 'boolean', required: false, description: 'Enable/disable delete protection' }],
    returns: 'Action object' },

  // --- ISOs (read-only) ---
  { name: 'isos.list', description: 'List available ISOs', operationType: 'read',
    params: [NAME_FILTER,
      { name: 'architecture', type: 'string', required: false, description: 'Filter by architecture: x86, arm' },
      { name: 'include_architecture_wildcard', type: 'boolean', required: false, description: 'Include ISOs with null architecture' },
      ...LIST_PARAMS,
    ], returns: 'List of ISO objects' },
  { name: 'isos.get', description: 'Get ISO by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'ISO object' },

  // --- Placement Groups ---
  { name: 'placementGroups.list', description: 'List placement groups', operationType: 'read',
    params: [NAME_FILTER, LABEL_SELECTOR, SORT_PARAM, ...LIST_PARAMS], returns: 'List of placement group objects' },
  { name: 'placementGroups.get', description: 'Get placement group by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'Placement group object' },
  { name: 'placementGroups.create', description: 'Create a placement group', operationType: 'write',
    params: [
      { name: 'name', type: 'string', required: true, description: 'Placement group name' },
      { name: 'type', type: 'string', required: true, description: 'Type — currently only spread', enum: ['spread'] },
      LABELS_PARAM,
    ], returns: 'Placement group object' },
  { name: 'placementGroups.update', description: 'Update placement group name and labels', operationType: 'write',
    params: [ID_PARAM, { name: 'name', type: 'string', required: false, description: 'New name' }, LABELS_PARAM],
    returns: 'Updated placement group object' },
  { name: 'placementGroups.delete', description: 'Delete a placement group', operationType: 'delete',
    params: [ID_PARAM], returns: 'Empty response' },
];

// ===== NETWORKING =====
const networkingMethods: ConnectorMethod[] = [
  // --- Networks ---
  { name: 'networks.list', description: 'List all networks', operationType: 'read',
    params: [...STD_LIST_PARAMS], returns: 'List of network objects' },
  { name: 'networks.get', description: 'Get network by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'Network object' },
  { name: 'networks.create', description: 'Create a network', operationType: 'write',
    params: [
      { name: 'name', type: 'string', required: true, description: 'Network name' },
      { name: 'ip_range', type: 'string', required: true, description: 'IP range in CIDR notation (e.g., 10.0.0.0/16)' },
      { name: 'subnets', type: 'array', required: false, description: 'Subnets: [{ type, ip_range, network_zone }]' },
      { name: 'routes', type: 'array', required: false, description: 'Routes: [{ destination, gateway }]' },
      LABELS_PARAM,
      { name: 'expose_routes_to_vswitch', type: 'boolean', required: false, description: 'Expose routes to connected vSwitches' },
    ], returns: 'Network object' },
  { name: 'networks.update', description: 'Update network name and labels', operationType: 'write',
    params: [ID_PARAM, { name: 'name', type: 'string', required: false, description: 'New name' }, LABELS_PARAM],
    returns: 'Updated network object' },
  { name: 'networks.delete', description: 'Delete a network', operationType: 'delete',
    params: [ID_PARAM], returns: 'Empty response' },
  { name: 'networks.changeIpRange', description: 'Change the IP range of a network', operationType: 'write',
    params: [ID_PARAM, { name: 'ip_range', type: 'string', required: true, description: 'New IP range in CIDR notation' }],
    returns: 'Action object' },
  { name: 'networks.addSubnet', description: 'Add a subnet to a network', operationType: 'write',
    params: [ID_PARAM,
      { name: 'type', type: 'string', required: true, description: 'Subnet type: cloud, server, vswitch' },
      { name: 'ip_range', type: 'string', required: true, description: 'IP range in CIDR notation' },
      { name: 'network_zone', type: 'string', required: true, description: 'Network zone: eu-central, us-east, us-west, ap-southeast' },
      { name: 'vswitch_id', type: 'number', required: false, description: 'vSwitch ID (only for type vswitch)' },
    ], returns: 'Action object' },
  { name: 'networks.deleteSubnet', description: 'Delete a subnet from a network', operationType: 'write',
    params: [ID_PARAM, { name: 'ip_range', type: 'string', required: true, description: 'IP range of the subnet to delete' }],
    returns: 'Action object' },
  { name: 'networks.addRoute', description: 'Add a route to a network', operationType: 'write',
    params: [ID_PARAM,
      { name: 'destination', type: 'string', required: true, description: 'Destination in CIDR notation' },
      { name: 'gateway', type: 'string', required: true, description: 'Gateway IP' },
    ], returns: 'Action object' },
  { name: 'networks.deleteRoute', description: 'Delete a route from a network', operationType: 'write',
    params: [ID_PARAM,
      { name: 'destination', type: 'string', required: true, description: 'Destination of the route to delete' },
      { name: 'gateway', type: 'string', required: true, description: 'Gateway of the route to delete' },
    ], returns: 'Action object' },
  { name: 'networks.changeProtection', description: 'Enable/disable delete protection on network', operationType: 'write',
    params: [ID_PARAM, { name: 'delete', type: 'boolean', required: false, description: 'Enable/disable delete protection' }],
    returns: 'Action object' },

  // --- Floating IPs ---
  { name: 'floatingIps.list', description: 'List all floating IPs', operationType: 'read',
    params: [NAME_FILTER, LABEL_SELECTOR, SORT_PARAM, ...LIST_PARAMS], returns: 'List of floating IP objects' },
  { name: 'floatingIps.get', description: 'Get floating IP by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'Floating IP object' },
  { name: 'floatingIps.create', description: 'Create a floating IP', operationType: 'write',
    params: [
      { name: 'type', type: 'string', required: true, description: 'IP type: ipv4 or ipv6' },
      { name: 'home_location', type: 'string', required: true, description: 'Home location name (e.g., fsn1)' },
      { name: 'server', type: 'number', required: false, description: 'Server ID to assign immediately' },
      { name: 'description', type: 'string', required: false, description: 'Description' },
      { name: 'name', type: 'string', required: false, description: 'Name' },
      LABELS_PARAM,
    ], returns: 'Floating IP object with action' },
  { name: 'floatingIps.update', description: 'Update floating IP name, description, labels', operationType: 'write',
    params: [ID_PARAM, { name: 'name', type: 'string', required: false, description: 'New name' },
      { name: 'description', type: 'string', required: false, description: 'New description' }, LABELS_PARAM],
    returns: 'Updated floating IP object' },
  { name: 'floatingIps.delete', description: 'Delete a floating IP', operationType: 'delete',
    params: [ID_PARAM], returns: 'Empty response' },
  { name: 'floatingIps.assign', description: 'Assign floating IP to a server', operationType: 'write',
    params: [ID_PARAM, { name: 'server', type: 'number', required: true, description: 'Server ID to assign to' }],
    returns: 'Action object' },
  { name: 'floatingIps.unassign', description: 'Unassign floating IP from server', operationType: 'write',
    params: [ID_PARAM], returns: 'Action object' },
  { name: 'floatingIps.changeDnsPtr', description: 'Change reverse DNS of floating IP', operationType: 'write',
    params: [ID_PARAM,
      { name: 'ip', type: 'string', required: true, description: 'IP address' },
      { name: 'dns_ptr', type: 'string', required: true, description: 'Hostname for reverse DNS (or null to reset)' },
    ], returns: 'Action object' },
  { name: 'floatingIps.changeProtection', description: 'Enable/disable delete protection on floating IP', operationType: 'write',
    params: [ID_PARAM, { name: 'delete', type: 'boolean', required: false, description: 'Enable/disable delete protection' }],
    returns: 'Action object' },

  // --- Primary IPs ---
  { name: 'primaryIps.list', description: 'List all primary IPs', operationType: 'read',
    params: [NAME_FILTER, LABEL_SELECTOR, SORT_PARAM, ...LIST_PARAMS], returns: 'List of primary IP objects' },
  { name: 'primaryIps.get', description: 'Get primary IP by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'Primary IP object' },
  { name: 'primaryIps.create', description: 'Create a primary IP', operationType: 'write',
    params: [
      { name: 'type', type: 'string', required: true, description: 'IP type: ipv4 or ipv6' },
      { name: 'assignee_type', type: 'string', required: true, description: 'Currently only: server' },
      { name: 'datacenter', type: 'string', required: true, description: 'Datacenter name' },
      { name: 'assignee_id', type: 'number', required: false, description: 'Server ID to assign immediately' },
      { name: 'auto_delete', type: 'boolean', required: false, description: 'Delete when assigned server is deleted' },
      { name: 'name', type: 'string', required: false, description: 'Name' },
      LABELS_PARAM,
    ], returns: 'Primary IP object' },
  { name: 'primaryIps.update', description: 'Update primary IP name, labels, auto_delete', operationType: 'write',
    params: [ID_PARAM, { name: 'name', type: 'string', required: false, description: 'New name' },
      { name: 'auto_delete', type: 'boolean', required: false, description: 'Auto-delete setting' }, LABELS_PARAM],
    returns: 'Updated primary IP object' },
  { name: 'primaryIps.delete', description: 'Delete a primary IP', operationType: 'delete',
    params: [ID_PARAM], returns: 'Empty response' },
  { name: 'primaryIps.assign', description: 'Assign primary IP to a server', operationType: 'write',
    params: [ID_PARAM,
      { name: 'assignee_id', type: 'number', required: true, description: 'Server ID' },
      { name: 'assignee_type', type: 'string', required: true, description: 'Currently only: server' },
    ], returns: 'Action object' },
  { name: 'primaryIps.unassign', description: 'Unassign primary IP from server', operationType: 'write',
    params: [ID_PARAM], returns: 'Action object' },
  { name: 'primaryIps.changeDnsPtr', description: 'Change reverse DNS of primary IP', operationType: 'write',
    params: [ID_PARAM,
      { name: 'ip', type: 'string', required: true, description: 'IP address' },
      { name: 'dns_ptr', type: 'string', required: true, description: 'Hostname (or null to reset)' },
    ], returns: 'Action object' },
  { name: 'primaryIps.changeProtection', description: 'Enable/disable delete protection on primary IP', operationType: 'write',
    params: [ID_PARAM, { name: 'delete', type: 'boolean', required: false, description: 'Enable/disable delete protection' }],
    returns: 'Action object' },

  // --- Load Balancers ---
  { name: 'loadBalancers.list', description: 'List all load balancers', operationType: 'read',
    params: [...STD_LIST_PARAMS], returns: 'List of load balancer objects' },
  { name: 'loadBalancers.get', description: 'Get load balancer by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'Load balancer object' },
  { name: 'loadBalancers.create', description: 'Create a load balancer', operationType: 'write',
    params: [
      { name: 'name', type: 'string', required: true, description: 'Load balancer name' },
      { name: 'load_balancer_type', type: 'string', required: true, description: 'Type name or ID (e.g., lb11)' },
      { name: 'location', type: 'string', required: false, description: 'Location name' },
      { name: 'network_zone', type: 'string', required: false, description: 'Network zone (alternative to location)' },
      { name: 'algorithm', type: 'object', required: false, description: '{ type: "round_robin" } or { type: "least_connections" }' },
      { name: 'services', type: 'array', required: false, description: 'Service definitions (protocol, ports, health check)' },
      { name: 'targets', type: 'array', required: false, description: 'Target definitions' },
      { name: 'network', type: 'number', required: false, description: 'Network ID to attach to' },
      { name: 'public_interface', type: 'boolean', required: false, description: 'Enable public interface (default: true)' },
      LABELS_PARAM,
    ], returns: 'Load balancer object with action' },
  { name: 'loadBalancers.update', description: 'Update load balancer name and labels', operationType: 'write',
    params: [ID_PARAM, { name: 'name', type: 'string', required: false, description: 'New name' }, LABELS_PARAM],
    returns: 'Updated load balancer object' },
  { name: 'loadBalancers.delete', description: 'Delete a load balancer', operationType: 'delete',
    params: [ID_PARAM], returns: 'Empty response' },
  { name: 'loadBalancers.getMetrics', description: 'Get load balancer metrics', operationType: 'read',
    params: [ID_PARAM,
      { name: 'type', type: 'string', required: true, description: 'Metric type: open_connections, connections_per_second, requests_per_second, bandwidth' },
      { name: 'start', type: 'string', required: true, description: 'Start time (ISO 8601)' },
      { name: 'end', type: 'string', required: true, description: 'End time (ISO 8601)' },
      { name: 'step', type: 'number', required: false, description: 'Resolution in seconds' },
    ], returns: 'Metrics time series data' },
  { name: 'loadBalancers.addTarget', description: 'Add a target to load balancer', operationType: 'write',
    params: [ID_PARAM,
      { name: 'type', type: 'string', required: true, description: 'Target type: server, ip, label_selector' },
      { name: 'server', type: 'object', required: false, description: '{ id: number } — for type server' },
      { name: 'ip', type: 'object', required: false, description: '{ ip: string } — for type ip' },
      { name: 'label_selector', type: 'object', required: false, description: '{ selector: string } — for type label_selector' },
      { name: 'use_private_ip', type: 'boolean', required: false, description: 'Use private IP for health checks' },
    ], returns: 'Action object' },
  { name: 'loadBalancers.removeTarget', description: 'Remove a target from load balancer', operationType: 'write',
    params: [ID_PARAM,
      { name: 'type', type: 'string', required: true, description: 'Target type: server, ip, label_selector' },
      { name: 'server', type: 'object', required: false, description: '{ id: number }' },
      { name: 'ip', type: 'object', required: false, description: '{ ip: string }' },
      { name: 'label_selector', type: 'object', required: false, description: '{ selector: string }' },
    ], returns: 'Action object' },
  { name: 'loadBalancers.addService', description: 'Add a service (port mapping + health check)', operationType: 'write',
    params: [ID_PARAM,
      { name: 'protocol', type: 'string', required: true, description: 'Protocol: http, https, tcp' },
      { name: 'listen_port', type: 'number', required: true, description: 'Port to listen on' },
      { name: 'destination_port', type: 'number', required: true, description: 'Port to forward to' },
      { name: 'proxyprotocol', type: 'boolean', required: false, description: 'Enable PROXY protocol' },
      { name: 'health_check', type: 'object', required: false, description: 'Health check config' },
      { name: 'http', type: 'object', required: false, description: 'HTTP config (cookies, certs, sticky sessions, redirect)' },
    ], returns: 'Action object' },
  { name: 'loadBalancers.updateService', description: 'Update a load balancer service', operationType: 'write',
    params: [ID_PARAM,
      { name: 'listen_port', type: 'number', required: true, description: 'Port of the service to update' },
      { name: 'protocol', type: 'string', required: false, description: 'New protocol' },
      { name: 'destination_port', type: 'number', required: false, description: 'New destination port' },
      { name: 'proxyprotocol', type: 'boolean', required: false, description: 'Enable PROXY protocol' },
      { name: 'health_check', type: 'object', required: false, description: 'New health check config' },
      { name: 'http', type: 'object', required: false, description: 'New HTTP config' },
    ], returns: 'Action object' },
  { name: 'loadBalancers.deleteService', description: 'Delete a load balancer service', operationType: 'write',
    params: [ID_PARAM, { name: 'listen_port', type: 'number', required: true, description: 'Port of the service to delete' }],
    returns: 'Action object' },
  { name: 'loadBalancers.changeProtection', description: 'Change delete protection on load balancer', operationType: 'write',
    params: [ID_PARAM, { name: 'delete', type: 'boolean', required: false, description: 'Enable/disable delete protection' }],
    returns: 'Action object' },
  { name: 'loadBalancers.changeAlgorithm', description: 'Change load balancer algorithm', operationType: 'write',
    params: [ID_PARAM, { name: 'type', type: 'string', required: true, description: 'round_robin or least_connections' }],
    returns: 'Action object' },
  { name: 'loadBalancers.changeType', description: 'Change load balancer type', operationType: 'write',
    params: [ID_PARAM, { name: 'load_balancer_type', type: 'string', required: true, description: 'New LB type name or ID' }],
    returns: 'Action object' },
  { name: 'loadBalancers.changeDnsPtr', description: 'Change reverse DNS of load balancer', operationType: 'write',
    params: [ID_PARAM,
      { name: 'ip', type: 'string', required: true, description: 'IP address' },
      { name: 'dns_ptr', type: 'string', required: true, description: 'Hostname (or null to reset)' },
    ], returns: 'Action object' },
  { name: 'loadBalancers.attachToNetwork', description: 'Attach load balancer to a private network', operationType: 'write',
    params: [ID_PARAM,
      { name: 'network', type: 'number', required: true, description: 'Network ID' },
      { name: 'ip', type: 'string', required: false, description: 'IP to assign in the network' },
    ], returns: 'Action object' },
  { name: 'loadBalancers.detachFromNetwork', description: 'Detach load balancer from a private network', operationType: 'write',
    params: [ID_PARAM, { name: 'network', type: 'number', required: true, description: 'Network ID' }],
    returns: 'Action object' },
  { name: 'loadBalancers.enablePublicInterface', description: 'Enable public interface on load balancer', operationType: 'write',
    params: [ID_PARAM], returns: 'Action object' },
  { name: 'loadBalancers.disablePublicInterface', description: 'Disable public interface on load balancer', operationType: 'write',
    params: [ID_PARAM], returns: 'Action object' },

  // --- Load Balancer Types (read-only) ---
  { name: 'loadBalancerTypes.list', description: 'List available load balancer types', operationType: 'read',
    params: [NAME_FILTER, ...LIST_PARAMS], returns: 'List of load balancer type objects' },
  { name: 'loadBalancerTypes.get', description: 'Get a load balancer type by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'Load balancer type object' },

  // --- Firewalls ---
  { name: 'firewalls.list', description: 'List all firewalls', operationType: 'read',
    params: [...STD_LIST_PARAMS], returns: 'List of firewall objects' },
  { name: 'firewalls.get', description: 'Get firewall by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'Firewall object' },
  { name: 'firewalls.create', description: 'Create a firewall with rules', operationType: 'write',
    params: [
      { name: 'name', type: 'string', required: true, description: 'Firewall name' },
      { name: 'rules', type: 'array', required: false, description: 'Firewall rules: [{ direction, protocol, port, source_ips, destination_ips, description }]' },
      { name: 'apply_to', type: 'array', required: false, description: 'Resources to apply to: [{ type: "server", server: { id } }] or [{ type: "label_selector", label_selector: { selector } }]' },
      LABELS_PARAM,
    ], returns: 'Firewall object with actions' },
  { name: 'firewalls.update', description: 'Update firewall name and labels', operationType: 'write',
    params: [ID_PARAM, { name: 'name', type: 'string', required: false, description: 'New name' }, LABELS_PARAM],
    returns: 'Updated firewall object' },
  { name: 'firewalls.delete', description: 'Delete a firewall', operationType: 'delete',
    params: [ID_PARAM], returns: 'Empty response' },
  { name: 'firewalls.setRules', description: 'Replace all firewall rules', operationType: 'write',
    params: [ID_PARAM, { name: 'rules', type: 'array', required: true, description: 'New rules array' }],
    returns: 'Actions array' },
  { name: 'firewalls.applyToResources', description: 'Apply firewall to servers/label selectors', operationType: 'write',
    params: [ID_PARAM, { name: 'apply_to', type: 'array', required: true, description: 'Resources to apply to' }],
    returns: 'Actions array' },
  { name: 'firewalls.removeFromResources', description: 'Remove firewall from resources', operationType: 'write',
    params: [ID_PARAM, { name: 'remove_from', type: 'array', required: true, description: 'Resources to remove from' }],
    returns: 'Actions array' },
];

// ===== STORAGE =====
const storageMethods: ConnectorMethod[] = [
  { name: 'volumes.list', description: 'List all volumes', operationType: 'read',
    params: [NAME_FILTER, LABEL_SELECTOR, { name: 'status', type: 'string', required: false, description: 'Filter by status: available, creating' }, SORT_PARAM, ...LIST_PARAMS],
    returns: 'List of volume objects' },
  { name: 'volumes.get', description: 'Get volume by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'Volume object' },
  { name: 'volumes.create', description: 'Create a new volume', operationType: 'write',
    params: [
      { name: 'name', type: 'string', required: true, description: 'Volume name' },
      { name: 'size', type: 'number', required: true, description: 'Size in GB (minimum 10)' },
      { name: 'location', type: 'string', required: false, description: 'Location name — required if no server' },
      { name: 'server', type: 'number', required: false, description: 'Server ID to attach immediately' },
      { name: 'format', type: 'string', required: false, description: 'Filesystem format: ext4 or xfs' },
      { name: 'automount', type: 'boolean', required: false, description: 'Auto-mount when attached (default: false)' },
      LABELS_PARAM,
    ], returns: 'Volume object with action',
    example: { params: { name: 'data-vol', size: 50, location: 'fsn1' }, description: 'Create a 50GB volume' } },
  { name: 'volumes.update', description: 'Update volume name and labels', operationType: 'write',
    params: [ID_PARAM, { name: 'name', type: 'string', required: false, description: 'New name' }, LABELS_PARAM],
    returns: 'Updated volume object' },
  { name: 'volumes.delete', description: 'Delete a volume (irreversible)', operationType: 'delete',
    params: [ID_PARAM], returns: 'Empty response' },
  { name: 'volumes.attach', description: 'Attach volume to a server', operationType: 'write',
    params: [ID_PARAM,
      { name: 'server', type: 'number', required: true, description: 'Server ID to attach to' },
      { name: 'automount', type: 'boolean', required: false, description: 'Auto-mount the volume' },
    ], returns: 'Action object' },
  { name: 'volumes.detach', description: 'Detach volume from server', operationType: 'write',
    params: [ID_PARAM], returns: 'Action object' },
  { name: 'volumes.resize', description: 'Resize volume (can only increase)', operationType: 'write',
    params: [ID_PARAM, { name: 'size', type: 'number', required: true, description: 'New size in GB (must be larger than current)' }],
    returns: 'Action object' },
  { name: 'volumes.changeProtection', description: 'Enable/disable delete protection on volume', operationType: 'write',
    params: [ID_PARAM, { name: 'delete', type: 'boolean', required: false, description: 'Enable/disable delete protection' }],
    returns: 'Action object' },
];

// ===== SECURITY =====
const securityMethods: ConnectorMethod[] = [
  // --- SSH Keys ---
  { name: 'sshKeys.list', description: 'List all SSH keys', operationType: 'read',
    params: [NAME_FILTER, LABEL_SELECTOR, { name: 'fingerprint', type: 'string', required: false, description: 'Filter by fingerprint' }, SORT_PARAM, ...LIST_PARAMS],
    returns: 'List of SSH key objects' },
  { name: 'sshKeys.get', description: 'Get SSH key by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'SSH key object' },
  { name: 'sshKeys.create', description: 'Add a new SSH key', operationType: 'write',
    params: [
      { name: 'name', type: 'string', required: true, description: 'SSH key name' },
      { name: 'public_key', type: 'string', required: true, description: 'SSH public key (OpenSSH format)' },
      LABELS_PARAM,
    ], returns: 'SSH key object' },
  { name: 'sshKeys.update', description: 'Update SSH key name and labels', operationType: 'write',
    params: [ID_PARAM, { name: 'name', type: 'string', required: false, description: 'New name' }, LABELS_PARAM],
    returns: 'Updated SSH key object' },
  { name: 'sshKeys.delete', description: 'Delete an SSH key', operationType: 'delete',
    params: [ID_PARAM], returns: 'Empty response' },

  // --- Certificates ---
  { name: 'certificates.list', description: 'List all certificates', operationType: 'read',
    params: [NAME_FILTER, LABEL_SELECTOR, { name: 'type', type: 'string', required: false, description: 'Filter by type: uploaded, managed' }, SORT_PARAM, ...LIST_PARAMS],
    returns: 'List of certificate objects' },
  { name: 'certificates.get', description: 'Get certificate by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'Certificate object' },
  { name: 'certificates.create', description: 'Create/upload a certificate', operationType: 'write',
    params: [
      { name: 'name', type: 'string', required: true, description: 'Certificate name' },
      { name: 'type', type: 'string', required: false, description: 'uploaded (default) or managed', enum: ['uploaded', 'managed'] },
      { name: 'certificate', type: 'string', required: false, description: 'PEM-encoded certificate (for uploaded)' },
      { name: 'private_key', type: 'string', required: false, description: 'PEM-encoded private key (for uploaded)' },
      { name: 'domain_names', type: 'array', required: false, description: "Domain names (for managed — Let's Encrypt)" },
      LABELS_PARAM,
    ], returns: 'Certificate object' },
  { name: 'certificates.update', description: 'Update certificate name and labels', operationType: 'write',
    params: [ID_PARAM, { name: 'name', type: 'string', required: false, description: 'New name' }, LABELS_PARAM],
    returns: 'Updated certificate object' },
  { name: 'certificates.delete', description: 'Delete a certificate', operationType: 'delete',
    params: [ID_PARAM], returns: 'Empty response' },
  { name: 'certificates.retry', description: 'Retry issuance of a managed certificate', operationType: 'write',
    params: [ID_PARAM], returns: 'Action object' },
];

// ===== INFRASTRUCTURE (read-only) =====
const infrastructureMethods: ConnectorMethod[] = [
  { name: 'datacenters.list', description: 'List all datacenters', operationType: 'read',
    params: [NAME_FILTER, SORT_PARAM, ...LIST_PARAMS], returns: 'List of datacenter objects' },
  { name: 'datacenters.get', description: 'Get datacenter by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'Datacenter object' },
  { name: 'locations.list', description: 'List all locations', operationType: 'read',
    params: [NAME_FILTER, SORT_PARAM, ...LIST_PARAMS], returns: 'List of location objects' },
  { name: 'locations.get', description: 'Get location by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'Location object' },
  { name: 'pricing.get', description: 'Get pricing for all resource types', operationType: 'read',
    params: [], returns: 'Pricing object with prices for servers, images, volumes, floating IPs, load balancers, traffic' },
  { name: 'actions.list', description: 'List all actions', operationType: 'read',
    params: [
      { name: 'id', type: 'number', required: false, description: 'Filter by action ID' },
      { name: 'status', type: 'string', required: false, description: 'Filter by status: running, success, error' },
      SORT_PARAM, ...LIST_PARAMS,
    ], returns: 'List of action objects' },
  { name: 'actions.get', description: 'Get action by ID', operationType: 'read',
    params: [ID_PARAM], returns: 'Action object with status, progress, error' },
];

// ---------------------------------------------------------------------------
// All methods & group registry
// ---------------------------------------------------------------------------

const allMethods: ConnectorMethod[] = [
  ...computeMethods,
  ...networkingMethods,
  ...storageMethods,
  ...securityMethods,
  ...infrastructureMethods,
];

const METHOD_GROUPS: Map<string, { description: string; methods: ConnectorMethod[] }> = new Map([
  ['compute', { description: 'Servers, server types, images, ISOs, placement groups', methods: computeMethods }],
  ['networking', { description: 'Networks, floating IPs, primary IPs, load balancers, LB types, firewalls', methods: networkingMethods }],
  ['storage', { description: 'Volumes — block storage', methods: storageMethods }],
  ['security', { description: 'SSH keys, TLS certificates', methods: securityMethods }],
  ['infrastructure', { description: 'Datacenters, locations, pricing, actions (read-only)', methods: infrastructureMethods }],
]);

const HELP_GROUPS: ServiceHelpGroup[] = Array.from(METHOD_GROUPS.entries()).map(
  ([name, { description, methods: m }]) => ({ name, description, methodCount: m.length }),
);

// ---------------------------------------------------------------------------
// Human-readable request descriptions
// ---------------------------------------------------------------------------

function describeHetznerRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case 'servers.create': return `Create server "${params.name || ''}"${params.server_type ? ` (${params.server_type})` : ''}`;
    case 'servers.delete': return `Delete server ${params.id || '(unknown)'}`;
    case 'servers.poweron': return `Power on server ${params.id || '(unknown)'}`;
    case 'servers.poweroff': return `Power off server ${params.id || '(unknown)'}`;
    case 'servers.reboot': return `Reboot server ${params.id || '(unknown)'}`;
    case 'servers.reset': return `Reset server ${params.id || '(unknown)'}`;
    case 'servers.shutdown': return `Shutdown server ${params.id || '(unknown)'}`;
    case 'servers.resetPassword': return `Reset password for server ${params.id || '(unknown)'}`;
    case 'servers.rebuild': return `Rebuild server ${params.id || '(unknown)'} with image ${params.image || '(unknown)'}`;
    case 'servers.changeType': return `Change server ${params.id || '(unknown)'} to type ${params.server_type || '(unknown)'}`;
    case 'servers.createImage': return `Create ${params.type || 'snapshot'} of server ${params.id || '(unknown)'}`;
    case 'servers.enableRescue': return `Enable rescue mode on server ${params.id || '(unknown)'}`;
    case 'servers.disableRescue': return `Disable rescue mode on server ${params.id || '(unknown)'}`;
    case 'servers.enableBackup': return `Enable backups for server ${params.id || '(unknown)'}`;
    case 'servers.disableBackup': return `Disable backups for server ${params.id || '(unknown)'}`;
    case 'servers.attachIso': return `Attach ISO ${params.iso || '(unknown)'} to server ${params.id || '(unknown)'}`;
    case 'servers.detachIso': return `Detach ISO from server ${params.id || '(unknown)'}`;
    case 'servers.attachToNetwork': return `Attach server ${params.id || '(unknown)'} to network ${params.network || '(unknown)'}`;
    case 'servers.detachFromNetwork': return `Detach server ${params.id || '(unknown)'} from network ${params.network || '(unknown)'}`;
    case 'servers.changeProtection': return `Change protection on server ${params.id || '(unknown)'}`;
    case 'volumes.create': return `Create ${params.size || '?'}GB volume "${params.name || ''}"`;
    case 'volumes.delete': return `Delete volume ${params.id || '(unknown)'}`;
    case 'volumes.attach': return `Attach volume ${params.id || '(unknown)'} to server ${params.server || '(unknown)'}`;
    case 'volumes.detach': return `Detach volume ${params.id || '(unknown)'}`;
    case 'volumes.resize': return `Resize volume ${params.id || '(unknown)'} to ${params.size || '?'}GB`;
    case 'networks.create': return `Create network "${params.name || ''}" (${params.ip_range || ''})`;
    case 'networks.delete': return `Delete network ${params.id || '(unknown)'}`;
    case 'loadBalancers.create': return `Create load balancer "${params.name || ''}"`;
    case 'loadBalancers.delete': return `Delete load balancer ${params.id || '(unknown)'}`;
    case 'firewalls.create': return `Create firewall "${params.name || ''}"`;
    case 'firewalls.delete': return `Delete firewall ${params.id || '(unknown)'}`;
    case 'firewalls.setRules': return `Set rules on firewall ${params.id || '(unknown)'}`;
    case 'floatingIps.create': return `Create floating IP (${params.type || 'ipv4'}) in ${params.home_location || '(unknown)'}`;
    case 'floatingIps.delete': return `Delete floating IP ${params.id || '(unknown)'}`;
    case 'floatingIps.assign': return `Assign floating IP ${params.id || '(unknown)'} to server ${params.server || '(unknown)'}`;
    case 'floatingIps.unassign': return `Unassign floating IP ${params.id || '(unknown)'}`;
    case 'primaryIps.create': return `Create primary IP (${params.type || 'ipv4'})`;
    case 'primaryIps.delete': return `Delete primary IP ${params.id || '(unknown)'}`;
    case 'sshKeys.create': return `Add SSH key "${params.name || ''}"`;
    case 'sshKeys.delete': return `Delete SSH key ${params.id || '(unknown)'}`;
    case 'certificates.create': return `Create ${params.type || 'uploaded'} certificate "${params.name || ''}"`;
    case 'certificates.delete': return `Delete certificate ${params.id || '(unknown)'}`;
    case 'placementGroups.create': return `Create placement group "${params.name || ''}"`;
    case 'placementGroups.delete': return `Delete placement group ${params.id || '(unknown)'}`;
    default: {
      const parts = method.split('.');
      const action = parts[parts.length - 1];
      const resource = parts.slice(0, -1).join('.');
      if (params.id) return `${action} ${resource} ${params.id}`;
      return `${action} ${resource}`;
    }
  }
}

// ---------------------------------------------------------------------------
// Resource type extraction
// ---------------------------------------------------------------------------

function getResourceType(method: string): string | undefined {
  const [resource] = method.split('.');
  const mapping: Record<string, string> = {
    servers: 'server', serverTypes: 'server_type', images: 'image', isos: 'iso',
    placementGroups: 'placement_group', networks: 'network', floatingIps: 'floating_ip',
    primaryIps: 'primary_ip', loadBalancers: 'load_balancer', loadBalancerTypes: 'load_balancer_type',
    firewalls: 'firewall', volumes: 'volume', sshKeys: 'ssh_key', certificates: 'certificate',
    datacenters: 'datacenter', locations: 'location', pricing: 'pricing', actions: 'action',
  };
  return mapping[resource] || resource;
}

// ---------------------------------------------------------------------------
// API path mapping
// ---------------------------------------------------------------------------

// Map camelCase resource names to API URL segments
const RESOURCE_PATHS: Record<string, string> = {
  servers: 'servers', serverTypes: 'server_types', images: 'images', isos: 'isos',
  placementGroups: 'placement_groups', networks: 'networks', floatingIps: 'floating_ips',
  primaryIps: 'primary_ips', loadBalancers: 'load_balancers', loadBalancerTypes: 'load_balancer_types',
  firewalls: 'firewalls', volumes: 'volumes', sshKeys: 'ssh_keys', certificates: 'certificates',
  datacenters: 'datacenters', locations: 'locations', actions: 'actions',
};

// Map action names to Hetzner API action slugs
const ACTION_SLUGS: Record<string, string> = {
  poweron: 'poweron', poweroff: 'poweroff', reboot: 'reboot', reset: 'reset',
  shutdown: 'shutdown', resetPassword: 'reset_password', createImage: 'create_image',
  enableRescue: 'enable_rescue', disableRescue: 'disable_rescue', rebuild: 'rebuild',
  changeType: 'change_type', attachIso: 'attach_iso', detachIso: 'detach_iso',
  enableBackup: 'enable_backup', disableBackup: 'disable_backup',
  changeDnsPtr: 'change_dns_ptr', changeProtection: 'change_protection',
  requestConsole: 'request_console', attachToNetwork: 'attach_to_network',
  detachFromNetwork: 'detach_from_network', changeAliasIps: 'change_alias_ips',
  addToPlacementGroup: 'add_to_placement_group', removeFromPlacementGroup: 'remove_from_placement_group',
  changeIpRange: 'change_ip_range', addSubnet: 'add_subnet', deleteSubnet: 'delete_subnet',
  addRoute: 'add_route', deleteRoute: 'delete_route',
  assign: 'assign', unassign: 'unassign',
  attach: 'attach', detach: 'detach', resize: 'resize',
  addTarget: 'add_target', removeTarget: 'remove_target',
  addService: 'add_service', updateService: 'update_service', deleteService: 'delete_service',
  changeAlgorithm: 'change_algorithm', attachToNetwork_lb: 'attach_to_network',
  detachFromNetwork_lb: 'detach_from_network',
  enablePublicInterface: 'enable_public_interface', disablePublicInterface: 'disable_public_interface',
  setRules: 'set_rules', applyToResources: 'apply_to_resources', removeFromResources: 'remove_from_resources',
  retry: 'retry',
};

// Methods that are simple CRUD (not action-based)
const CRUD_ACTIONS = new Set(['list', 'get', 'create', 'update', 'delete', 'getMetrics']);

// ---------------------------------------------------------------------------
// Execute — generic dispatcher
// ---------------------------------------------------------------------------

async function executeHetzner(
  method: string,
  params: Record<string, unknown>,
  credentials: OAuthCredentials,
): Promise<unknown> {
  const parts = method.split('.');
  const resource = parts[0];
  const action = parts[1];
  const { id, ...rest } = params;

  const basePath = RESOURCE_PATHS[resource];
  if (!basePath) throw new Error(`Unknown Hetzner resource: ${resource}`);

  // Special case: pricing.get
  if (method === 'pricing.get') {
    return hetznerFetch('/pricing', credentials);
  }

  // Special case: metrics
  if (action === 'getMetrics') {
    const { type, start, end, step, ...metricsRest } = rest;
    const query = buildQuery({ type, start, end, step, ...metricsRest }, ['type', 'start', 'end', 'step']);
    return hetznerFetch(`/${basePath}/${id}/metrics${query}`, credentials);
  }

  if (CRUD_ACTIONS.has(action)) {
    switch (action) {
      case 'list': {
        const query = buildQuery(rest, LIST_QUERY_KEYS);
        return hetznerFetch(`/${basePath}${query}`, credentials);
      }
      case 'get':
        return hetznerFetch(`/${basePath}/${id}`, credentials);
      case 'create':
        return hetznerFetch(`/${basePath}`, credentials, {
          method: 'POST',
          body: JSON.stringify(rest),
        });
      case 'update':
        return hetznerFetch(`/${basePath}/${id}`, credentials, {
          method: 'PUT',
          body: JSON.stringify(rest),
        });
      case 'delete':
        return hetznerFetch(`/${basePath}/${id}`, credentials, {
          method: 'DELETE',
        });
    }
  }

  // Action-based endpoints: POST /{resource}/{id}/actions/{action_slug}
  const slug = ACTION_SLUGS[action];
  if (!slug) throw new Error(`Unknown Hetzner action: ${method}`);

  const body = Object.keys(rest).length > 0 ? JSON.stringify(rest) : undefined;
  return hetznerFetch(`/${basePath}/${id}/actions/${slug}`, credentials, {
    method: 'POST',
    ...(body ? { body } : {}),
  });
}

// ---------------------------------------------------------------------------
// Connector export
// ---------------------------------------------------------------------------

export const hetznerConnector: Connector = {
  service: 'hetzner',
  name: 'Hetzner Cloud',
  methods: allMethods,

  extractPermMetadata(
    method: string,
    params: Record<string, unknown>,
    accountId: string,
  ): PermissionMetadata {
    const methodDef = allMethods.find((m) => m.name === method);
    if (!methodDef) throw new Error(`Unknown Hetzner method: ${method}`);
    return {
      service: 'hetzner',
      accountId,
      method,
      operationType: methodDef.operationType,
      resourceType: getResourceType(method),
      description: describeHetznerRequest(method, params),
    };
  },

  async execute(
    method: string,
    params: Record<string, unknown>,
    credentials: OAuthCredentials,
  ): Promise<unknown> {
    return executeHetzner(method, params, credentials);
  },

  help(method?: string): ServiceHelp {
    // No argument: return group summaries (two-level help)
    if (!method) {
      return {
        service: 'hetzner',
        name: 'Hetzner Cloud',
        summary: 'Cloud infrastructure — servers, networks, load balancers, volumes, firewalls, IPs, and more',
        methods: [],
        groups: HELP_GROUPS,
      };
    }

    // If argument matches a group name, return all methods in that group
    const group = METHOD_GROUPS.get(method);
    if (group) {
      return { service: 'hetzner', name: 'Hetzner Cloud', methods: group.methods };
    }

    // Otherwise, return single method help
    const m = allMethods.find((md) => md.name === method);
    return { service: 'hetzner', name: 'Hetzner Cloud', methods: m ? [m] : [] };
  },
};
