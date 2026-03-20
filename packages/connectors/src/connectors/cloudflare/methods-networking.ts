import type { ConnectorMethod } from '@keepai/proto';
import { ZONE_ID_PARAM, ACCOUNT_ID_PARAM, LIST_PARAMS } from './params.js';

// ===== NETWORKING =====
export const networkingMethods: ConnectorMethod[] = [
  // Load Balancers
  {
    name: 'loadBalancers.create',
    description: 'Create a new load balancer.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'name', type: 'string', required: true, description: 'Load balancer name' }],
    returns: 'Load balancer object',
  },
  {
    name: 'loadBalancers.update',
    description: 'Update a configured load balancer.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'load_balancer_id', type: 'string', required: true, description: 'Load balancer ID' }],
    returns: 'Updated load balancer object',
  },
  {
    name: 'loadBalancers.list',
    description: 'List configured load balancers.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of load balancers',
  },
  {
    name: 'loadBalancers.delete',
    description: 'Delete a configured load balancer.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'load_balancer_id', type: 'string', required: true, description: 'Load balancer ID' }],
    returns: 'Deleted load balancer confirmation',
  },
  {
    name: 'loadBalancers.edit',
    description: 'Apply changes to an existing load balancer.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'load_balancer_id', type: 'string', required: true, description: 'Load balancer ID' }],
    returns: 'Updated load balancer object',
  },
  {
    name: 'loadBalancers.get',
    description: 'Fetch a single configured load balancer.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'load_balancer_id', type: 'string', required: true, description: 'Load balancer ID' }],
    returns: 'Load balancer object',
  },

  // Load Balancer Pools
  {
    name: 'loadBalancers.pools.create',
    description: 'Create a new pool.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'name', type: 'string', required: true, description: 'Pool name' }],
    returns: 'Pool object',
  },
  {
    name: 'loadBalancers.pools.update',
    description: 'Modify a configured pool.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'pool_id', type: 'string', required: true, description: 'Pool ID' }],
    returns: 'Updated pool object',
  },
  {
    name: 'loadBalancers.pools.list',
    description: 'List configured pools.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of pools',
  },
  {
    name: 'loadBalancers.pools.delete',
    description: 'Delete a configured pool.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'pool_id', type: 'string', required: true, description: 'Pool ID' }],
    returns: 'Deleted pool confirmation',
  },
  {
    name: 'loadBalancers.pools.edit',
    description: 'Apply changes to an existing pool.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'pool_id', type: 'string', required: true, description: 'Pool ID' }],
    returns: 'Updated pool object',
  },
  {
    name: 'loadBalancers.pools.get',
    description: 'Fetch a single configured pool.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'pool_id', type: 'string', required: true, description: 'Pool ID' }],
    returns: 'Pool object',
  },

  // Load Balancer Monitors
  {
    name: 'loadBalancers.monitors.create',
    description: 'Create a configured monitor.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Monitor object',
  },
  {
    name: 'loadBalancers.monitors.update',
    description: 'Modify a configured monitor.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'monitor_id', type: 'string', required: true, description: 'Monitor ID' }],
    returns: 'Updated monitor object',
  },
  {
    name: 'loadBalancers.monitors.list',
    description: 'List configured monitors for an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of monitors',
  },
  {
    name: 'loadBalancers.monitors.delete',
    description: 'Delete a configured monitor.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'monitor_id', type: 'string', required: true, description: 'Monitor ID' }],
    returns: 'Deleted monitor confirmation',
  },
  {
    name: 'loadBalancers.monitors.edit',
    description: 'Apply changes to an existing monitor.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'monitor_id', type: 'string', required: true, description: 'Monitor ID' }],
    returns: 'Updated monitor object',
  },
  {
    name: 'loadBalancers.monitors.get',
    description: 'List a single configured monitor for an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'monitor_id', type: 'string', required: true, description: 'Monitor ID' }],
    returns: 'Monitor object',
  },

  // Load Balancer Regions
  {
    name: 'loadBalancers.regions.list',
    description: 'List all region mappings.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM],
    returns: 'List of region mappings',
  },
  {
    name: 'loadBalancers.regions.get',
    description: 'Get a single region mapping.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'region_id', type: 'string', required: true, description: 'Region ID' }],
    returns: 'Region mapping object',
  },

  // Load Balancer Searches
  {
    name: 'loadBalancers.searches.list',
    description: 'Search for Load Balancing resources.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'Search results',
  },

  // Load Balancer Previews
  {
    name: 'loadBalancers.previews.get',
    description: 'Get the result of a previous preview operation.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'preview_id', type: 'string', required: true, description: 'Preview ID' }],
    returns: 'Preview result',
  },

  // Spectrum Apps
  {
    name: 'spectrum.apps.create',
    description: 'Creates a new Spectrum application from a configuration using a name for the origin.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Spectrum app object',
  },
  {
    name: 'spectrum.apps.update',
    description: 'Updates a previously existing application\'s configuration.',
    operationType: 'write',
    params: [ZONE_ID_PARAM, { name: 'app_id', type: 'string', required: true, description: 'Spectrum app ID' }],
    returns: 'Updated Spectrum app object',
  },
  {
    name: 'spectrum.apps.list',
    description: 'Retrieves a list of currently existing Spectrum applications inside a zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of Spectrum apps',
  },
  {
    name: 'spectrum.apps.delete',
    description: 'Deletes a previously existing application.',
    operationType: 'delete',
    params: [ZONE_ID_PARAM, { name: 'app_id', type: 'string', required: true, description: 'Spectrum app ID' }],
    returns: 'Deleted Spectrum app confirmation',
  },
  {
    name: 'spectrum.apps.get',
    description: 'Gets the application configuration of a specific application inside a zone.',
    operationType: 'read',
    params: [ZONE_ID_PARAM, { name: 'app_id', type: 'string', required: true, description: 'Spectrum app ID' }],
    returns: 'Spectrum app object',
  },

  // Magic Transit GRE Tunnels
  {
    name: 'magicTransit.greTunnels.create',
    description: 'Creates a new GRE tunnel.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'GRE tunnel object',
  },
  {
    name: 'magicTransit.greTunnels.update',
    description: 'Updates a specific GRE tunnel.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'tunnel_identifier', type: 'string', required: true, description: 'GRE tunnel ID' }],
    returns: 'Updated GRE tunnel object',
  },
  {
    name: 'magicTransit.greTunnels.list',
    description: 'Lists GRE tunnels associated with an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of GRE tunnels',
  },
  {
    name: 'magicTransit.greTunnels.delete',
    description: 'Disables and removes a specific static GRE tunnel.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'tunnel_identifier', type: 'string', required: true, description: 'GRE tunnel ID' }],
    returns: 'Deleted GRE tunnel confirmation',
  },
  {
    name: 'magicTransit.greTunnels.get',
    description: 'Lists information for a specific GRE tunnel.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'tunnel_identifier', type: 'string', required: true, description: 'GRE tunnel ID' }],
    returns: 'GRE tunnel object',
  },

  // Magic Transit IPsec Tunnels
  {
    name: 'magicTransit.ipsecTunnels.create',
    description: 'Creates a new IPsec tunnel associated with an account.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'IPsec tunnel object',
  },
  {
    name: 'magicTransit.ipsecTunnels.update',
    description: 'Updates a specific IPsec tunnel associated with an account.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'tunnel_identifier', type: 'string', required: true, description: 'IPsec tunnel ID' }],
    returns: 'Updated IPsec tunnel object',
  },
  {
    name: 'magicTransit.ipsecTunnels.list',
    description: 'Lists IPsec tunnels associated with an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of IPsec tunnels',
  },
  {
    name: 'magicTransit.ipsecTunnels.delete',
    description: 'Disables and removes a specific static IPsec Tunnel.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'tunnel_identifier', type: 'string', required: true, description: 'IPsec tunnel ID' }],
    returns: 'Deleted IPsec tunnel confirmation',
  },
  {
    name: 'magicTransit.ipsecTunnels.get',
    description: 'Lists details for a specific IPsec tunnel.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'tunnel_identifier', type: 'string', required: true, description: 'IPsec tunnel ID' }],
    returns: 'IPsec tunnel object',
  },
  {
    name: 'magicTransit.ipsecTunnels.pskGenerate',
    description: 'Generates a Pre Shared Key for a specific IPsec tunnel.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'tunnel_identifier', type: 'string', required: true, description: 'IPsec tunnel ID' }],
    returns: 'Pre Shared Key',
  },

  // Magic Transit Routes
  {
    name: 'magicTransit.routes.create',
    description: 'Creates a new Magic static route.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Route object',
  },
  {
    name: 'magicTransit.routes.update',
    description: 'Update a specific Magic static route.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'route_identifier', type: 'string', required: true, description: 'Route ID' }],
    returns: 'Updated route object',
  },
  {
    name: 'magicTransit.routes.list',
    description: 'List all Magic static routes.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of routes',
  },
  {
    name: 'magicTransit.routes.delete',
    description: 'Disable and remove a specific Magic static route.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'route_identifier', type: 'string', required: true, description: 'Route ID' }],
    returns: 'Deleted route confirmation',
  },
  {
    name: 'magicTransit.routes.get',
    description: 'Get a specific Magic static route.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'route_identifier', type: 'string', required: true, description: 'Route ID' }],
    returns: 'Route object',
  },

  // Magic Transit Sites
  {
    name: 'magicTransit.sites.create',
    description: 'Creates a new Site',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Site object',
  },
  {
    name: 'magicTransit.sites.update',
    description: 'Update a specific Site.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'site_id', type: 'string', required: true, description: 'Site ID' }],
    returns: 'Updated site object',
  },
  {
    name: 'magicTransit.sites.list',
    description: 'Lists Sites associated with an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of sites',
  },
  {
    name: 'magicTransit.sites.delete',
    description: 'Remove a specific Site.',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'site_id', type: 'string', required: true, description: 'Site ID' }],
    returns: 'Deleted site confirmation',
  },
  {
    name: 'magicTransit.sites.edit',
    description: 'Patch a specific Site.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'site_id', type: 'string', required: true, description: 'Site ID' }],
    returns: 'Updated site object',
  },
  {
    name: 'magicTransit.sites.get',
    description: 'Get a specific Site.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'site_id', type: 'string', required: true, description: 'Site ID' }],
    returns: 'Site object',
  },

  // Magic Transit Connectors
  {
    name: 'magicTransit.connectors.create',
    description: 'Add a connector to your account',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Connector object',
  },
  {
    name: 'magicTransit.connectors.update',
    description: 'Replace Connector',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'connector_id', type: 'string', required: true, description: 'Connector ID' }],
    returns: 'Updated connector object',
  },
  {
    name: 'magicTransit.connectors.list',
    description: 'List Connectors',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of connectors',
  },
  {
    name: 'magicTransit.connectors.delete',
    description: 'Remove a connector from your account',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'connector_id', type: 'string', required: true, description: 'Connector ID' }],
    returns: 'Deleted connector confirmation',
  },
  {
    name: 'magicTransit.connectors.edit',
    description: 'Edit Connector to update specific properties',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'connector_id', type: 'string', required: true, description: 'Connector ID' }],
    returns: 'Updated connector object',
  },
  {
    name: 'magicTransit.connectors.get',
    description: 'Fetch Connector',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'connector_id', type: 'string', required: true, description: 'Connector ID' }],
    returns: 'Connector object',
  },

  // Magic Transit CF Interconnects
  {
    name: 'magicTransit.cfInterconnects.update',
    description: 'Updates a specific interconnect associated with an account.',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM, { name: 'tunnel_identifier', type: 'string', required: true, description: 'Interconnect ID' }],
    returns: 'Updated interconnect object',
  },
  {
    name: 'magicTransit.cfInterconnects.list',
    description: 'Lists interconnects associated with an account.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, ...LIST_PARAMS],
    returns: 'List of interconnects',
  },
  {
    name: 'magicTransit.cfInterconnects.get',
    description: 'Lists details for a specific interconnect.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM, { name: 'tunnel_identifier', type: 'string', required: true, description: 'Interconnect ID' }],
    returns: 'Interconnect object',
  },

  // Argo
  {
    name: 'argo.smartRouting.edit',
    description: 'Configures the value of the Argo Smart Routing enablement setting.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated Argo Smart Routing setting',
  },
  {
    name: 'argo.smartRouting.get',
    description: 'Retrieves the value of Argo Smart Routing enablement setting.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'Argo Smart Routing setting',
  },
  {
    name: 'argo.tieredCaching.edit',
    description: 'Updates tiered caching setting.',
    operationType: 'write',
    params: [ZONE_ID_PARAM],
    returns: 'Updated tiered caching setting',
  },
  {
    name: 'argo.tieredCaching.get',
    description: 'Get tiered caching setting.',
    operationType: 'read',
    params: [ZONE_ID_PARAM],
    returns: 'Tiered caching setting',
  },

  // IPs
  {
    name: 'ips.list',
    description: 'Get IPs used on the Cloudflare/JD Cloud network.',
    operationType: 'read',
    params: [],
    returns: 'List of Cloudflare IPs',
  },

  // Custom Nameservers
  {
    name: 'customNameservers.create',
    description: 'Add Account Custom Nameserver',
    operationType: 'write',
    params: [ACCOUNT_ID_PARAM],
    returns: 'Custom nameserver object',
  },
  {
    name: 'customNameservers.delete',
    description: 'Delete Account Custom Nameserver',
    operationType: 'delete',
    params: [ACCOUNT_ID_PARAM, { name: 'custom_ns_id', type: 'string', required: true, description: 'Custom nameserver ID' }],
    returns: 'Deleted custom nameserver confirmation',
  },
  {
    name: 'customNameservers.get',
    description: 'List an account\'s custom nameservers.',
    operationType: 'read',
    params: [ACCOUNT_ID_PARAM],
    returns: 'List of custom nameservers',
  },
];
