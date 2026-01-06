import { EventEmitter } from 'node:events';

export const SUPPORT_EVENTS = {
  UPDATED: 'support:updated',
} as const;

export const supportEvents = new EventEmitter();
