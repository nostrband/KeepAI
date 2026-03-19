# Hetzner Methods — Security

Sub-spec of [hetzner-connector.md](./hetzner-connector.md). Covers SSH keys and TLS certificates.

## SSH Keys (5 methods)

SSH public keys that can be injected into servers on creation.

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `sshKeys.list` | read | GET | `/ssh_keys` | List all SSH keys |
| `sshKeys.get` | read | GET | `/ssh_keys/{id}` | Get SSH key by ID |
| `sshKeys.create` | write | POST | `/ssh_keys` | Add a new SSH key |
| `sshKeys.update` | write | PUT | `/ssh_keys/{id}` | Update name and labels |
| `sshKeys.delete` | delete | DELETE | `/ssh_keys/{id}` | Delete an SSH key |

### Key Params — sshKeys.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | SSH key name |
| `public_key` | string | yes | SSH public key (OpenSSH format) |
| `labels` | object | no | Key-value labels |

### Key Params — sshKeys.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | no | Filter by exact name |
| `label_selector` | string | no | Filter by label selector |
| `fingerprint` | string | no | Filter by fingerprint |
| `sort` | string | no | Sort by: `id`, `name` |
| `page` | number | no | Page number |
| `per_page` | number | no | Results per page |

---

## Certificates (6 methods)

TLS certificates for use with load balancers. Can be uploaded manually or managed (auto-renewed via Let's Encrypt).

| Method | Op Type | HTTP | Path | Description |
|--------|---------|------|------|-------------|
| `certificates.list` | read | GET | `/certificates` | List all certificates |
| `certificates.get` | read | GET | `/certificates/{id}` | Get certificate by ID |
| `certificates.create` | write | POST | `/certificates` | Create/upload a certificate |
| `certificates.update` | write | PUT | `/certificates/{id}` | Update name and labels |
| `certificates.delete` | delete | DELETE | `/certificates/{id}` | Delete a certificate |
| `certificates.retry` | write | POST | `/certificates/{id}/actions/retry` | Retry issuance of a managed certificate |

### Key Params — certificates.create (uploaded)

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Certificate name |
| `type` | string | no | `uploaded` (default) or `managed` |
| `certificate` | string | conditional | PEM-encoded certificate (for `uploaded`) |
| `private_key` | string | conditional | PEM-encoded private key (for `uploaded`) |
| `domain_names` | array | conditional | Domain names (for `managed` — Let's Encrypt) |
| `labels` | object | no | Key-value labels |

### Key Params — certificates.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | no | Filter by exact name |
| `label_selector` | string | no | Filter by label selector |
| `type` | string | no | Filter by type: `uploaded`, `managed` |
| `sort` | string | no | Sort by: `id`, `name`, `created` |
| `page` | number | no | Page number |
| `per_page` | number | no | Results per page |
