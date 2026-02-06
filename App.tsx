
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
    
    const globalSub = supabase.channel('app-global-events')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'mensagens'
      }, (payload: any) => {
        const newMessage = payload.new;
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

    if (error) alert("Erro ao criar sala. Verifique se o nome já existe.");
  };

  const handleJoinRequest = async (name: string) => {
    const { data: userDb } = await supabase.from('usuarios').select('*').eq('usr_username', name).single();
    if (userDb?.usr_is_banned) return alert("Este nome está banido.");

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
      if (block) return alert(`Você foi banido desta sala.`);
    }
    setActiveRoom(room);
    setView('chat');
  };

  const addMessage = async (text: string) => {
    if (!currentUser || !activeRoom) return;
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
    <div className="min-h-screen bg-slate-900 md:bg-slate-100 flex items-center justify-center md:p-4">
      <div className="w-full h-screen md:h-[90vh] md:max-w-5xl bg-white md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header Responsivo */}
        <header className="px-4 py-3 md:px-6 md:py-4 flex items-center justify-between border-b border-slate-200 bg-white z-30">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-comment-dots text-sm md:text-xl"></i>
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm md:text-xl font-bold text-slate-800 leading-none">SecureChat</h1>
              <span className="text-[8px] md:text-[10px] text-indigo-500 font-bold uppercase tracking-widest">v2.0 Beta</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {currentUser && (
               <div className="flex items-center gap-2 md:gap-4">
                  {currentUser.usr_is_admin && view !== 'admin-dashboard' && (
                    <button 
                      onClick={() => setView('admin-dashboard')}
                      className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all"
                    >
                      <i className="fas fa-cog"></i>
                    </button>
                  )}
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-slate-700">{currentUser.usr_username}</p>
                    <p className="text-[9px] uppercase text-slate-400">{currentUser.role}</p>
                  </div>
                  <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <i className="fas fa-sign-out-alt"></i>
                  </button>
               </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative flex bg-slate-50">
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
