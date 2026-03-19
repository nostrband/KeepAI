# Hetzner Methods — Networking

Sub-spec of [hetzner-connector.md](./hetzner-connector.md). Covers networks, floating IPs, primary IPs, load balancers, load balancer types, and firewalls.

## Networks (11 methods)

Private networks with subnets and routes for server-to-server communication.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `networks.list` | read | GET | `/networks` | List all networks |
| `networks.get` | read | GET | `/networks/{id}` | Get network by ID |
| `networks.create` | write | POST | `/networks` | Create a network |
| `networks.update` | write | PUT | `/networks/{id}` | Update name and labels |
| `networks.delete` | delete | DELETE | `/networks/{id}` | Delete a network |
| `networks.changeIpRange` | write | POST | `/networks/{id}/actions/change_ip_range` | Change the IP range |
| `networks.addSubnet` | write | POST | `/networks/{id}/actions/add_subnet` | Add a subnet |
| `networks.deleteSubnet` | write | POST | `/networks/{id}/actions/delete_subnet` | Delete a subnet |
| `networks.addRoute` | write | POST | `/networks/{id}/actions/add_route` | Add a route |
| `networks.deleteRoute` | write | POST | `/networks/{id}/actions/delete_route` | Delete a route |
| `networks.changeProtection` | write | POST | `/networks/{id}/actions/change_protection` | Enable/disable delete protection |

### Key Params — networks.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Network name |
| `ip_range` | string | yes | IP range in CIDR notation (e.g., `10.0.0.0/16`) |
| `subnets` | array | no | Subnets to create: `[{ type, ip_range, network_zone }]` |
| `routes` | array | no | Routes to create: `[{ destination, gateway }]` |
| `labels` | object | no | Key-value labels |
| `expose_routes_to_vswitch` | boolean | no | Expose routes to connected vSwitches |

### Key Params — networks.addSubnet

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | yes | Network ID |
| `type` | string | yes | Subnet type: `cloud`, `server`, `vswitch` |
| `ip_range` | string | yes | IP range in CIDR notation |
| `network_zone` | string | yes | Network zone: `eu-central`, `us-east`, `us-west`, `ap-southeast` |
| `vswitch_id` | number | no | vSwitch ID (only for type `vswitch`) |

### Key Params — networks.addRoute

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | yes | Network ID |
| `destination` | string | yes | Destination in CIDR notation |
| `gateway` | string | yes | Gateway IP |

---

## Floating IPs (9 methods)

IPv4/IPv6 addresses that can be assigned to any server in a location.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `floatingIps.list` | read | GET | `/floating_ips` | List all floating IPs |
| `floatingIps.get` | read | GET | `/floating_ips/{id}` | Get floating IP by ID |
| `floatingIps.create` | write | POST | `/floating_ips` | Create a floating IP |
| `floatingIps.update` | write | PUT | `/floating_ips/{id}` | Update name, description, labels |
| `floatingIps.delete` | delete | DELETE | `/floating_ips/{id}` | Delete a floating IP |
| `floatingIps.assign` | write | POST | `/floating_ips/{id}/actions/assign` | Assign to a server |
| `floatingIps.unassign` | write | POST | `/floating_ips/{id}/actions/unassign` | Unassign from server |
| `floatingIps.changeDnsPtr` | write | POST | `/floating_ips/{id}/actions/change_dns_ptr` | Change reverse DNS |
| `floatingIps.changeProtection` | write | POST | `/floating_ips/{id}/actions/change_protection` | Enable/disable delete protection |

### Key Params — floatingIps.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | IP type: `ipv4` or `ipv6` |
| `home_location` | string | yes | Home location name (e.g., `fsn1`) |
| `server` | number | no | Server ID to assign immediately |
| `description` | string | no | Description |
| `name` | string | no | Name |
| `labels` | object | no | Key-value labels |

### Key Params — floatingIps.assign

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | yes | Floating IP ID |
| `server` | number | yes | Server ID to assign to |

