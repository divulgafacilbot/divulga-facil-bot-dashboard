/**
 * Campaign Card Component
 * Displays a single campaign with preview, details, and actions
 */

interface CampaignCardProps {
  campaign: {
    id: string;
    name: string;
    price: number;
    product_url: string;
    main_video_url: string;
    created_at: string;
    asset_count?: number;
  };
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
}

export default function CampaignCard({ campaign, onDelete, onDownload }: CampaignCardProps) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  const mainVideoUrl = campaign.main_video_url.startsWith('http')
    ? campaign.main_video_url
    : `${apiBaseUrl}${campaign.main_video_url}`;

  return (
    <div className="w-[480px] bg-white rounded-xl border border-[var(--color-border)] p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="grid gap-6 grid-cols-[1.1fr_0.9fr]">
        <div className="flex h-full flex-col">
          <div className="flex flex-col gap-2 mb-4">
            <h3 className="text-lg font-semibold text-[var(--color-text-main)]">
              {campaign.name}
            </h3>
            <p className="text-lg font-bold text-[var(--color-primary)]">
              R$ {campaign.price.toFixed(2)}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Criado em {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex flex-col gap-1 text-sm text-[var(--color-text-secondary)]">
              <span className="font-medium">URL do Produto:</span>
              <a
                href={campaign.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-secondary)] hover:underline break-all"
              >
                {campaign.product_url}
              </a>
            </div>
            {campaign.asset_count !== undefined && (
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <span className="font-medium">Artes anexadas:</span>
                <span>{campaign.asset_count} </span>
              </div>
            )}
          </div>

          <div className="mt-auto flex gap-3 pt-4 border-t border-[var(--color-border)]">
            <button
              onClick={() => onDownload(campaign.id)}
              className="flex-1 rounded-xl bg-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
            >
              Download ZIP
            </button>
            <button
              id="excluir-campanha"
              onClick={() => onDelete(campaign.id)}
              className="rounded-xl border-2 border-red-500 px-4 py-2 text-sm font-semibold text-red-500 transition-all hover:bg-red-50"
            >
              Excluir
            </button>
          </div>
        </div>

        <div>
          <video
            src={mainVideoUrl}
            controls
            preload="metadata"
            className="w-full rounded-xl border border-[var(--color-border)] bg-black"
          />
        </div>
      </div>
    </div>
  );
}
