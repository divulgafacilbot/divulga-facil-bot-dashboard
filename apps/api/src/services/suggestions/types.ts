import { z } from 'zod';

/**
 * Suggestion Types and Validators
 */

export const SuggestionFrequencySchema = z.enum(['DAILY', 'WEEKLY', 'MONTHLY']);
export type SuggestionFrequency = z.infer<typeof SuggestionFrequencySchema>;

export const SuggestionActionSchema = z.enum(['ACCEPTED', 'REJECTED', 'IGNORED']);
export type SuggestionAction = z.infer<typeof SuggestionActionSchema>;

export const UpdateSuggestionPreferencesSchema = z.object({
  suggestionsEnabled: z.boolean().optional(),
  frequency: SuggestionFrequencySchema.optional(),
  maxSuggestionsPerBatch: z.number().int().min(1).max(20).optional(),
  preferredCategories: z.array(z.string()).optional(),
  excludedMarketplaces: z.array(z.string()).optional(),
});

export const RecordSuggestionActionSchema = z.object({
  action: SuggestionActionSchema,
});

export const ListSuggestionsQuerySchema = z.object({
  category: z.string().optional(),
  marketplace: z.string().optional(),
  userAction: SuggestionActionSchema.optional(),
  page: z.string().transform((val) => parseInt(val, 10)).optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).optional(),
});

export type UpdateSuggestionPreferencesInput = z.infer<typeof UpdateSuggestionPreferencesSchema>;
export type RecordSuggestionActionInput = z.infer<typeof RecordSuggestionActionSchema>;
export type ListSuggestionsQuery = z.infer<typeof ListSuggestionsQuerySchema>;

/**
 * Validator helper functions
 */
export function validateUpdateSuggestionPreferences(data: unknown) {
  return UpdateSuggestionPreferencesSchema.parse(data);
}

export function validateRecordSuggestionAction(data: unknown) {
  return RecordSuggestionActionSchema.parse(data);
}

export function validateListSuggestionsQuery(data: unknown) {
  return ListSuggestionsQuerySchema.parse(data);
}
