import Link from 'next/link';

interface PublicFooterProps {
  displayName: string;
}

export function PublicFooter({ displayName }: PublicFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400 py-6 mt-8 relative z-40">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* About */}
          <div>
            <h3 className="text-white font-semibold mb-3">Sobre</h3>
            <p className="text-sm leading-relaxed">
              Esta é a página de ofertas de {displayName}.
              Encontre os melhores produtos e promoções selecionados especialmente para você.
            </p>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-white font-semibold mb-3">Informações</h3>
            <ul className="text-sm space-y-2">
              <li>
                Os preços e disponibilidade podem variar conforme o marketplace.
              </li>
              <li>
                Os cupons de desconto estão sujeitos a validade e condições de uso.
              </li>
              <li>
                Ao clicar nos produtos, você será redirecionado para o site oficial do vendedor.
              </li>
            </ul>
          </div>

          {/* Powered By */}
          <div>
            <h3 className="text-white font-semibold mb-3">Powered by</h3>
            <p className="text-sm">
              Divulga Fácil - Sua plataforma de divulgação de produtos.
            </p>
            <Link
              href="https://divulgafacil.shop"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-400 hover:text-pink-300 text-sm mt-2 inline-block"
            >
              Saiba mais →
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-6 pt-4 text-center text-xs">
          <p>© {currentYear} {displayName}. Todos os direitos reservados.</p>
          <p className="mt-1">
            Desenvolvido com{' '}
            <span className="text-pink-400">♥</span> por Divulga Fácil
          </p>
        </div>
      </div>
    </footer>
  );
}
