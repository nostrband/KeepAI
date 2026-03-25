# Notion Methods — Pages

Method descriptions sourced from `@notionhq/client` `Client.d.ts` JSDoc.
Parameter names sourced from `api-endpoints.js` (`pathParams`, `queryParams`, `bodyParams`).

## pages.create

- **Description**: Create a page
- **Operation**: write
- **SDK**: `client.pages.create(args)`
- **Params**:
  - `parent` (object, required) — Parent page or database `{ type: "page_id", page_id: "..." }` or `{ type: "database_id", database_id: "..." }`
  - `properties` (object, required) — Page properties (title, etc.)
  - `icon` (object) — Page icon
  - `cover` (object) — Page cover image
  - `content` (array) — Block content
  - `children` (array) — Child blocks (legacy, prefer `content`)
  - `markdown` (string) — Markdown content
  - `template` (object) — Template to use
  - `position` (object) — Position among siblings
- **Returns**: Page object

## pages.retrieve

- **Description**: Retrieve a page
- **Operation**: read
- **SDK**: `client.pages.retrieve(args)`
- **Params**:
  - `page_id` (string, required) — Page ID
  - `filter_properties` (string[]) — Property IDs to include
- **Returns**: Page object

## pages.update

- **Description**: Update page properties
- **Operation**: write
- **SDK**: `client.pages.update(args)`
- **Params**:
  - `page_id` (string, required) — Page ID
  - `properties` (object) — Properties to update
  - `icon` (object) — Page icon
  - `cover` (object) — Page cover image
  - `archived` (boolean) — Archive/unarchive
  - `in_trash` (boolean) — Move to/from trash
  - `is_locked` (boolean) — Lock/unlock editing
  - `template` (object) — Template settings
  - `erase_content` (boolean) — Erase all content
  - `is_archived` (boolean) — Archive status
- **Returns**: Updated page object

## pages.move

- **Description**: Move a page
- **Operation**: write
- **SDK**: `client.pages.move(args)`
- **Params**:
  - `page_id` (string, required) — Page ID
  - `parent` (object, required) — New parent
- **Returns**: Moved page object

## pages.retrieveMarkdown

- **Description**: Retrieve a page as markdown
- **Operation**: read
- **SDK**: `client.pages.retrieveMarkdown(args)`
- **Params**:
  - `page_id` (string, required) — Page ID
  - `include_transcript` (boolean) — Include audio/video transcript
- **Returns**: Markdown content object

## pages.updateMarkdown

- **Description**: Update a page's content as markdown
- **Operation**: write
- **SDK**: `client.pages.updateMarkdown(args)`
- **Params**:
  - `page_id` (string, required) — Page ID
  - `type` (string, required) — Update type: `"insert_content"`, `"replace_content_range"`, `"update_content"`, or `"replace_content"`
  - `insert_content` (object) — Insert content at position
  - `replace_content_range` (object) — Replace content in range
  - `update_content` (object) — Update existing content
  - `replace_content` (object) — Replace all content
- **Returns**: Updated markdown content

## pages.properties.retrieve

- **Description**: Retrieve page property
- **Operation**: read
- **SDK**: `client.pages.properties.retrieve(args)`
- **Params**:
  - `page_id` (string, required) — Page ID
  - `property_id` (string, required) — Property ID
  - `start_cursor` (string) — Pagination cursor
  - `page_size` (number) — Results per page
- **Returns**: Property value object (paginated for multi-value properties)
