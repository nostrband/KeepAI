# Hetzner Methods — Compute

Sub-spec of [hetzner-connector.md](./hetzner-connector.md). Covers servers, server types, images, ISOs, and placement groups.

## Servers (28 methods)

Core compute resource. Manage virtual servers including lifecycle, power, networking, and rescue operations.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `servers.list` | read | GET | `/servers` | List all servers in the project |
| `servers.get` | read | GET | `/servers/{id}` | Get a server by ID |
| `servers.create` | write | POST | `/servers` | Create a new server |
| `servers.update` | write | PUT | `/servers/{id}` | Update server name and labels |
| `servers.delete` | delete | DELETE | `/servers/{id}` | Delete a server (irreversible) |
| `servers.getMetrics` | read | GET | `/servers/{id}/metrics` | Get server metrics (CPU, disk, network) |
| `servers.poweron` | write | POST | `/servers/{id}/actions/poweron` | Power on a stopped server |
| `servers.poweroff` | write | POST | `/servers/{id}/actions/poweroff` | Hard power off (like pulling the plug) |
| `servers.reboot` | write | POST | `/servers/{id}/actions/reboot` | Soft reboot (sends ACPI signal) |
| `servers.reset` | write | POST | `/servers/{id}/actions/reset` | Hard reset (like pressing reset button) |
| `servers.shutdown` | write | POST | `/servers/{id}/actions/shutdown` | Graceful shutdown via ACPI |
| `servers.resetPassword` | write | POST | `/servers/{id}/actions/reset_password` | Reset root password (returns new password) |
| `servers.createImage` | write | POST | `/servers/{id}/actions/create_image` | Create a snapshot or backup image |
| `servers.enableRescue` | write | POST | `/servers/{id}/actions/enable_rescue` | Boot into rescue system |
| `servers.disableRescue` | write | POST | `/servers/{id}/actions/disable_rescue` | Disable rescue mode |
| `servers.rebuild` | write | POST | `/servers/{id}/actions/rebuild` | Rebuild server from an image (destroys all data) |
| `servers.changeType` | write | POST | `/servers/{id}/actions/change_type` | Resize — change server type (upgrade/downgrade) |
| `servers.attachIso` | write | POST | `/servers/{id}/actions/attach_iso` | Attach an ISO image |
| `servers.detachIso` | write | POST | `/servers/{id}/actions/detach_iso` | Detach the current ISO image |
| `servers.enableBackup` | write | POST | `/servers/{id}/actions/enable_backup` | Enable automatic daily backups |
| `servers.disableBackup` | write | POST | `/servers/{id}/actions/disable_backup` | Disable automatic backups |
| `servers.changeDnsPtr` | write | POST | `/servers/{id}/actions/change_dns_ptr` | Set reverse DNS entry for server IP |
| `servers.changeProtection` | write | POST | `/servers/{id}/actions/change_protection` | Enable/disable delete and rebuild protection |
| `servers.requestConsole` | read | POST | `/servers/{id}/actions/request_console` | Get VNC console URL and password |
| `servers.attachToNetwork` | write | POST | `/servers/{id}/actions/attach_to_network` | Attach server to a private network |
| `servers.detachFromNetwork` | write | POST | `/servers/{id}/actions/detach_from_network` | Detach server from a private network |
| `servers.changeAliasIps` | write | POST | `/servers/{id}/actions/change_alias_ips` | Change alias IPs on a network interface |
| `servers.addToPlacementGroup` | write | POST | `/servers/{id}/actions/add_to_placement_group` | Add server to a placement group |
| `servers.removeFromPlacementGroup` | write | POST | `/servers/{id}/actions/remove_from_placement_group` | Remove server from its placement group |

### Key Params — servers.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Server name (unique within project) |
| `server_type` | string | yes | Server type name or ID (e.g., `cx22`, `cpx11`) |
| `image` | string | yes | Image name or ID (e.g., `ubuntu-24.04`, `debian-12`) |
| `location` | string | no | Location name (e.g., `fsn1`, `nbg1`, `hel1`, `ash`, `hil`) |
| `datacenter` | string | no | Datacenter name (e.g., `fsn1-dc14`) — alternative to location |
| `ssh_keys` | array | no | Array of SSH key names or IDs |
| `user_data` | string | no | Cloud-init user data (cloud-config or script) |
| `labels` | object | no | Key-value labels |
| `volumes` | array | no | Volume IDs to attach |
| `networks` | array | no | Network IDs to attach to |
| `firewalls` | array | no | Firewall objects `[{ firewall: id }]` to apply |
| `placement_group` | number | no | Placement group ID |
| `public_net` | object | no | Public network config: `{ enable_ipv4, enable_ipv6, ipv4, ipv6 }` |
| `start_after_create` | boolean | no | Start server after creation (default: true) |
| `automount` | boolean | no | Auto-mount volumes (default: false) |

