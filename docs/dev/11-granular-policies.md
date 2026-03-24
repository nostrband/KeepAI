# 11 - Granular Policies: Per-Method and Per-Group Permissions

## Summary

Extend the permission system to support **per-group** and **per-method** policies within each operation category (read/write/delete). Add a fourth policy type **"custom"** for categories and groups that signals "look at sub-items for individual policies." Replace dropdown selectors with a **multi-position horizontal switch** using distinctive icons and colors for 1-click policy changes.

## Current State

Today, each agent+connection pair has a `Policy` with rules at the **operation category** level only:

```json
{
  "default": "ask",
  "rules": [
    { "operations": ["read"], "action": "allow" },
    { "operations": ["write", "delete"], "action": "ask" }
  ]
}
```

The UI shows 3 dropdowns (read/write/delete) with allow/ask/deny options. There is no way to set different policies for individual methods or method groups.

## Design

### Hierarchy

```
Category (read / write / delete)
  └── Group (messages / drafts / labels / threads / ...)
        └── Method (messages.list / messages.send / ...)
```

- **Category** has 4 policy options: `allow | ask | deny | custom`
- **Group** has 4 policy options: `allow | ask | deny | custom`
- **Method** has 3 policy options: `allow | ask | deny`

When category or group is set to `allow/ask/deny`, that decision applies uniformly to all children. When set to `custom`, children's individual policies are active.

### Method-to-Group Mapping

Methods already follow `group.name` convention (e.g. `messages.send`, `drafts.create`). The group is derived by splitting on `.` and taking the first segment. Connectors already have `groupDescriptions` for display purposes.

Groups intersect with categories — the same group can appear under multiple categories. Example for Gmail:

```
read:
  messages: messages.list, messages.get
  attachments: attachments.get
  drafts: drafts.list, drafts.get
  labels: labels.list, labels.get
  threads: threads.list, threads.get
  profile: profile.get

write:
  messages: messages.send, messages.modify, messages.batchModify, messages.untrash
  drafts: drafts.create, drafts.send, drafts.update
  labels: labels.create, labels.patch
  threads: threads.modify, threads.untrash

delete:
  messages: messages.trash, messages.delete, messages.batchDelete
  drafts: drafts.delete
  labels: labels.delete
  threads: threads.trash, threads.delete
```

### Preserving Custom Config

When a user sets a category to `custom` and configures individual groups/methods, then switches the category back to `allow` — the custom sub-policies are **stored but inactive**. The engine only evaluates sub-policies when the parent is `custom`. This lets users toggle global policy temporarily without losing their fine-tuned setup.

Same applies at the group level: switching a group from `custom` to `allow` preserves per-method settings underneath.

## Policy Format (v2)

### New Types

```typescript
export type PolicyAction = 'allow' | 'deny' | 'ask';
export type CategoryAction = PolicyAction | 'custom';

export interface MethodPolicy {
  action: PolicyAction;
}

export interface GroupPolicy {
  action: CategoryAction;  // allow/ask/deny applies to all methods; custom = per-method
  methods?: Record<string, MethodPolicy>;  // keyed by method name (e.g. "messages.send")
}

export interface CategoryPolicy {
  action: CategoryAction;  // allow/ask/deny applies to all groups; custom = per-group
  groups?: Record<string, GroupPolicy>;  // keyed by group prefix (e.g. "messages")
}

export interface PolicyV2 {
  version: 2;
  default: PolicyAction;
  categories: {
    read: CategoryPolicy;
    write: CategoryPolicy;
    delete: CategoryPolicy;
  };
}
```

### Example: Custom Read, Simple Write/Delete

```json
{
  "version": 2,
  "default": "ask",
  "categories": {
    "read": {
      "action": "custom",
      "groups": {
        "messages": { "action": "allow" },
        "drafts": { "action": "deny" },
        "labels": { "action": "allow" },
        "threads": {
          "action": "custom",
          "methods": {
            "threads.list": { "action": "allow" },
            "threads.get": { "action": "ask" }
          }
        },
        "profile": { "action": "allow" }
      }
    },
    "write": { "action": "ask" },
    "delete": { "action": "deny" }
  }
}
```

### Migration from V1

V1 policies (no `version` field) are auto-converted on read:

```typescript
function migratePolicy(policy: Policy | PolicyV2): PolicyV2 {
  if ('version' in policy && policy.version === 2) return policy;
  // Convert v1 rules to v2 categories
  const actions = policyToActions(policy); // existing helper
  return {
    version: 2,
    default: policy.default,
    categories: {
      read: { action: actions.read },
      write: { action: actions.write },
      delete: { action: actions.delete },
    },
  };
}
```

No DB migration needed — the `policy` column stores JSON text. PolicyEngine reads and migrates on the fly. Saving always writes V2 format.

## Policy Engine Evaluation

```typescript
evaluate(agentId, metadata): PolicyDecision {
  const policy = this.getPolicy(...);  // auto-migrates v1→v2

  const category = policy.categories[metadata.operationType];
  if (category.action !== 'custom') return category.action;

  // Category is custom — check group
  const group = getMethodGroup(metadata.method);  // "messages" from "messages.send"
  const groupPolicy = category.groups?.[group];
  if (!groupPolicy) return policy.default;         // unknown group → fallback
  if (groupPolicy.action !== 'custom') return groupPolicy.action;

  // Group is custom — check method
  const methodPolicy = groupPolicy.methods?.[metadata.method];
  if (!methodPolicy) return policy.default;         // unknown method → fallback
  return methodPolicy.action;
}
```

