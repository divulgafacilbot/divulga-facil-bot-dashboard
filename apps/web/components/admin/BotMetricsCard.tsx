import type { ReactNode } from 'react';
import type { BotType } from '../../lib/admin-enums';

interface BotMetricsCardProps {
  botType: BotType;
  activeCount: number;
  usageCount: number;
  label: string;
  icon: ReactNode;
  colorClass?: string;
}

const BOT_TYPE_STYLES: Record<string, string> = {
  PROMOCOES: 'border-l-4 border-red-500 bg-red-50',
  DOWNLOAD: 'border-l-4 border-blue-500 bg-blue-50',
  PINTEREST: 'border-l-4 border-pink-500 bg-pink-50',
  SUGGESTION: 'border-l-4 border-purple-500 bg-purple-50',
};

export default function BotMetricsCard({
  botType,
  activeCount,
  usageCount,
  label,
  icon,
  colorClass,
}: BotMetricsCardProps) {
  const style = colorClass || BOT_TYPE_STYLES[botType] || 'border-l-4 border-gray-500 bg-gray-50';

  return (
    <div
      className={`bg-white rounded-xl border border-[var(--color-border)] p-6 shadow-sm hover:shadow-md transition-shadow ${style}`}
      role="article"
      aria-label={`Métricas do ${label}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl">{icon}</div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)]">
              {label}
            </h3>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Active Bots Count */}
        <div>
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Bots Ativos</p>
          <p className="text-4xl font-bold text-[var(--color-text-main)]">
            {activeCount.toLocaleString('pt-BR')}
          </p>
        </div>

        {/* Usage Count */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">
            {botType === 'PROMOCOES' && 'Promoções Geradas (30d)'}
            {botType === 'DOWNLOAD' && 'Downloads (30d)'}
            {botType === 'PINTEREST' && 'Pins Criados (30d)'}
            {botType === 'SUGGESTION' && 'Sugestões Geradas (30d)'}
          </p>
          <p className="text-2xl font-semibold text-[var(--color-primary)]">
            {usageCount.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
}
