/**
 * Centralized UI copy/strings
 * All user-facing text is defined here for consistency and i18n-readiness
 */

export const COPY = {
  dashboard: {
    welcome: {
      title: 'Visão geral',
      subtitle: 'Acompanhe suas métricas e gerencie seus bots',
    },
    stats: {
      activeBots: {
        arts: 'Bots de promoções ativos',
        download: 'Bots de download ativos',
        pinterest: 'Bots de Pinterest ativos',
        suggestion: 'Bots de sugestão ativos',
      },
      emptyState: {
        arts: 'Nenhum bot de promoções configurado ainda',
        download: 'Nenhum bot de download configurado ainda',
        pinterest: 'Nenhum bot de Pinterest configurado ainda',
        suggestion: 'Nenhum bot de sugestão configurado ainda',
      },
      artsGenerated: 'Promoções geradas',
      downloads: 'Quantidade de downloads',
      thisMonth: 'Neste mês',
      profileViews: 'Visualizações do perfil',
      cardViews: 'Visualizações de cards',
      cardClicks: 'Cliques em cards',
      ctr: 'Taxa de cliques (CTR)',
    },
    quickActions: {
      title: 'Primeiros passos',
      subtitle: 'Configure sua conta para começar a usar o bot',
      createBot: 'Criar primeiro bot',
      createBotDesc: 'Configure um bot para começar a publicar',
      customizeTemplates: 'Personalizar templates',
      customizeTemplatesDesc: 'Ajuste os templates de publicação',
    },
    nav: {
      home: 'Visão geral',
      bots: 'Meus bots',
      templates: 'Editar templates',
      promotional: 'Material promocional',
      billing: 'Pagamentos',
      support: 'FAQ e Suporte',
      settings: 'Configurações',
      publicPage: 'Página pública',
    },
  },
  auth: {
    login: {
      title: 'Vamos configurar seus templates',
      subtitle: 'Entre com seu e-mail e senha para personalizar suas artes e publicar.',
      emailLabel: 'E-mail',
      passwordLabel: 'Senha',
      rememberMe: 'Lembrar de mim (60 dias)',
      forgotPassword: 'Esqueci minha senha',
      submit: 'Entrar',
      noAccount: 'Não tem conta?',
      createAccount: 'Criar uma conta',
    },
    register: {
      title: 'Criar conta',
      subtitle: 'Preencha os dados para criar sua conta',
      submit: 'Criar conta',
      hasAccount: 'Já tem conta?',
      login: 'Fazer login',
    },
    errors: {
      emailNotVerified: 'E-mail não verificado. Verifique sua caixa de entrada ou solicite um novo link.',
      invalidCredentials: 'Email ou senha incorretos.',
      generic: 'Erro ao processar solicitação. Tente novamente.',
    },
  },
  errors: {
    loadingUser: 'Não foi possível carregar seus dados.',
    tryAgain: 'Tente novamente ou refaça o login.',
    goToLogin: 'Ir para o login',
    generic: 'Algo deu errado',
    unexpected: 'Erro inesperado',
    retry: 'Tentar novamente',
  },
  common: {
    loading: 'Carregando...',
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    edit: 'Editar',
    close: 'Fechar',
    confirm: 'Confirmar',
    back: 'Voltar',
  },
} as const;

export type Copy = typeof COPY;
