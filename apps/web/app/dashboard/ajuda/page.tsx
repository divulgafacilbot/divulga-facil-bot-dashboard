'use client';

export default function AjudaPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-[var(--color-text-main)] mb-6">Central de Ajuda</h1>

      {/* Geral */}
      <section className="bg-white border border-[var(--color-border)] rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text-main)] mb-4">Perguntas Gerais</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              O que é o Divulga Fácil?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              O Divulga Fácil é uma plataforma completa de automação de marketing via Telegram.
              Oferecemos 4 bots especializados para ajudar você a criar conteúdo, gerenciar downloads,
              promover produtos e receber sugestões personalizadas.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              Como funciona a vinculação de bots?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              Para vincular qualquer bot à sua conta:
            </p>
            <ol className="list-decimal list-inside text-[var(--color-text-secondary)] ml-4 mt-2 space-y-1">
              <li>Acesse a página "Meus Bots" no dashboard</li>
              <li>Clique em "Gerar Token" no bot desejado</li>
              <li>Copie o código de 10 caracteres que aparece</li>
              <li>Abra o Telegram e inicie uma conversa com o bot</li>
              <li>Envie o comando: /codigo SEUTOKEN</li>
              <li>O bot confirmará a vinculação e estará pronto para uso</li>
            </ol>
            <p className="text-[var(--color-text-secondary)] mt-2">
              <strong>Atenção:</strong> O token expira em 10 minutos. Se expirar, gere um novo token.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              Posso usar todos os bots ao mesmo tempo?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              Sim! Você pode vincular e utilizar todos os 4 bots simultaneamente, de acordo com as necessidades do seu negócio.
            </p>
          </div>
        </div>
      </section>

      {/* Bot de Promoções */}
      <section className="bg-white border border-[var(--color-border)] rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text-main)] mb-4">🎨 Bot de Promoções</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              O que faz o Bot de Promoções?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              O Bot de Promoções (@DivulgaFacilArtesBot) permite criar designs profissionais automaticamente
              para suas campanhas de marketing, posts em redes sociais e materiais promocionais.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              Como usar o Bot de Promoções?
            </h3>
            <ol className="list-decimal list-inside text-[var(--color-text-secondary)] ml-4 space-y-1">
              <li>Vincule o bot à sua conta usando o token gerado no dashboard</li>
              <li>Configure seus templates de design no painel de controle</li>
              <li>No Telegram, envie suas especificações (texto, cores, estilo)</li>
              <li>O bot gerará a arte automaticamente e enviará o resultado</li>
              <li>Baixe e use em suas campanhas!</li>
            </ol>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              Quais formatos de arte são suportados?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              O bot gera artes nos formatos PNG e JPG, otimizados para redes sociais
              (Instagram, Facebook, Twitter, etc.) e materiais impressos.
            </p>
          </div>
        </div>
      </section>

      {/* Bot de Download */}
      <section className="bg-white border border-[var(--color-border)] rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text-main)] mb-4">📥 Bot de Download</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              O que faz o Bot de Download?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              O Bot de Download (@DivulgaFacilDownloadBot) facilita o download de vídeos, imagens e
              conteúdos de diversas plataformas sociais para reaproveitamento em suas campanhas.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              Como usar o Bot de Download?
            </h3>
            <ol className="list-decimal list-inside text-[var(--color-text-secondary)] ml-4 space-y-1">
              <li>Vincule o bot à sua conta usando o token gerado</li>
              <li>Copie o link do conteúdo que deseja baixar</li>
              <li>No Telegram, envie o link para o bot</li>
              <li>O bot processará e enviará o arquivo para download</li>
            </ol>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              Quais plataformas são suportadas?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              O bot suporta downloads de: Instagram, TikTok, YouTube, Twitter, Facebook e outras
              plataformas populares. Sempre respeitando os direitos autorais e termos de uso.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              Há limite de downloads?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              Os limites de download dependem do seu plano de assinatura. Consulte a página
              "Assinatura" no dashboard para ver seus limites atuais.
            </p>
          </div>
        </div>
      </section>

      {/* Bot de Pinterest */}
      <section className="bg-white border border-[var(--color-border)] rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text-main)] mb-4">📌 Bot de Pins</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              O que faz o Bot de Pins?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              O Bot de Pins (@DivulgaFacilPinterestBot) automatiza a criação de cards visuais
              para produtos de afiliados, criando uma página pública estilo Pinterest com seus produtos.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              Como usar o Bot de Pins?
            </h3>
            <ol className="list-decimal list-inside text-[var(--color-text-secondary)] ml-4 space-y-1">
              <li>Vincule o bot à sua conta</li>
              <li>Configure a aparência da sua página pública (cores, bio, nome)</li>
              <li>Adicione cards manualmente ou deixe o bot criar automaticamente</li>
              <li>Compartilhe o link da sua página pública com seus clientes</li>
            </ol>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              O que é a Página Pública?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              A Página Pública é sua vitrine de produtos. Ela exibe todos os seus cards de forma
              visual e atrativa, com links diretos para os produtos. Você pode personalizá-la com
              suas cores e informações de marca.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              Como criar cards manualmente?
            </h3>
            <ol className="list-decimal list-inside text-[var(--color-text-secondary)] ml-4 space-y-1">
              <li>Acesse "Página Pública" no dashboard</li>
              <li>Clique em "+ Adicionar Card"</li>
              <li>Preencha: título, preço, descrição, link do produto</li>
              <li>Faça upload da imagem do produto</li>
              <li>Clique em "Salvar Card"</li>
            </ol>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              O bot cria cards automaticamente?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              Sim! Depois de vincular o bot, ele pode criar cards automaticamente a partir de
              links de produtos que você enviar no Telegram. O bot extrai informações do produto
              e cria o card na sua página pública.
            </p>
          </div>
        </div>
      </section>

      {/* Bot de Sugestões */}
      <section className="bg-white border border-[var(--color-border)] rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text-main)] mb-4">💡 Bot de Sugestões</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              O que faz o Bot de Sugestões?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              O Bot de Sugestões (@DivulgaFacilSugestaoBot) oferece recomendações personalizadas
              de produtos, conteúdos e estratégias de marketing baseadas no seu perfil e histórico.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              Como usar o Bot de Sugestões?
            </h3>
            <ol className="list-decimal list-inside text-[var(--color-text-secondary)] ml-4 space-y-1">
              <li>Vincule o bot à sua conta</li>
              <li>Configure suas preferências no dashboard (nicho, público-alvo, interesses)</li>
              <li>No Telegram, converse com o bot sobre suas necessidades</li>
              <li>Receba sugestões personalizadas de produtos, conteúdos e estratégias</li>
            </ol>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              Que tipo de sugestões o bot oferece?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              O bot pode sugerir:
            </p>
            <ul className="list-disc list-inside text-[var(--color-text-secondary)] ml-4 mt-2 space-y-1">
              <li>Produtos de afiliados relevantes para seu nicho</li>
              <li>Ideias de conteúdo para redes sociais</li>
              <li>Estratégias de divulgação e marketing</li>
              <li>Tendências do mercado</li>
              <li>Oportunidades de conversão</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              As sugestões são personalizadas?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              Sim! O bot aprende com suas preferências, histórico de atividades e resultados
              para oferecer sugestões cada vez mais relevantes e alinhadas com seus objetivos.
            </p>
          </div>
        </div>
      </section>

      {/* Assinatura e Limites */}
      <section className="bg-white border border-[var(--color-border)] rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text-main)] mb-4">💳 Assinatura e Limites</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              Quais são os planos disponíveis?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              Oferecemos planos Básico, Profissional e Empresarial. Cada plano tem limites
              diferentes de uso dos bots. Consulte a página "Assinatura" para detalhes completos.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              Como acompanho meu uso?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              No dashboard principal (Visão Geral), você pode ver métricas de uso de cada bot,
              incluindo artes geradas, downloads realizados, visualizações da página pública e muito mais.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              O que acontece se eu atingir o limite?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              Quando atingir o limite do seu plano, os bots notificarão você e sugerirão um upgrade.
              Você pode fazer upgrade a qualquer momento na página "Assinatura".
            </p>
          </div>
        </div>
      </section>

      {/* Suporte */}
      <section className="bg-white border border-[var(--color-border)] rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text-main)] mb-4">🆘 Suporte</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              Como entrar em contato com o suporte?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              Você pode abrir um ticket de suporte diretamente no dashboard ou enviar um email
              para suporte@divulgafacil.com. Nossa equipe responde em até 24 horas.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
              Encontrei um bug. O que faço?
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              Abra um ticket de suporte com categoria "Técnico" e descreva o problema em detalhes.
              Se possível, inclua prints e passos para reproduzir o erro.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
