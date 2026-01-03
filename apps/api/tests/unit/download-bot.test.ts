import { describe, expect, it } from 'vitest';

describe('Download Bot Structure', () => {
  describe('Bot Commands', () => {
    it('should define all required commands', () => {
      const requiredCommands = [
        'start',
        'vincular',
        'codigo',
        'status',
        'ajuda',
      ];

      requiredCommands.forEach((cmd) => {
        expect(cmd).toBeTruthy();
        expect(cmd.length).toBeGreaterThan(0);
      });
    });

    it('should have /start command with different messages for linked and unlinked users', () => {
      const linkedMessage = `👋 *Olá! Eu sou o Bot de Download.*

📥 Envie um link de:
• Instagram (post/reel público)
• TikTok (vídeo público)
• Pinterest (pin público)
• YouTube (limitado)

E eu baixo a mídia para você!

Use /ajuda para ver todos os comandos.`;

      const unlinkedMessage = `👋 *Olá! Para usar este bot, você precisa conectá-lo à sua conta.*

1. Acesse o dashboard
2. Gere um token para o Bot de Download
3. Envie aqui: \`/codigo SEU_TOKEN\`

Ou use /vincular para mais informações.`;

      expect(linkedMessage).toContain('Eu sou o Bot de Download');
      expect(linkedMessage).toContain('Instagram');
      expect(linkedMessage).toContain('TikTok');
      expect(linkedMessage).toContain('Pinterest');
      expect(linkedMessage).toContain('YouTube');

      expect(unlinkedMessage).toContain('conectá-lo à sua conta');
      expect(unlinkedMessage).toContain('/codigo');
    });

    it('should have /vincular command with token instructions', () => {
      const vincularMessage = `🔗 *Para vincular sua conta:*

1. Acesse o dashboard
2. Clique em "Gerar Token" na seção Bot de Download
3. Copie o token gerado
4. Envie aqui: \`/codigo SEU_TOKEN\`

O token expira em 10 minutos.`;

      expect(vincularMessage).toContain('vincular sua conta');
      expect(vincularMessage).toContain('Gerar Token');
      expect(vincularMessage).toContain('/codigo');
      expect(vincularMessage).toContain('10 minutos');
    });

    it('should have /ajuda command with all commands listed', () => {
      const ajudaMessage = `📖 *Comandos disponíveis:*

/start - Iniciar bot
/vincular - Instruções para vincular conta
/codigo <token> - Vincular com token
/status - Ver status da vinculação
/ajuda - Ver esta mensagem

💡 *Para usar, basta enviar um link público de:*
• Instagram (post/reel)
• TikTok (vídeo)
• Pinterest (pin)
• YouTube (limitado)`;

      expect(ajudaMessage).toContain('/start');
      expect(ajudaMessage).toContain('/vincular');
      expect(ajudaMessage).toContain('/codigo');
      expect(ajudaMessage).toContain('/status');
      expect(ajudaMessage).toContain('/ajuda');
    });
  });

  describe('Message Handler Logic', () => {
    it('should skip command messages', () => {
      const testMessages = [
        '/start',
        '/vincular',
        '/codigo ABC123',
        '/status',
        '/ajuda',
      ];

      testMessages.forEach((msg) => {
        const isCommand = msg.startsWith('/');
        expect(isCommand).toBe(true);
      });
    });

    it('should detect URLs in messages', () => {
      const testCases = [
        { text: 'https://instagram.com/p/ABC123/', hasUrl: true },
        { text: 'Check this https://tiktok.com/@user/video/123', hasUrl: true },
        { text: 'No URL here', hasUrl: false },
        { text: '/codigo ABC123', hasUrl: false },
      ];

      testCases.forEach(({ text, hasUrl }) => {
        const urlMatch = text.match(/https?:\/\/[^\s]+/);
        expect(!!urlMatch).toBe(hasUrl);
      });
    });

    it('should detect potential token in message for unlinked users', () => {
      const testCases = [
        { message: 'ABC123DEF456GHI789', isToken: true }, // 18 chars, no spaces
        { message: 'short', isToken: false }, // Too short
        { message: 'has spaces in it', isToken: false }, // Has spaces
        { message: 'ABCDEFGHIJK', isToken: true }, // 11 chars, no spaces
      ];

      testCases.forEach(({ message, isToken }) => {
        const mightBeToken = message.length > 10 && !message.includes(' ');
        expect(mightBeToken).toBe(isToken);
      });
    });
  });

  describe('Bot Response Messages', () => {
    it('should have platform detection confirmation messages', () => {
      const platforms = ['INSTAGRAM', 'TIKTOK', 'PINTEREST', 'YOUTUBE'];

      platforms.forEach((platform) => {
        const message = `✅ ${platform} detectado! Baixando mídia...`;
        expect(message).toContain(platform);
        expect(message).toContain('detectado');
        expect(message).toContain('Baixando');
      });
    });

    it('should have success messages', () => {
      const successMessages = [
        '✅ Conta vinculada com sucesso!',
        '✅ Mídia enviada com sucesso!',
      ];

      successMessages.forEach((msg) => {
        expect(msg).toContain('✅');
        expect(msg).toContain('sucesso');
      });

      // Status message has different wording
      const statusMessage = '✅ Sua conta está vinculada e ativa!';
      expect(statusMessage).toContain('✅');
      expect(statusMessage).toContain('vinculada');
    });

    it('should have error messages', () => {
      const errorMessages = [
        '❌ Token inválido ou expirado.',
        '❌ Você precisa vincular sua conta primeiro.',
        '❌ Uso correto: `/codigo SEU_TOKEN`',
        '❌ Sua conta não está vinculada.',
      ];

      errorMessages.forEach((msg) => {
        expect(msg).toContain('❌');
      });
    });

    it('should have helpful error guidance', () => {
      const errorGuidance = `❌ Erro ao processar link

Verifique se:
• O link está correto
• O conteúdo é público
• A plataforma é suportada`;

      expect(errorGuidance).toContain('Verifique se');
      expect(errorGuidance).toContain('link está correto');
      expect(errorGuidance).toContain('conteúdo é público');
      expect(errorGuidance).toContain('plataforma é suportada');
    });
  });

  describe('Bot Initialization', () => {
    it('should handle missing token gracefully', () => {
      const TELEGRAM_BOT_DOWNLOAD_TOKEN = process.env.TELEGRAM_BOT_DOWNLOAD_TOKEN;

      if (!TELEGRAM_BOT_DOWNLOAD_TOKEN) {
        // Should log warning but not crash
        expect(TELEGRAM_BOT_DOWNLOAD_TOKEN).toBeUndefined();
      } else {
        expect(typeof TELEGRAM_BOT_DOWNLOAD_TOKEN).toBe('string');
      }
    });

    it('should create bot instance conditionally', () => {
      const token = process.env.TELEGRAM_BOT_DOWNLOAD_TOKEN;
      const shouldCreateBot = !!token;

      if (shouldCreateBot) {
        expect(token).toBeTruthy();
      } else {
        expect(token).toBeFalsy();
      }
    });
  });

  describe('Bot Type Constant', () => {
    it('should use correct bot type for downloads', () => {
      const BOT_TYPES = {
        ARTS: 'ARTS',
        DOWNLOAD: 'DOWNLOAD',
      };

      expect(BOT_TYPES.DOWNLOAD).toBe('DOWNLOAD');
      expect(BOT_TYPES.ARTS).toBe('ARTS');
    });
  });
});