### Key Params — servers.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | no | Filter by exact server name |
| `label_selector` | string | no | Filter by label selector |
| `status` | string | no | Filter by status: `initializing`, `starting`, `running`, `stopping`, `off`, `deleting`, `rebuilding`, `migrating`, `unknown` |
| `sort` | string | no | Sort by field: `id`, `name`, `created` (append `:asc` or `:desc`) |
| `page` | number | no | Page number |
| `per_page` | number | no | Results per page (1-50) |

### Key Params — servers.getMetrics

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | yes | Server ID |
| `type` | string | yes | Metric type: `cpu`, `disk`, `network` |
| `start` | string | yes | Start time (ISO 8601) |
| `end` | string | yes | End time (ISO 8601) |
| `step` | number | no | Resolution in seconds |

### Key Params — servers.rebuild

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | yes | Server ID |
| `image` | string | yes | Image name or ID to rebuild from |

### Key Params — servers.changeType

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | yes | Server ID |
| `server_type` | string | yes | New server type name or ID |
| `upgrade_disk` | boolean | yes | Whether to upgrade disk size (cannot downgrade if true) |

### Key Params — servers.attachToNetwork

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | yes | Server ID |
| `network` | number | yes | Network ID |
| `ip` | string | no | Specific IP in the network to assign |
| `alias_ips` | array | no | Additional alias IPs |

### Key Params — servers.changeDnsPtr

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | yes | Server ID |
| `ip` | string | yes | IP address to set reverse DNS for |
| `dns_ptr` | string | yes | Hostname for reverse DNS (or `null` to reset) |

### Key Params — servers.changeProtection

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | yes | Server ID |
| `delete` | boolean | no | Enable/disable delete protection |
| `rebuild` | boolean | no | Enable/disable rebuild protection |

### Key Params — servers.createImage

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | yes | Server ID |
| `description` | string | no | Image description |
| `type` | string | no | `snapshot` (default) or `backup` |
| `labels` | object | no | Key-value labels |

---

## Server Types (2 methods) — Read-Only

Reference data for available server configurations (CPU, RAM, disk, pricing).

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `serverTypes.list` | read | GET | `/server_types` | List all available server types |
| `serverTypes.get` | read | GET | `/server_types/{id}` | Get a server type by ID |

### Key Params — serverTypes.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | no | Filter by name |
| `page` | number | no | Page number |
| `per_page` | number | no | Results per page |

---

## Images (5 methods)

Server images — system images (Ubuntu, Debian, etc.), snapshots, and backups.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `images.list` | read | GET | `/images` | List images (system, snapshot, backup) |
| `images.get` | read | GET | `/images/{id}` | Get image by ID |
| `images.update` | write | PUT | `/images/{id}` | Update image description, type, labels |
| `images.delete` | delete | DELETE | `/images/{id}` | Delete an image (snapshots only) |
| `images.changeProtection` | write | POST | `/images/{id}/actions/change_protection` | Enable/disable delete protection |

### Key Params — images.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | no | Filter by type: `system`, `snapshot`, `backup`, `app` |
| `status` | string | no | Filter by status: `available`, `creating`, `unavailable` |
| `name` | string | no | Filter by name |
| `label_selector` | string | no | Filter by label selector |
| `architecture` | string | no | Filter by architecture: `x86`, `arm` |
| `sort` | string | no | Sort by: `id`, `name`, `created` |
| `include_deprecated` | boolean | no | Include deprecated images |
| `page` | number | no | Page number |
| `per_page` | number | no | Results per page |

Note: Images are created via `servers.createImage`, not a standalone endpoint.

---

## ISOs (2 methods) — Read-Only

ISO images that can be attached to servers for manual OS installation.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `isos.list` | read | GET | `/isos` | List available ISOs |
| `isos.get` | read | GET | `/isos/{id}` | Get ISO by ID |

### Key Params — isos.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | no | Filter by name |
| `architecture` | string | no | Filter by architecture: `x86`, `arm` |
| `include_architecture_wildcard` | boolean | no | Include ISOs with null architecture |
| `page` | number | no | Page number |
| `per_page` | number | no | Results per page |

---

## Placement Groups (5 methods)

Placement groups ensure servers are spread across different physical hosts (anti-affinity).

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `placementGroups.list` | read | GET | `/placement_groups` | List placement groups |
| `placementGroups.get` | read | GET | `/placement_groups/{id}` | Get placement group by ID |
| `placementGroups.create` | write | POST | `/placement_groups` | Create a placement group |
| `placementGroups.update` | write | PUT | `/placement_groups/{id}` | Update name and labels |
| `placementGroups.delete` | delete | DELETE | `/placement_groups/{id}` | Delete a placement group |

### Key Params — placementGroups.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Placement group name |
| `type` | string | yes | Type — currently only `spread` |
| `labels` | object | no | Key-value labels |
