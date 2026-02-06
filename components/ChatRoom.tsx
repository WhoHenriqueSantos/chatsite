
import React, { useState, useRef, useEffect } from 'react';
import { Message, User, Room } from '../types';
import { GoogleGenAI } from "@google/genai";

interface ChatRoomProps {
  room: Room;
  onSendMessage: (text: string) => void;
  currentUser: User | null;
  onBack: () => void;
  supabase: any;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ room, onSendMessage, currentUser, onBack, supabase }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLive, setIsLive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUser?.usr_is_admin;

  const fetchMessages = async () => {
    const { data } = await supabase.from('mensagens')
      .select('*')
      .eq('msg_sala_id', room.sal_id)
      .order('msg_created_at', { ascending: true });
    if (data) setMessages(data);
  };

  useEffect(() => {
    fetchMessages();
    
    // Subscrição robusta para Realtime
    const channel = supabase.channel(`room_${room.sal_id.substring(0, 8)}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'mensagens' 
      }, (payload: any) => {
        // Se for uma nova mensagem nesta sala, adiciona ao estado
        if (payload.event === 'INSERT' && payload.new.msg_sala_id === room.sal_id) {
          setMessages(prev => {
            if (prev.some(m => m.msg_id === payload.new.msg_id)) return prev;
            return [...prev, payload.new];
          });
        }
        // Se deletar, refetch completo
        if (payload.event === 'DELETE') {
          fetchMessages();
        }
      })
      .subscribe((status: string) => setIsLive(status === 'SUBSCRIBED'));

    return () => { supabase.removeChannel(channel); };
  }, [room.sal_id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
    // No mobile, mantém o foco no input após enviar
    if (window.innerWidth < 768) {
        inputRef.current?.focus();
    }
  };

  const summarizeRoom = async () => {
    if (messages.length === 0) return;
    const historyText = messages.slice(-20).map(m => `${m.msg_sender_nome}: ${m.msg_texto}`).join('\n');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Resuma o chat:\n\n${historyText}`,
      config: { systemInstruction: "Resumo curto em PT-BR." }
    });
    alert("🤖 Resumo IA:\n" + response.text);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 h-full">
      {/* Barra de título da sala */}
      <div className="px-4 py-2 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400">
            <i className="fas fa-chevron-left"></i>
          </button>
          <div>
            <h2 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
              #{room.sal_nome}
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
            </h2>
          </div>
        </div>
        {isAdmin && (
            <button onClick={summarizeRoom} className="p-2 text-indigo-500">
                <i className="fas fa-robot"></i>
            </button>
        )}
      </div>

      {/* Área de mensagens */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.msg_sender_nome === currentUser?.usr_username;
          return (
            <div key={msg.msg_id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
              }`}>
                {!isMe && <p className="text-[10px] font-bold opacity-70 mb-1 uppercase tracking-tighter">{msg.msg_sender_nome}</p>}
                <p className="leading-relaxed">{msg.msg_texto}</p>
                <p className={`text-[8px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {new Date(msg.msg_created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input de mensagem otimizado para mobile */}
      <div className="p-3 md:p-4 bg-white border-t border-slate-200 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Mensagem..."
            className="flex-1 px-4 py-3 bg-slate-100 rounded-full border-none outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 shadow-lg active:scale-90 transition-all"
          >
            <i className="fas fa-paper-plane text-sm md:text-base"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatRoom;