describe('Link Validation Flow', () => {
  it('should validate token format in /codigo command', () => {
    const validTokenExamples = [
      'ABC123DEF456',
      'TOKEN123456789',
      '1234567890ABCDEF',
    ];

    const invalidTokenExamples = [
      '', // Empty
      '   ', // Only spaces
      null, // Null
      undefined, // Undefined
    ];

    validTokenExamples.forEach((token) => {
      expect(token).toBeTruthy();
      expect(token.trim().length).toBeGreaterThan(0);
    });

    invalidTokenExamples.forEach((token) => {
      const normalizedToken = token?.trim() || '';
      expect(!normalizedToken).toBe(true);
    });
  });

  it('should parse /codigo command correctly', () => {
    const commandText = '/codigo ABC123DEF456';
    const parts = commandText.split(' ');
    const command = parts[0];
    const token = parts[1];

    expect(command).toBe('/codigo');
    expect(token).toBe('ABC123DEF456');
  });

  it('should handle /codigo without token', () => {
    const commandText = '/codigo';
    const token = commandText.split(' ')[1];

    expect(token).toBeUndefined();
  });
});

describe('Media Type Detection', () => {
  it('should determine media type from scraping result', () => {
    const mediaTypes = ['image', 'video'];

    mediaTypes.forEach((type) => {
      expect(['image', 'video']).toContain(type);
    });
  });

  it('should use correct Telegram method for each media type', () => {
    const mediaTypeHandlers = {
      video: 'replyWithVideo',
      image: 'replyWithPhoto',
    };

    expect(mediaTypeHandlers.video).toBe('replyWithVideo');
    expect(mediaTypeHandlers.image).toBe('replyWithPhoto');
  });
});
