
import React, { useEffect } from 'react';
import { User, ViewState } from '../types';

interface WaitingRoomProps {
  user: User | null;
  pendingList: User[];
  setView: (view: ViewState) => void;
}

const WaitingRoom: React.FC<WaitingRoomProps> = ({ user, pendingList, setView }) => {
  useEffect(() => {
    // Basic polling mechanism check: if user is approved (not in pending list but exists), navigate
    const interval = setInterval(() => {
       // In a real app, we'd check a server. Here we rely on the parent state.
       // Actually, the parent App component handles the setView('chat') when approval happens.
    }, 1000);
    return () => clearInterval(interval);
  }, [user, pendingList, setView]);

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-indigo-50/30">
      <div className="text-center max-w-sm">
        <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <i className="fas fa-hourglass-half text-2xl text-indigo-400"></i>
            </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Aguardando Aprovação</h2>
        <p className="text-slate-500 mb-6">
            {/* Fixed: Access usr_username instead of name */}
            Olá, <span className="font-bold text-indigo-600">{user?.usr_username}</span>! O anfitrião recebeu sua solicitação e irá te aprovar em breve.
        </p>
        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Por favor, não feche esta aba</p>
      </div>
    </div>
  );
};

export default WaitingRoom;
