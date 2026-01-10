import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor, buildCursorQuery, processPaginatedResults } from '../cursor.util.js';

describe('CursorUtil', () => {
  describe('encodeCursor / decodeCursor', () => {
    it('should encode and decode cursor correctly', () => {
      const data = {
        createdAt: '2024-01-01T12:00:00.000Z',
        id: '550e8400-e29b-41d4-a716-446655440000'
      };

      const encoded = encodeCursor(data);
      expect(typeof encoded).toBe('string');

      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual(data);
    });

    it('should return null for invalid cursor', () => {
      expect(decodeCursor('invalid')).toBeNull();
      expect(decodeCursor('')).toBeNull();
    });

    it('should return null for cursor with missing fields', () => {
      const invalidCursor = Buffer.from(JSON.stringify({ createdAt: '2024-01-01' }), 'utf-8').toString('base64url');
      expect(decodeCursor(invalidCursor)).toBeNull();
    });

    it('should return null for cursor with invalid date', () => {
      const invalidCursor = Buffer.from(JSON.stringify({ createdAt: 'invalid-date', id: 'test' }), 'utf-8').toString('base64url');
      expect(decodeCursor(invalidCursor)).toBeNull();
    });
  });

  describe('buildCursorQuery', () => {
    it('should build first page query', () => {
      const query = buildCursorQuery(null, 24);

      expect(query.take).toBe(25); // limit + 1
      expect(query.orderBy).toBeDefined();
      expect(query.skip).toBeUndefined();
    });

    it('should build subsequent page query', () => {
      const cursor = {
        createdAt: '2024-01-01T12:00:00.000Z',
        id: '550e8400-e29b-41d4-a716-446655440000'
      };

      const query = buildCursorQuery(cursor, 24);

      expect(query.take).toBe(25);
      expect(query.skip).toBe(1);
      expect(query.cursor).toEqual({ id: cursor.id });
    });

    it('should enforce max limit of 48', () => {
      const query = buildCursorQuery(null, 100);
      expect(query.take).toBe(49); // 48 + 1
    });
  });

  describe('processPaginatedResults', () => {
    it('should process results with more items', () => {
      const mockResults = Array.from({ length: 25 }, (_, i) => ({
        id: `id-${i}`,
        created_at: new Date(`2024-01-01T${String(i).padStart(2, '0')}:00:00.000Z`)
      }));

      const result = processPaginatedResults(mockResults, 24);

      expect(result.items.length).toBe(24);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).not.toBeNull();
    });

    it('should process results without more items', () => {
      const mockResults = Array.from({ length: 10 }, (_, i) => ({
        id: `id-${i}`,
        created_at: new Date(`2024-01-01T${String(i).padStart(2, '0')}:00:00.000Z`)
      }));

      const result = processPaginatedResults(mockResults, 24);

      expect(result.items.length).toBe(10);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should encode next cursor correctly', () => {
      const mockResults = Array.from({ length: 25 }, (_, i) => ({
        id: `id-${i}`,
        created_at: new Date(`2024-01-01T${String(i).padStart(2, '0')}:00:00.000Z`)
      }));

      const result = processPaginatedResults(mockResults, 24);

      expect(result.nextCursor).not.toBeNull();

      const decoded = decodeCursor(result.nextCursor!);
      expect(decoded).not.toBeNull();
      expect(decoded!.id).toBe('id-23'); // Last item in the returned list (index 23)
    });
  });
});
