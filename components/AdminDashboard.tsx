
import React, { useState, useEffect } from 'react';
import { User, Room, Message } from '../types';

interface AdminDashboardProps {
  supabase: any;
  onOpenChat: () => void;
  onCreateRoom: (name: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ supabase, onOpenChat, onCreateRoom }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'rooms'>('requests');

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('admin-watch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens' }, () => fetchRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas' }, () => fetchRooms())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = () => { fetchRequests(); fetchUsers(); fetchRooms(); };
  const fetchRequests = async () => {
    const { data } = await supabase.from('mensagens').select('*').ilike('msg_texto', 'SOLICITACAO_ACESSO:%').order('msg_created_at', { ascending: false });
    if (data) setRequests(data);
  };
  const fetchUsers = async () => {
    const { data } = await supabase.from('usuarios').select('*').order('usr_username');
    if (data) setUsers(data);
  };
  const fetchRooms = async () => {
    const { data } = await supabase.from('salas').select('*').order('sal_nome');
    if (data) setRooms(data);
  };

  const approveUser = async (msgId: string, username: string) => {
    await supabase.from('mensagens').delete().eq('msg_id', msgId);
    await supabase.from('mensagens').insert([{
      msg_sala_id: '00000000-0000-0000-0000-000000000000',
      msg_sender_nome: 'Sistema',
      msg_sender_tipo: 'admin',
      msg_texto: `ACESSO_APROVADO:${username}`,
      msg_created_at: new Date().toISOString()
    }]);
    fetchRequests();
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden w-full">
      {/* Abas com Scroll Horizontal no Mobile */}
      <div className="bg-slate-50 border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="flex px-2">
          <button onClick={() => setActiveTab('requests')} className={`px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all ${activeTab === 'requests' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>
            Solicitações ({requests.length})
          </button>
          <button onClick={() => setActiveTab('users')} className={`px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all ${activeTab === 'users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>
            Usuários
          </button>
          <button onClick={() => setActiveTab('rooms')} className={`px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all ${activeTab === 'rooms' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>
            Salas
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {activeTab === 'requests' && (
          <div className="space-y-3">
            {requests.map(req => {
              const username = req.msg_texto.split(':')[1];
              return (
                <div key={req.msg_id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-800">{username}</p>
                    <p className="text-[10px] text-slate-400">Solicitado às {new Date(req.msg_created_at).toLocaleTimeString()}</p>
                  </div>
                  <button onClick={() => approveUser(req.msg_id, username)} className="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Aprovar</button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'users' && (
           <div className="overflow-x-auto">
             <table className="w-full text-left text-xs md:text-sm">
               <thead className="bg-slate-50 text-slate-400 font-bold uppercase">
                 <tr>
                   <th className="px-3 py-2">Username</th>
                   <th className="px-3 py-2">Ações</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {users.map(u => (
                   <tr key={u.usr_id}>
                     <td className="px-3 py-4 font-medium">{u.usr_username}</td>
                     <td className="px-3 py-4">
                       <button className="text-red-500 font-bold">Banir</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        )}

        {activeTab === 'rooms' && (
          <div className="grid grid-cols-1 gap-3">
            {rooms.map(room => (
              <div key={room.sal_id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700 text-sm">{room.sal_nome}</span>
                <div className="flex gap-2">
                   <button className="p-2 text-indigo-500"><i className="fas fa-file-download"></i></button>
                   <button className="p-2 text-red-500"><i className="fas fa-trash"></i></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-slate-200 shrink-0">
        <button onClick={onOpenChat} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm">Voltar ao Chat</button>
      </div>
    </div>
  );
};

export default AdminDashboard;
