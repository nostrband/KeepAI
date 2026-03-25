# Notion Methods — Databases & Data Sources

Method descriptions sourced from `@notionhq/client` `Client.d.ts` JSDoc.
Parameter names sourced from `api-endpoints.js`.

## databases.retrieve

- **Description**: Retrieve a database
- **Operation**: read
- **SDK**: `client.databases.retrieve(args)`
- **Params**:
  - `database_id` (string, required) — Database ID
- **Returns**: Database object

## databases.create

- **Description**: Create a database
- **Operation**: write
- **SDK**: `client.databases.create(args)`
- **Params**:
  - `parent` (object, required) — Parent page `{ type: "page_id", page_id: "..." }`
  - `title` (array) — Rich text title
  - `description` (array) — Rich text description
  - `is_inline` (boolean) — Inline database
  - `initial_data_source` (object) — Initial data source config
  - `icon` (object) — Database icon
  - `cover` (object) — Cover image
- **Returns**: Database object

## databases.update

- **Description**: Update a database
- **Operation**: write
- **SDK**: `client.databases.update(args)`
- **Params**:
  - `database_id` (string, required) — Database ID
  - `parent` (object) — Move database to new parent
  - `title` (array) — Rich text title
  - `description` (array) — Rich text description
  - `is_inline` (boolean) — Inline status
  - `icon` (object) — Database icon
  - `cover` (object) — Cover image
  - `in_trash` (boolean) — Move to/from trash
  - `is_locked` (boolean) — Lock/unlock
- **Returns**: Updated database object

## dataSources.retrieve

- **Description**: Retrieve a data source
- **Operation**: read
- **SDK**: `client.dataSources.retrieve(args)`
- **Params**:
  - `data_source_id` (string, required) — Data source ID
- **Returns**: Data source object

## dataSources.query

- **Description**: Query a data source
- **Operation**: read
- **SDK**: `client.dataSources.query(args)`
- **Params**:
  - `data_source_id` (string, required) — Data source ID
  - `filter` (object) — Filter conditions
  - `sorts` (array) — Sort criteria
  - `start_cursor` (string) — Pagination cursor
  - `page_size` (number) — Results per page
  - `filter_properties` (string[]) — Property IDs to include
  - `archived` (boolean) — Include archived
  - `in_trash` (boolean) — Include trashed
  - `result_type` (string) — Result type
- **Returns**: Paginated query results

## dataSources.create

- **Description**: Create a data source
- **Operation**: write
- **SDK**: `client.dataSources.create(args)`
- **Params**:
  - `parent` (object, required) — Parent
  - `properties` (object) — Properties schema
  - `title` (array) — Rich text title
  - `icon` (object) — Icon
- **Returns**: Data source object

## dataSources.update

- **Description**: Update a data source
- **Operation**: write
- **SDK**: `client.dataSources.update(args)`
- **Params**:
  - `data_source_id` (string, required) — Data source ID
  - `archived` (boolean) — Archive status
  - `title` (array) — Title
  - `icon` (object) — Icon
  - `properties` (object) — Properties schema
  - `in_trash` (boolean) — Trash status
  - `parent` (object) — Move to new parent
- **Returns**: Updated data source object

## dataSources.listTemplates

- **Description**: List page templates that are available for a data source
- **Operation**: read
- **SDK**: `client.dataSources.listTemplates(args)`
- **Params**:
  - `data_source_id` (string, required) — Data source ID
  - `name` (string) — Filter by template name
  - `start_cursor` (string) — Pagination cursor
  - `page_size` (number) — Results per page
- **Returns**: Paginated list of template objects
