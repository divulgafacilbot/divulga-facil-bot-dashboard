/**
 * Campaign Card Component (User Dashboard)
 * Displays a campaign card for users to download promotional materials
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
  onDownload: (id: string) => void;
}

export default function CampaignCard({ campaign, onDownload }: CampaignCardProps) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  const mainVideoUrl = campaign.main_video_url.startsWith('http')
    ? campaign.main_video_url
    : `${apiBaseUrl}${campaign.main_video_url}`;

  return (
    <div className="w-[480px] bg-white rounded-xl border border-[var(--color-border)] p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="grid gap-6 grid-cols-[1.1fr_0.9fr]">
        <div className="flex h-full flex-col">
          <div className="flex flex-col mb-4">
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-0">
              {campaign.name}
            </h3>
            <p className="text-lg font-bold text-[var(--color-primary)] mb-0">
              R$ {campaign.price.toFixed(2)}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Criado em {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-start flex-col gap-2 text-sm text-[var(--color-text-secondary)]">
              <span className="font-medium">URL do Produto:</span>
              <a
                href={campaign.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-secondary)] hover:underline truncate"
              >
                {campaign.product_url}
              </a>
            </div>
            {campaign.asset_count !== undefined && (
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]  ">
                <span className="font-medium">Artes anexadas:</span>
                <span>{campaign.asset_count} </span>
              </div>
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
            <button
              onClick={() => onDownload(campaign.id)}
              className="w-full rounded-xl bg-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
            >
              Download ZIP
            </button>
          </div>
        </div>

        <div data-testid="card-de-campanha-renderizado">
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