---

## Primary IPs (9 methods)

Primary IPv4/IPv6 addresses — attached to server network interfaces, persist independently.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `primaryIps.list` | read | GET | `/primary_ips` | List all primary IPs |
| `primaryIps.get` | read | GET | `/primary_ips/{id}` | Get primary IP by ID |
| `primaryIps.create` | write | POST | `/primary_ips` | Create a primary IP |
| `primaryIps.update` | write | PUT | `/primary_ips/{id}` | Update name, labels, auto_delete |
| `primaryIps.delete` | delete | DELETE | `/primary_ips/{id}` | Delete a primary IP |
| `primaryIps.assign` | write | POST | `/primary_ips/{id}/actions/assign` | Assign to a server |
| `primaryIps.unassign` | write | POST | `/primary_ips/{id}/actions/unassign` | Unassign from server |
| `primaryIps.changeDnsPtr` | write | POST | `/primary_ips/{id}/actions/change_dns_ptr` | Change reverse DNS |
| `primaryIps.changeProtection` | write | POST | `/primary_ips/{id}/actions/change_protection` | Enable/disable delete protection |

### Key Params — primaryIps.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | IP type: `ipv4` or `ipv6` |
| `assignee_type` | string | yes | Currently only `server` |
| `datacenter` | string | yes | Datacenter name |
| `assignee_id` | number | no | Server ID to assign immediately |
| `auto_delete` | boolean | no | Delete when assigned server is deleted |
| `name` | string | no | Name |
| `labels` | object | no | Key-value labels |

---

## Load Balancers (19 methods)

Layer 4/7 load balancers with health checks, targets, and services.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `loadBalancers.list` | read | GET | `/load_balancers` | List all load balancers |
| `loadBalancers.get` | read | GET | `/load_balancers/{id}` | Get load balancer by ID |
| `loadBalancers.create` | write | POST | `/load_balancers` | Create a load balancer |
| `loadBalancers.update` | write | PUT | `/load_balancers/{id}` | Update name and labels |
| `loadBalancers.delete` | delete | DELETE | `/load_balancers/{id}` | Delete a load balancer |
| `loadBalancers.getMetrics` | read | GET | `/load_balancers/{id}/metrics` | Get LB metrics |
| `loadBalancers.addTarget` | write | POST | `/load_balancers/{id}/actions/add_target` | Add a target (server, IP, or label selector) |
| `loadBalancers.removeTarget` | write | POST | `/load_balancers/{id}/actions/remove_target` | Remove a target |
| `loadBalancers.addService` | write | POST | `/load_balancers/{id}/actions/add_service` | Add a service (port mapping + health check) |
| `loadBalancers.updateService` | write | POST | `/load_balancers/{id}/actions/update_service` | Update a service |
| `loadBalancers.deleteService` | write | POST | `/load_balancers/{id}/actions/delete_service` | Delete a service |
| `loadBalancers.changeProtection` | write | POST | `/load_balancers/{id}/actions/change_protection` | Change delete protection |
| `loadBalancers.changeAlgorithm` | write | POST | `/load_balancers/{id}/actions/change_algorithm` | Change algorithm (round_robin / least_connections) |
| `loadBalancers.changeType` | write | POST | `/load_balancers/{id}/actions/change_type` | Change load balancer type |
| `loadBalancers.changeDnsPtr` | write | POST | `/load_balancers/{id}/actions/change_dns_ptr` | Change reverse DNS |
| `loadBalancers.attachToNetwork` | write | POST | `/load_balancers/{id}/actions/attach_to_network` | Attach to a private network |
| `loadBalancers.detachFromNetwork` | write | POST | `/load_balancers/{id}/actions/detach_from_network` | Detach from a private network |
| `loadBalancers.enablePublicInterface` | write | POST | `/load_balancers/{id}/actions/enable_public_interface` | Enable public interface |
| `loadBalancers.disablePublicInterface` | write | POST | `/load_balancers/{id}/actions/disable_public_interface` | Disable public interface |

