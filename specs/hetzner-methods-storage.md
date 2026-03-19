# Hetzner Methods — Storage

Sub-spec of [hetzner-connector.md](./hetzner-connector.md). Covers block storage volumes.

## Volumes (9 methods)

Block storage volumes that can be attached to servers. Persist independently of server lifecycle.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `volumes.list` | read | GET | `/volumes` | List all volumes |
| `volumes.get` | read | GET | `/volumes/{id}` | Get volume by ID |
| `volumes.create` | write | POST | `/volumes` | Create a new volume |
| `volumes.update` | write | PUT | `/volumes/{id}` | Update name and labels |
| `volumes.delete` | delete | DELETE | `/volumes/{id}` | Delete a volume (irreversible) |
| `volumes.attach` | write | POST | `/volumes/{id}/actions/attach` | Attach volume to a server |
| `volumes.detach` | write | POST | `/volumes/{id}/actions/detach` | Detach volume from server |
| `volumes.resize` | write | POST | `/volumes/{id}/actions/resize` | Resize volume (can only increase) |
| `volumes.changeProtection` | write | POST | `/volumes/{id}/actions/change_protection` | Enable/disable delete protection |

### Key Params — volumes.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Volume name |
| `size` | number | yes | Size in GB (minimum 10) |
| `location` | string | conditional | Location name — required if no `server` |
| `server` | number | no | Server ID to attach immediately |
| `format` | string | no | Filesystem format: `ext4` or `xfs` |
| `automount` | boolean | no | Auto-mount when attached (default: false) |
| `labels` | object | no | Key-value labels |

### Key Params — volumes.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | no | Filter by exact name |
| `label_selector` | string | no | Filter by label selector |
| `status` | string | no | Filter by status: `available`, `creating` |
| `sort` | string | no | Sort by: `id`, `name`, `created` |
| `page` | number | no | Page number |
| `per_page` | number | no | Results per page |

### Key Params — volumes.attach

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | yes | Volume ID |
| `server` | number | yes | Server ID to attach to |
| `automount` | boolean | no | Auto-mount the volume |

### Key Params — volumes.resize

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | yes | Volume ID |
| `size` | number | yes | New size in GB (must be larger than current) |