Resolution order: **category → group → method → default**. At each level, if the policy is not `custom`, return it. If `custom`, drill down. If no entry found at any level, use `policy.default`.

## UI Design

### Horizontal Switch Component

Replace dropdowns with a segmented toggle. Each position is a single click.

```
┌──────┬──────┬──────┬────────┐
│  ✓   │  ?   │  ✕   │  ⚙    │   ← category/group switch (4 positions)
│Allow │ Ask  │ Deny │Custom  │
└──────┴──────┴──────┴────────┘

┌──────┬──────┬──────┐
│  ✓   │  ?   │  ✕   │            ← method switch (3 positions)
│Allow │ Ask  │ Deny │
└──────┴──────┴──────┘
```

### Colors and Icons

| Policy | Icon | Color | Meaning |
|--------|------|-------|---------|
| Allow | `Check` (✓) | Green (`emerald-500`) | Auto-approved |
| Ask | `MessageCircleQuestion` (?) | Amber (`amber-500`) | Requires approval |
| Deny | `X` (✕) | Red (`red-500`) | Blocked |
| Custom | `SlidersHorizontal` (⚙) | Blue (`blue-500`) | Per-item config |

Active position: filled background with white icon. Inactive positions: subtle outline/muted. This makes the current policy instantly scannable even across many rows.

### Layout

```
Gmail — user@gmail.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Read    [✓ Allow] [ Ask ] [ Deny ] [⚙ Custom]    ← category switch
  Write   [ Allow ] [? Ask] [ Deny ] [⚙ Custom]    ← category switch
  Delete  [ Allow ] [ Ask ] [✕ Deny] [ Custom ]    ← category switch
```

When a category is set to `custom`, it expands to show groups:

```
  Read    [ Allow ] [ Ask ] [ Deny ] [⚙ Custom]    ← active: custom
    ├ messages      [✓ Allow] [ Ask ] [ Deny ] [ Custom ]
    ├ drafts        [ Allow ] [ Ask ] [✕ Deny] [ Custom ]
    ├ labels        [✓ Allow] [ Ask ] [ Deny ] [ Custom ]
    ├ threads       [ Allow ] [ Ask ] [ Deny ] [⚙ Custom]
    │   ├ threads.list    [✓ Allow] [ Ask ] [ Deny ]
    │   └ threads.get     [ Allow ] [? Ask] [ Deny ]
    └ profile       [✓ Allow] [ Ask ] [ Deny ] [ Custom ]
```

### Interaction Details

1. **1-click change**: clicking any switch position immediately updates local state. Save button commits all changes.

2. **Switching to custom**: if no sub-policies exist yet, auto-populate groups/methods from the connector's method list using the **default per-category policy** (read→allow, write→ask, delete→ask) for all children. This is safer and more predictable than inheriting the previous category action.

3. **Switching away from custom**: sub-policies are preserved in state (and in the saved JSON), just not active. User can switch back to custom at any time without losing their config.

## API Changes

### New Endpoint: Method List

The UI needs to know available methods per service to render the group/method tree. Add:

```
GET /api/services/:service/methods
```

Response:
```json
{
  "service": "gmail",
  "groups": {
    "messages": {
      "description": "Send, receive, search emails",
      "methods": [
        { "name": "messages.list", "description": "Search/list emails", "operationType": "read" },
        { "name": "messages.get", "description": "Read email", "operationType": "read" },
        { "name": "messages.send", "description": "Send email", "operationType": "write" },
        ...
      ]
    },
    ...
  }
}
```

This groups methods by prefix and includes `operationType` so the UI can build the category→group→method tree.

### Policy Validation Update

The PUT policy endpoint must accept V2 format. Validation:
- `version` must be `2` (or absent for v1 compat)
- Each category action must be `allow|ask|deny|custom`
- If `custom`, validate `groups` entries
- Each group action must be `allow|ask|deny|custom`
- If group is `custom`, validate `methods` entries
- Each method action must be `allow|ask|deny`

## Implementation Plan

### Phase 1: Backend

1. **Types**: add `PolicyV2`, `CategoryPolicy`, `GroupPolicy`, `MethodPolicy` to `@keepai/proto`
2. **Migration helper**: `migratePolicy()` in proto package
3. **Policy engine**: update `evaluate()` to handle V2 with category→group→method resolution
4. **Policy routes**: update validation to accept V2, add `/api/services/:service/methods` endpoint
5. **Tests**: policy engine tests for V2 evaluation, migration, edge cases

### Phase 2: Frontend

1. **PolicySwitch component**: horizontal segmented toggle with icons/colors, 3 or 4 positions
2. **Method tree data**: hook to fetch `/api/services/:service/methods`, build category→group→method tree
3. **Permissions page rewrite**: replace dropdowns with switches, add collapsible group/method rows
4. **State management**: local PolicyV2 state with expand/collapse, auto-populate on custom switch
5. **Visual polish**: transition animations for expand/collapse

### Edge Cases

- **MCP connectors** with dynamic method lists (Notion, GitHub) — method list fetched at connect time, cached
- **Methods removed from connector**: policy entries for non-existent methods are **not shown** in the UI but **preserved in saved JSON**, so if the method reappears the previous policy is restored
- **New methods added to connector**: methods without a policy entry use the **default per-category policy** (read→allow, write→ask, delete→ask) and appear in the UI with that default
