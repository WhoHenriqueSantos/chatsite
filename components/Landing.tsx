
import React, { useState } from 'react';

interface LandingProps {
  onJoin: (name: string) => void;
  onLogin: (name: string, pass: string) => Promise<boolean>;
  // Adicionada prop para mudar para a tela de login de admin
  onAdminClick?: () => void;
}

const Landing: React.FC<LandingProps> = ({ onJoin, onLogin, onAdminClick }) => {
  const [mode, setMode] = useState<'request' | 'login'>('request');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (mode === 'request') {
      onJoin(name.trim());
    } else {
      const success = await onLogin(name.trim(), password);
      if (!success) {
        setError('Nome ou senha incorretos.');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-indigo-50/50 to-white/50 relative">
      <div className="max-w-md w-full">
        <h2 className="text-4xl font-extrabold text-slate-800 mb-2 tracking-tight">SecureChat</h2>
        <p className="text-slate-500 mb-8">Conecte-se com segurança e simplicidade.</p>
        
        <div className="flex bg-slate-200/50 p-1 rounded-xl mb-8 border border-slate-200">
            <button 
                onClick={() => setMode('request')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'request' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Pedir Acesso
            </button>
            <button 
                onClick={() => setMode('login')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Já sou cadastrado
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome de usuário..."
              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              required
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
              <i className="fas fa-user"></i>
            </div>
          </div>

          {mode === 'login' && (
            <div className="relative animate-in slide-in-from-top-2 duration-300">
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha..."
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                    <i className="fas fa-key"></i>
                </div>
            </div>
          )}
          
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
          
          <button
            type="submit"
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transform transition-all active:scale-95 flex items-center justify-center gap-2 group"
          >
            {mode === 'request' ? 'Enviar Solicitação' : 'Entrar Agora'}
            <i className="fas fa-chevron-right group-hover:translate-x-1 transition-transform"></i>
          </button>
        </form>

        <button 
          onClick={onAdminClick}
          className="mt-8 text-xs font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase tracking-widest"
        >
          Acesso Moderador
        </button>
      </div>
    </div>
  );
};

export default Landing;
