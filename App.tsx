
import React, { useState, useEffect } from 'react';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ViewState, User, Message, Room } from './types';
import Landing from './components/Landing';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import ChatRoom from './components/ChatRoom';
import WaitingRoom from './components/WaitingRoom';
import Lobby from './components/Lobby';

const supabaseUrl = 'https://tzlksuzoeqaxmvbkxrus.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6bGtzdXpvZXFheG12Ymt4cnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDAxMDIsImV4cCI6MjA4NTk3NjEwMn0.ZxU4du2z2DF6lNeHKf1ln8-FvTaSRHq0kL7LGFvoX2Y';
const supabase = createClient(supabaseUrl, supabaseKey);

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  useEffect(() => {
    fetchRooms();
    
    // Canal global para monitorar aprovações de acesso e mudanças nas salas
    const globalSub = supabase.channel('app-global-events')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'mensagens'
      }, (payload: any) => {
        const newMessage = payload.new;
        // Filtramos no cliente para garantir que pegamos mensagens de sistema (sala 000...)
        if (newMessage.msg_sala_id === '00000000-0000-0000-0000-000000000000') {
          const text = newMessage.msg_texto;
          if (text.startsWith('ACESSO_APROVADO:') && currentUser && !currentUser.usr_is_admin) {
            const approvedName = text.split(':')[1];
            if (approvedName === currentUser.usr_username) {
              setView('lobby');
            }
          }
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'salas' 
      }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(globalSub);
    };
  }, [currentUser]);

  const fetchRooms = async () => {
    const { data } = await supabase.from('salas').select('*').order('sal_nome');
    if (data) setRooms(data);
  };

  const handleCreateRoom = async (name: string) => {
    if (!name.trim()) return;
    const { error } = await supabase.from('salas').insert([{
      sal_nome: name.trim(),
      sal_is_locked: false,
      sal_created_at: new Date().toISOString(),
      sal_created_by: currentUser?.usr_username || 'Sistema'
    }]);

    if (error) {
      console.error("Erro ao criar sala:", error);
      alert("Não foi possível criar a sala. Talvez o nome já exista.");
    }
  };

  const handleJoinRequest = async (name: string) => {
    const { data: userDb } = await supabase.from('usuarios').select('*').eq('usr_username', name).single();
    if (userDb?.usr_is_banned) return alert("Este nome está banido do sistema.");

    const newUser: User = { 
      usr_id: Math.random().toString(36).substr(2, 9), 
      usr_username: name, 
      usr_is_admin: false, 
      usr_is_banned: false,
      role: 'guest' 
    };
    setCurrentUser(newUser);
    setView('waiting');
    
    await supabase.from('mensagens').insert([{
      msg_sala_id: '00000000-0000-0000-0000-000000000000',
      msg_sender_nome: 'Sistema',
      msg_sender_tipo: 'admin',
      msg_texto: `SOLICITACAO_ACESSO:${name}`,
      msg_created_at: new Date().toISOString()
    }]);
  };

  const handleReservedLogin = async (name: string, pass: string): Promise<boolean> => {
    const { data: user } = await supabase.from('usuarios')
      .select('*')
      .eq('usr_username', name)
      .eq('usr_password_hash', pass)
      .single();

    if (user) {
      if (user.usr_is_banned) {
        alert("Sua conta está banida.");
        return false;
      }
      const newUser: User = { 
        usr_id: user.usr_id, 
        usr_username: user.usr_username, 
        usr_is_admin: user.usr_is_admin, 
        usr_is_banned: user.usr_is_banned,
        role: user.usr_is_admin ? 'admin' : 'registered' 
      };
      setCurrentUser(newUser);
      setView(user.usr_is_admin ? 'admin-dashboard' : 'lobby');
      return true;
    }
    return false;
  };

  const handleAdminLogin = (success: boolean) => {
    if (success) {
      const admin: User = { 
        usr_id: 'admin-host', 
        usr_username: 'admin', 
        usr_is_admin: true, 
        usr_is_banned: false,
        role: 'admin' 
      };
      setCurrentUser(admin);
      setView('admin-dashboard');
    }
  };

  const enterRoom = async (room: Room) => {
    if (currentUser) {
      const { data: block } = await supabase.from('salas_bloqueios')
        .select('*')
        .eq('slb_sala_id', room.sal_id)
        .eq('slb_nome', currentUser.usr_username)
        .single();
      if (block) return alert(`Você foi banido desta sala. Motivo: ${block.slb_motivo || 'Não informado'}`);
    }
    setActiveRoom(room);
    setView('chat');
  };

  const addMessage = async (text: string) => {
    if (!currentUser || !activeRoom) return;
    const { data: roomData } = await supabase.from('salas').select('sal_is_locked').eq('sal_id', activeRoom.sal_id).single();
    if (roomData?.sal_is_locked && !currentUser.usr_is_admin) {
      alert("A sala foi trancada por um administrador.");
      return;
    }
    
    await supabase.from('mensagens').insert([{
      msg_sala_id: activeRoom.sal_id,
      msg_sender_nome: currentUser.usr_username,
      msg_sender_tipo: currentUser.role,
      msg_texto: text,
      msg_created_at: new Date().toISOString()
    }]);
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveRoom(null);
    setView('landing');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 transition-all duration-300">
      <div className="w-full max-w-5xl h-[90vh] glass-effect rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/50">
        
        <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-shield-halved text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">SecureChat Pro</h1>
              <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Painel de Controle</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {currentUser && (
               <div className="flex items-center gap-2 md:gap-4">
                  {currentUser.usr_is_admin && (
                    <button 
                      onClick={() => setView(view === 'admin-dashboard' ? 'lobby' : 'admin-dashboard')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'admin-dashboard' ? 'bg-slate-800 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                    >
                      <i className={`fas ${view === 'admin-dashboard' ? 'fa-comments' : 'fa-cog'}`}></i>
                      {view === 'admin-dashboard' ? 'Ver Chat' : 'Painel Admin'}
                    </button>
                  )}
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-slate-700">{currentUser.usr_username}</p>
                    <p className="text-[9px] uppercase text-slate-400">{currentUser.role}</p>
                  </div>
                  <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <i className="fas fa-sign-out-alt text-lg"></i>
                  </button>
               </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex relative">
          {view === 'landing' && <Landing onJoin={handleJoinRequest} onLogin={handleReservedLogin} onAdminClick={() => setView('admin-login')} />}
          {view === 'admin-login' && <AdminLogin onLogin={handleAdminLogin} />}
          {view === 'waiting' && <WaitingRoom user={currentUser} pendingList={[]} setView={setView} />}
          {view === 'lobby' && <Lobby rooms={rooms} onEnter={enterRoom} onCreateRoom={handleCreateRoom} />}
          {view === 'admin-dashboard' && (
            <AdminDashboard 
              onOpenChat={() => setView('lobby')}
              supabase={supabase}
              onCreateRoom={handleCreateRoom}
            />
          )}
          {view === 'chat' && activeRoom && (
            <ChatRoom 
              room={activeRoom}
              onSendMessage={addMessage} 
              currentUser={currentUser}
              onBack={() => setView('lobby')}
              supabase={supabase}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
