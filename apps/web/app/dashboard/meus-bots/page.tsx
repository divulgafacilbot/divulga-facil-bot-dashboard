'use client';

import { useState, useEffect } from 'react';

const BOTS = [
  { type: 'ARTS', name: 'Bot de Artes', handle: '@DivulgaFacilArtesBot', description: 'Geração automática de artes' },
  { type: 'DOWNLOAD', name: 'Bot de Download', handle: '@DivulgaFacilDownloadBot', description: 'Downloads de mídias sociais' },
  { type: 'PINTEREST', name: 'Bot de Pins', handle: '@DivulgaFacilPinterestBot', description: 'Criação automática de cards' },
  { type: 'SUGGESTION', name: 'Bot de Sugestões', handle: '@DivulgaFacilSugestaoBot', description: 'Sugestões personalizadas' }
];

interface BotToken {
  token: string;
  botName: string;
}

export default function MeusBotsPage() {
  const [linkedBots, setLinkedBots] = useState<Set<string>>(new Set());
  const [tokens, setTokens] = useState<Record<string, BotToken>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLinkedBots();
  }, []);

  const fetchLinkedBots = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/telegram/linked-bots`, {
        credentials: 'include'
      });
      const data = await res.json();
      setLinkedBots(new Set(data.bots.map((b: { botType: string }) => b.botType)));
    } catch (error) {
      console.error('Error fetching linked bots:', error);
    }
  };

  const generateToken = async (botType: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/telegram/generate-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ botType })
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.message || 'Erro ao gerar token');
        return;
      }

      const data = await res.json();
      setTokens({ ...tokens, [botType]: data.link });
    } catch (error) {
      console.error('Error generating token:', error);
      alert('Erro ao gerar token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Meus Bots</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {BOTS.map((bot) => {
          const isLinked = linkedBots.has(bot.type);
          const token = tokens[bot.type];

          return (
            <div key={bot.type} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{bot.name}</h3>
                  <p className="text-sm text-gray-600">{bot.handle}</p>
                </div>
                {isLinked && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                    ✓ Vinculado
                  </span>
                )}
              </div>

              <p className="text-gray-700 mb-4">{bot.description}</p>

              {!isLinked && !token && (
                <button
                  onClick={() => generateToken(bot.type)}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Gerando...' : 'Gerar Token'}
                </button>
              )}

              {token && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-semibold mb-2">Token gerado (válido por 10 minutos):</p>
                  <code className="block text-2xl font-mono text-center py-3 bg-white border border-gray-300 rounded mb-3">
                    {token.token}
                  </code>
                  <p className="text-xs text-gray-600 mb-2">
                    1. Abra o Telegram e acesse {bot.handle}
                  </p>
                  <p className="text-xs text-gray-600">
                    2. Envie o comando: <code className="bg-gray-100 px-2 py-1 rounded">/codigo {token.token}</code>
                  </p>
                </div>
              )}

              {isLinked && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✓ Bot vinculado com sucesso! Você já pode usá-lo no Telegram.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
