import Image from 'next/image';

interface PublicHeaderProps {
  settings: {
    displayName: string;
    headerColor: string;
    titleColor?: string | null;
    headerImageUrl?: string | null;
    logoUrl?: string | null;
    bio?: string | null;
  };
}

export function PublicHeader({ settings }: PublicHeaderProps) {
  // URLs are already transformed on the server
  const logoSrc = settings.headerImageUrl || settings.logoUrl || '/logo-bot-bg.png';
  const isExternalImage = logoSrc.startsWith('http');
  const titleColor = settings.titleColor || '#FFFFFF';

  return (
    <header
      style={{ backgroundColor: settings.headerColor || '#ec4899' }}
      className="py-4 relative overflow-hidden sticky top-0 z-50 shadow-md"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white/20 flex-shrink-0 shadow-lg">
            {isExternalImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={`Logo de ${settings.displayName}`}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <Image
                src={logoSrc}
                alt={`Logo de ${settings.displayName}`}
                fill
                sizes="48px"
                className="object-cover"
                priority
              />
            )}
          </div>

          {/* Name and Bio */}
          <div className="flex flex-col justify-center">
            <h1
              style={{ color: titleColor }}
              className="text-xl md:text-2xl font-bold leading-tight mb-0"
            >
              {settings.displayName}
            </h1>
            {settings.bio && (
              <p
                style={{ color: titleColor, opacity: 0.9 }}
                className="text-sm max-w-2xl mt-0.5 leading-snug line-clamp-1"
              >
                {settings.bio}
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
