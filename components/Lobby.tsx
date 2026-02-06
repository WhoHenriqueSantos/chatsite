
import React, { useState } from 'react';
import { Room } from '../types';

interface LobbyProps {
  rooms: Room[];
  onEnter: (room: Room) => void;
  onCreateRoom: (name: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({ rooms, onEnter, onCreateRoom }) => {
  const [showForm, setShowForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      onCreateRoom(newRoomName);
      setNewRoomName('');
      setShowForm(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col gap-4 mb-8">
            <div className="flex justify-between items-center">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800">Canais Disponíveis</h2>
                {!showForm && (
                    <button 
                        onClick={() => setShowForm(true)}
                        className="p-2 md:px-4 md:py-2 bg-indigo-600 text-white rounded-xl text-xs md:text-sm font-bold shadow-lg"
                    >
                        <i className="fas fa-plus mr-1 md:mr-2"></i> 
                        <span className="hidden md:inline">Nova Sala</span>
                    </button>
                )}
            </div>
            
            {showForm && (
                <form onSubmit={handleSubmit} className="flex gap-2 animate-in slide-in-from-top-2">
                    <input 
                        autoFocus
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        placeholder="Nome da sala..."
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none bg-white"
                    />
                    <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold">OK</button>
                    <button onClick={() => setShowForm(false)} className="text-slate-400 p-2"><i className="fas fa-times"></i></button>
                </form>
            )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {rooms.map(room => (
            <button
                key={room.sal_id}
                onClick={() => onEnter(room)}
                className="p-4 md:p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-300 transition-all text-left flex items-center justify-between group"
            >
                <div className="flex items-center gap-3 md:gap-4">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${room.sal_is_locked ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        <i className={`fas ${room.sal_is_locked ? 'fa-lock' : 'fa-hashtag'}`}></i>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 text-sm md:text-base">{room.sal_nome}</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Entrar agora</p>
                    </div>
                </div>
                <i className="fas fa-chevron-right text-slate-300 group-hover:translate-x-1 transition-transform"></i>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
