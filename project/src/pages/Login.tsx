import { useState } from 'react';
import { KeyRound, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (token.length !== 20) {
      setError('O token deve conter exatamente 20 caracteres');
      return;
    }

    setIsLoading(true);
    const success = await login(token);
    setIsLoading(false);

    if (!success) {
      setError('Token inválido ou inativo');
      setToken('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-slate-900 p-4 rounded-full mb-4">
              <KeyRound className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Portal CNAB</h1>
            <p className="text-slate-600 mt-2">Insira seu token de acesso</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-slate-700 mb-2">
                Token de Acesso
              </label>
              <input
                type="text"
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                maxLength={20}
                placeholder="Digite seu token de 20 caracteres"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-mono tracking-wider"
                disabled={isLoading}
                autoComplete="off"
              />
              <p className="text-xs text-slate-500 mt-1">
                {token.length}/20 caracteres
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || token.length !== 20}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                'Validando...'
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Acessar Portal
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            <p>Token de teste: ABC123DEF456GHI789JK</p>
          </div>
        </div>
      </div>
    </div>
  );
}
