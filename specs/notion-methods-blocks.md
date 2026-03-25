# Notion Methods — Blocks

Method descriptions sourced from `@notionhq/client` `Client.d.ts` JSDoc.
Parameter names sourced from `api-endpoints.js`.

## blocks.retrieve

- **Description**: Retrieve block
- **Operation**: read
- **SDK**: `client.blocks.retrieve(args)`
- **Params**:
  - `block_id` (string, required) — Block ID
- **Returns**: Block object

## blocks.update

- **Description**: Update block
- **Operation**: write
- **SDK**: `client.blocks.update(args)`
- **Params**:
  - `block_id` (string, required) — Block ID
  - `archived` (boolean) — Archive/unarchive
  - `in_trash` (boolean) — Move to/from trash
  - `type` (string) — Block type (for type-specific updates)
  - Plus type-specific body params: `embed`, `bookmark`, `image`, `video`, `pdf`, `file`, `audio`, `code`, `equation`, `divider`, `breadcrumb`, `table_of_contents`, `link_to_page`, `table_row`, `heading_1`, `heading_2`, `heading_3`, `paragraph`, `bulleted_list_item`, `numbered_list_item`, `quote`, `to_do`, `toggle`, `template`, `callout`, `synced_block`, `table`, `column`
- **Returns**: Updated block object

## blocks.delete

- **Description**: Delete block
- **Operation**: delete
- **SDK**: `client.blocks.delete(args)`
- **Params**:
  - `block_id` (string, required) — Block ID
- **Returns**: Deleted block confirmation

## blocks.children.list

- **Description**: Retrieve block children
- **Operation**: read
- **SDK**: `client.blocks.children.list(args)`
- **Params**:
  - `block_id` (string, required) — Block ID (or page ID to get top-level blocks)
  - `start_cursor` (string) — Pagination cursor
  - `page_size` (number) — Results per page
- **Returns**: Paginated list of child block objects

## blocks.children.append

- **Description**: Append block children
- **Operation**: write
- **SDK**: `client.blocks.children.append(args)`
- **Params**:
  - `block_id` (string, required) — Block ID (or page ID)
  - `children` (array) — Block objects to append
  - `after` (string) — Block ID to insert after
  - `position` (object) — Position specification
- **Returns**: Appended block children
