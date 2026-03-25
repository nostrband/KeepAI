# Notion Methods — Users, Comments, Search, Views, File Uploads

Method descriptions sourced from `@notionhq/client` `Client.d.ts` JSDoc.
Parameter names sourced from `api-endpoints.js`.

---

## Users

### users.retrieve

- **Description**: Retrieve a user
- **Operation**: read
- **SDK**: `client.users.retrieve(args)`
- **Params**:
  - `user_id` (string, required) — User ID
- **Returns**: User object

### users.list

- **Description**: List all users
- **Operation**: read
- **SDK**: `client.users.list(args)`
- **Params**:
  - `start_cursor` (string) — Pagination cursor
  - `page_size` (number) — Results per page
- **Returns**: Paginated list of user objects

### users.me

- **Description**: Get details about bot
- **Operation**: read
- **SDK**: `client.users.me(args)`
- **Params**: (none required)
- **Returns**: Bot user object

---

## Comments

### comments.create

- **Description**: Create a comment
- **Operation**: write
- **SDK**: `client.comments.create(args)`
- **Params**:
  - `rich_text` (array, required) — Comment content as rich text
  - `parent` (object) — Parent page `{ page_id: "..." }` for page-level comment
  - `discussion_id` (string) — Discussion thread ID for reply
  - `attachments` (array) — File attachments
  - `display_name` (string) — Display name override
- **Returns**: Comment object

### comments.list

- **Description**: List comments
- **Operation**: read
- **SDK**: `client.comments.list(args)`
- **Params**:
  - `block_id` (string, required) — Block or page ID to list comments for
  - `start_cursor` (string) — Pagination cursor
  - `page_size` (number) — Results per page
- **Returns**: Paginated list of comment objects

### comments.retrieve

- **Description**: Retrieve a comment
- **Operation**: read
- **SDK**: `client.comments.retrieve(args)`
- **Params**:
  - `comment_id` (string, required) — Comment ID
- **Returns**: Comment object

---

## Search

### search

- **Description**: Search by title
- **Operation**: read
- **SDK**: `client.search(args)`
- **Params**:
  - `query` (string) — Search query text
  - `sort` (object) — Sort `{ direction: "ascending"|"descending", timestamp: "last_edited_time" }`
  - `filter` (object) — Filter `{ value: "page"|"database", property: "object" }`
  - `start_cursor` (string) — Pagination cursor
  - `page_size` (number) — Results per page
- **Returns**: Paginated search results (pages and databases)

---

## Views

### views.create

- **Description**: Create a view
- **Operation**: write
- **SDK**: `client.views.create(args)`
- **Params**: (body params TBD by SDK — likely database_id, type, etc.)
- **Returns**: View object

### views.retrieve

- **Description**: Retrieve a view
- **Operation**: read
- **SDK**: `client.views.retrieve(args)`
- **Params**:
  - `view_id` (string, required) — View ID
- **Returns**: View object

### views.update

- **Description**: Update a view
- **Operation**: write
- **SDK**: `client.views.update(args)`
- **Params**:
  - `view_id` (string, required) — View ID
  - (body params TBD)
- **Returns**: Updated view object

### views.delete

- **Description**: Delete a view
- **Operation**: delete
- **SDK**: `client.views.delete(args)`
- **Params**:
  - `view_id` (string, required) — View ID
- **Returns**: Deleted view confirmation

### views.list

- **Description**: List views for a database
- **Operation**: read
- **SDK**: `client.views.list(args)`
- **Params**:
  - `database_id` (string) — Database ID filter
  - `data_source_id` (string) — Data source ID filter
  - `start_cursor` (string) — Pagination cursor
  - `page_size` (number) — Results per page
- **Returns**: Paginated list of view objects

### views.queries.create

- **Description**: Create a view query
- **Operation**: write
- **SDK**: `client.views.queries.create(args)`
- **Params**:
  - `view_id` (string, required) — View ID
- **Returns**: View query object

### views.queries.results

- **Description**: Get view query results
- **Operation**: read
- **SDK**: `client.views.queries.results(args)`
- **Params**:
  - `view_id` (string, required) — View ID
  - `query_id` (string, required) — Query ID
  - `start_cursor` (string) — Pagination cursor
  - `page_size` (number) — Results per page
- **Returns**: Paginated query results

### views.queries.delete

- **Description**: Delete a view query
- **Operation**: delete
- **SDK**: `client.views.queries.delete(args)`
- **Params**:
  - `view_id` (string, required) — View ID
  - `query_id` (string, required) — Query ID
- **Returns**: Deletion confirmation

---

## File Uploads

### fileUploads.create

- **Description**: Create a file upload
- **Operation**: write
- **SDK**: `client.fileUploads.create(args)`
- **Params**:
  - `mode` (string) — Upload mode: `"single_part"` or `"multi_part"`
  - `filename` (string) — File name
  - `content_type` (string) — MIME type
  - `number_of_parts` (number) — Part count for multi-part
  - `external_url` (string) — URL for external file
- **Returns**: File upload object with `id` and upload URLs

### fileUploads.retrieve

- **Description**: Retrieve a file upload
- **Operation**: read
- **SDK**: `client.fileUploads.retrieve(args)`
- **Params**:
  - `file_upload_id` (string, required) — File upload ID
- **Returns**: File upload object

### fileUploads.list

- **Description**: List file uploads
- **Operation**: read
- **SDK**: `client.fileUploads.list(args)`
- **Params**:
  - `status` (string) — Filter by status
  - `start_cursor` (string) — Pagination cursor
  - `page_size` (number) — Results per page
- **Returns**: Paginated list of file upload objects

### fileUploads.send

- **Description**: Send a file upload. Requires a `file_upload_id` obtained from Create File Upload. The `file` parameter contains raw file contents or Blob/File under `file.data` with optional `file.filename`. Uses multipart/form-data.
- **Operation**: write
- **SDK**: `client.fileUploads.send(args)`
- **Params**:
  - `file_upload_id` (string, required) — File upload ID
  - `file` (object, required) — `{ data: string|Blob, filename?: string }`
  - `part_number` (string) — Part number for multi-part uploads
- **Returns**: File upload object
- **Note**: This endpoint uses multipart/form-data, not JSON. May need special handling in the execute function.

### fileUploads.complete

- **Description**: Complete a multi-part file upload
- **Operation**: write
- **SDK**: `client.fileUploads.complete(args)`
- **Params**:
  - `file_upload_id` (string, required) — File upload ID
- **Returns**: Completed file upload object
