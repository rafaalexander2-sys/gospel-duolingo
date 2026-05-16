import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured = !!(url && key);

export const supabase = supabaseConfigured
  ? createClient(url, key)
  : createClient("https://placeholder.supabase.co", "placeholder-anon-key");

export type Database = {
  public: {
    Tables: {
      perfis: {
        Row: Perfil;
        Insert: Omit<Perfil, "criado_em">;
        Update: Partial<Omit<Perfil, "id" | "criado_em">>;
      };
      progresso: {
        Row: Progresso;
        Insert: Omit<Progresso, "id" | "atualizado_em">;
        Update: Partial<Omit<Progresso, "id">>;
      };
    };
  };
};

export interface Perfil {
  id: string;
  nome: string;
  email: string;
  personagem_tipo: "peregrino" | "profeta" | "guerreiro" | "sabia";
  personagem_cor: string;
  xp: number;
  talentos: number;
  sequencia: number;
  sequencia_max: number;
  sequencia_ultimo_dia: string | null;
  vidas: number;
  vidas_ultima_recarga: string;
  armadura: ArmaduraPecas;
  criado_em: string;
}

export interface ArmaduraPecas {
  calcados?: boolean;
  cinto?: boolean;
  escudo?: boolean;
  espada?: boolean;
  capacete?: boolean;
  couraca?: boolean;
}

export interface Progresso {
  id: string;
  user_id: string;
  trilha: "VT" | "NT" | "JESUS";
  capitulo_id: string;
  completo: boolean;
  pontuacao: number;
  tentativas: number;
  atualizado_em: string;
}
