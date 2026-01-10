'use client';

import { SuggestionPreferencesForm } from '@/components/suggestions/SuggestionPreferences';

export default function PreferencesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Preferências de Sugestões</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Configure como deseja receber sugestões de produtos
        </p>
      </div>

      {/* Preferences Form */}
      <SuggestionPreferencesForm />
    </div>
  );
}
