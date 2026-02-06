
export interface Message {
  msg_id: string;
  msg_sala_id: string;
  msg_sender_nome: string;
  msg_sender_tipo: 'admin' | 'guest' | 'registered';
  msg_texto: string;
  msg_created_at: string;
}

export interface User {
  usr_id: string;
  usr_username: string;
  usr_is_admin: boolean;
  usr_is_banned: boolean;
  role: 'admin' | 'guest' | 'registered'; // Mapeamento para UI
}

export interface Room {
  sal_id: string;
  sal_nome: string;
  sal_is_locked: boolean;
  sal_created_at: string;
  sal_created_by?: string;
}

export interface RoomBlock {
  slb_id: string;
  slb_sala_id: string;
  slb_nome: string;
  slb_motivo?: string;
}

export type ViewState = 'landing' | 'admin-login' | 'waiting' | 'lobby' | 'chat' | 'admin-dashboard';
