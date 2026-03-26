/**
 * Parses approval description strings containing [type:id] resolvable references.
 *
 * Example: "Update page [page_id:abc123]" →
 *   [{ type: 'text', value: 'Update page ' }, { type: 'ref', refType: 'page_id', id: 'abc123' }]
 */

export type DescriptionSegment =
  | { type: 'text'; value: string }
  | { type: 'ref'; refType: string; id: string };

const REF_PATTERN = /\[([a-z_]+):([^\]]+)\]/g;

export function parseDescription(description: string): DescriptionSegment[] {
  const segments: DescriptionSegment[] = [];
  let lastIndex = 0;

  for (const match of description.matchAll(REF_PATTERN)) {
    const matchIndex = match.index!;
    if (matchIndex > lastIndex) {
      segments.push({ type: 'text', value: description.slice(lastIndex, matchIndex) });
    }
    segments.push({ type: 'ref', refType: match[1], id: match[2] });
    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < description.length) {
    segments.push({ type: 'text', value: description.slice(lastIndex) });
  }

  return segments;
}

/**
 * Given a service's resolvable types, a method name, and a JSON key/value,
 * determine if the value is resolvable and return the resolvable type name.
 *
 * 1. Direct match: key exists in resolvableTypes (e.g. "page_id" for Notion)
 * 2. Method-context match: a resolvable type's params map has an entry for this method
 *    that matches this key (e.g. "id" → "message_id" for Gmail's messages.get)
 */
export function resolveKeyType(
  resolvableTypes: Record<string, { label: string; params?: Record<string, string> }>,
  method: string,
  key: string
): string | null {
  // Direct match
  if (resolvableTypes[key]) return key;

  // Method-context match via params map
  for (const [typeName, typeInfo] of Object.entries(resolvableTypes)) {
    if (typeInfo.params?.[method] === key) return typeName;
  }

  return null;
}