### Key Params — loadBalancers.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Load balancer name |
| `load_balancer_type` | string | yes | Type name or ID (e.g., `lb11`) |
| `location` | string | no | Location name |
| `network_zone` | string | no | Network zone (alternative to location) |
| `algorithm` | object | no | `{ type: "round_robin" }` or `{ type: "least_connections" }` |
| `services` | array | no | Service definitions (protocol, ports, health check) |
| `targets` | array | no | Target definitions (server, IP, label_selector) |
| `network` | number | no | Network ID to attach to |
| `public_interface` | boolean | no | Enable public interface (default: true) |
| `labels` | object | no | Key-value labels |

### Key Params — loadBalancers.addTarget

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | yes | Load balancer ID |
| `type` | string | yes | Target type: `server`, `ip`, `label_selector` |
| `server` | object | no | `{ id: number }` — for type `server` |
| `ip` | object | no | `{ ip: string }` — for type `ip` |
| `label_selector` | object | no | `{ selector: string }` — for type `label_selector` |
| `use_private_ip` | boolean | no | Use private IP for health checks |

### Key Params — loadBalancers.addService

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | yes | Load balancer ID |
| `protocol` | string | yes | Protocol: `http`, `https`, `tcp` |
| `listen_port` | number | yes | Port to listen on |
| `destination_port` | number | yes | Port to forward to |
| `proxyprotocol` | boolean | no | Enable PROXY protocol |
| `health_check` | object | no | Health check config: `{ protocol, port, interval, timeout, retries, http? }` |
| `http` | object | no | HTTP config: `{ cookie_name, cookie_lifetime, certificates, redirect_http, sticky_sessions }` |

---

## Load Balancer Types (2 methods) — Read-Only

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `loadBalancerTypes.list` | read | GET | `/load_balancer_types` | List available load balancer types |
| `loadBalancerTypes.get` | read | GET | `/load_balancer_types/{id}` | Get a load balancer type |

---

## Firewalls (8 methods)

Network firewalls with inbound/outbound rules, applied to servers or label selectors.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `firewalls.list` | read | GET | `/firewalls` | List all firewalls |
| `firewalls.get` | read | GET | `/firewalls/{id}` | Get firewall by ID |
| `firewalls.create` | write | POST | `/firewalls` | Create a firewall with rules |
| `firewalls.update` | write | PUT | `/firewalls/{id}` | Update name and labels |
| `firewalls.delete` | delete | DELETE | `/firewalls/{id}` | Delete a firewall |
| `firewalls.setRules` | write | POST | `/firewalls/{id}/actions/set_rules` | Replace all firewall rules |
| `firewalls.applyToResources` | write | POST | `/firewalls/{id}/actions/apply_to_resources` | Apply firewall to servers/label selectors |
| `firewalls.removeFromResources` | write | POST | `/firewalls/{id}/actions/remove_from_resources` | Remove firewall from resources |

### Key Params — firewalls.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Firewall name |
| `rules` | array | no | Firewall rules (see below) |
| `apply_to` | array | no | Resources to apply to: `[{ type: "server", server: { id } }]` or `[{ type: "label_selector", label_selector: { selector } }]` |
| `labels` | object | no | Key-value labels |

### Firewall Rule Structure

```json
{
  "direction": "in",
  "protocol": "tcp",
  "port": "80",
  "source_ips": ["0.0.0.0/0", "::/0"],
  "description": "Allow HTTP"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `direction` | string | yes | `in` or `out` |
| `protocol` | string | yes | `tcp`, `udp`, `icmp`, `esp`, `gre` |
| `port` | string | conditional | Port or range (e.g., `80`, `1024-65535`) — required for tcp/udp |
| `source_ips` | array | conditional | CIDR ranges — required for `in` rules |
| `destination_ips` | array | conditional | CIDR ranges — required for `out` rules |
| `description` | string | no | Rule description |
