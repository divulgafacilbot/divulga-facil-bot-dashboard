/**
 * Cursor format: base64-encoded JSON { createdAt: ISO string, id: UUID }
 */

export interface CursorData {
  createdAt: string; // ISO 8601 format
  id: string;        // UUID
}

/**
 * Encode cursor for pagination
 */
export function encodeCursor(data: CursorData): string {
  const json = JSON.stringify(data);
  return Buffer.from(json, 'utf-8').toString('base64url');
}

/**
 * Decode cursor from pagination request
 * Returns null if invalid
 */
export function decodeCursor(cursor: string): CursorData | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    const data = JSON.parse(json);

    // Validate structure
    if (!data.createdAt || !data.id) {
      return null;
    }

    // Validate createdAt is valid ISO date
    if (isNaN(Date.parse(data.createdAt))) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Build Prisma query for cursor pagination
 *
 * @param cursor - Decoded cursor data (or null for first page)
 * @param limit - Items per page (default: 24)
 * @returns Prisma query object
 */
export function buildCursorQuery(
  cursor: CursorData | null,
  limit: number = 24
) {
  const take = Math.min(limit, 48); // Max 48 items

  if (!cursor) {
    // First page
    return {
      take: take + 1, // Fetch one extra to check if there are more
      orderBy: [
        { created_at: 'desc' as const },
        { id: 'desc' as const }
      ]
    };
  }

  // Subsequent pages
  return {
    take: take + 1,
    skip: 1, // Skip the cursor item
    cursor: {
      id: cursor.id
    },
    orderBy: [
      { created_at: 'desc' as const },
      { id: 'desc' as const }
    ]
  };
}

/**
 * Process paginated results
 * Returns items and next cursor
 */
export function processPaginatedResults<T extends { id: string; created_at: Date }>(
  results: T[],
  limit: number
): {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
} {
  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;

  const nextCursor = hasMore
    ? encodeCursor({
        createdAt: items[items.length - 1].created_at.toISOString(),
        id: items[items.length - 1].id
      })
    : null;

  return { items, nextCursor, hasMore };
}
