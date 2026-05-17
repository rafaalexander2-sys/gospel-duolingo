import { supabase, Perfil, ArmaduraPecas } from "./supabase";

export const VIDAS_MAX = 5;
export const VIDAS_RECARGA_MINUTOS = 30;
export const XP_QUESTAO_CERTA = 10;
export const XP_BONUS_CAPITULO_PERFEITO = 50;
export const TALENTOS_QUESTAO_CERTA = 2;
export const TALENTOS_CAPITULO_COMPLETO = 30;
export const TALENTOS_SEQUENCIA_7 = 20;
export const TALENTOS_LOGIN_DIARIO = 10;

// ── Vidas ──────────────────────────────────────────────────────────

export function calcularVidasAtuais(perfil: Perfil): number {
  if (perfil.vidas >= VIDAS_MAX) return VIDAS_MAX;
  const ultimo = new Date(perfil.vidas_ultima_recarga).getTime();
  const agora = Date.now();
  const minutos = Math.floor((agora - ultimo) / 60000);
  const recarregadas = Math.floor(minutos / VIDAS_RECARGA_MINUTOS);
  return Math.min(VIDAS_MAX, perfil.vidas + recarregadas);
}

export function minutosProxVida(perfil: Perfil): number {
  const ultimo = new Date(perfil.vidas_ultima_recarga).getTime();
  const minutos = Math.floor((Date.now() - ultimo) / 60000);
  const resto = VIDAS_RECARGA_MINUTOS - (minutos % VIDAS_RECARGA_MINUTOS);
  return resto;
}

// ── Sequência ──────────────────────────────────────────────────────

export function calcularSequencia(perfil: Perfil): { sequencia: number; bonusHoje: boolean } {
  const hoje = new Date().toISOString().split("T")[0];
  const ultimoDia = perfil.sequencia_ultimo_dia;
  if (!ultimoDia) return { sequencia: perfil.sequencia, bonusHoje: false };
  const bonusHoje = ultimoDia === hoje;
  return { sequencia: perfil.sequencia, bonusHoje };
}

// ── Armadura de Deus ───────────────────────────────────────────────

export interface PecaArmadura {
  id: keyof ArmaduraPecas;
  nome: string;
  referencia: string;
  descricao: string;
  bonus: string;
  icone: string;
  condicao: string;
}

export const PECAS_ARMADURA: PecaArmadura[] = [
  {
    id: "calcados",
    nome: "Calçados do Evangelho",
    referencia: "Ef 6:15",
    descricao: "Pés calçados com o preparo do evangelho da paz.",
    bonus: "+10% XP por 24h após desbloquear",
    icone: "🥿",
    condicao: "Complete o 1º capítulo de qualquer trilha",
  },
  {
    id: "cinto",
    nome: "Cinto da Verdade",
    referencia: "Ef 6:14",
    descricao: "Cingidos os lombos com a verdade.",
    bonus: "Protege a sequência 1 vez por semana",
    icone: "📿",
    condicao: "Mantenha 7 dias de sequência",
  },
  {
    id: "escudo",
    nome: "Escudo da Fé",
    referencia: "Ef 6:16",
    descricao: "Com o qual podereis apagar todos os dardos inflamados do maligno.",
    bonus: "Absorve 1 erro por capítulo (1x por dia)",
    icone: "🛡️",
    condicao: "Complete o Velho Testamento completo",
  },
  {
    id: "espada",
    nome: "Espada do Espírito",
    referencia: "Ef 6:17",
    descricao: "A palavra de Deus.",
    bonus: "Revela 1 dica por capítulo",
    icone: "⚔️",
    condicao: "Complete o Novo Testamento completo",
  },
  {
    id: "capacete",
    nome: "Capacete da Salvação",
    referencia: "Ef 6:17",
    descricao: "Tomai também o capacete da salvação.",
    bonus: "+1 vida máxima (6 no total)",
    icone: "🪖",
    condicao: "Complete a Jornada de Jesus",
  },
  {
    id: "couraca",
    nome: "Couraça da Justiça",
    referencia: "Ef 6:14",
    descricao: "Tendo vestido a couraça da justiça.",
    bonus: "Desbloqueia o Modo Arena (PvP)",
    icone: "🔲",
    condicao: "Vista toda a armadura",
  },
];

export function verificarArmaduraDesbloqueios(
  perfil: Perfil,
  totalCapitulosCompletos: { VT: number; NT: number; JESUS: number }
): ArmaduraPecas {
  const atual = perfil.armadura;
  const total = totalCapitulosCompletos;

  return {
    calcados: atual.calcados || total.VT >= 1 || total.NT >= 1 || total.JESUS >= 1,
    cinto: atual.cinto || perfil.sequencia_max >= 7,
    escudo: atual.escudo || total.VT >= 9,
    espada: atual.espada || total.NT >= 9,
    capacete: atual.capacete || total.JESUS >= 7,
    couraca:
      atual.couraca ||
      !!(
        (atual.calcados || total.VT >= 1 || total.NT >= 1 || total.JESUS >= 1) &&
        (atual.cinto || perfil.sequencia_max >= 7) &&
        (atual.escudo || total.VT >= 9) &&
        (atual.espada || total.NT >= 9) &&
        (atual.capacete || total.JESUS >= 7)
      ),
  };
}

// ── Persistência ───────────────────────────────────────────────────

export async function carregarPerfil(userId: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from("perfis")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data as Perfil;
}

export async function garantirPerfil(userId: string, nome: string, email: string): Promise<Perfil | null> {
  const existente = await carregarPerfil(userId);
  if (existente) return existente;
  await supabase.from("perfis").insert({ id: userId, nome, email });
  return carregarPerfil(userId);
}

export async function salvarProgresso(
  userId: string,
  trilha: "VT" | "NT" | "JESUS",
  capituloId: string,
  pontuacao: number,
  completo: boolean
) {
  await supabase.from("progresso").upsert(
    { user_id: userId, trilha, capitulo_id: capituloId, pontuacao, completo, atualizado_em: new Date().toISOString(), tentativas: 1 },
    { onConflict: "user_id,trilha,capitulo_id", ignoreDuplicates: false }
  );
}

export async function carregarProgresso(userId: string) {
  const { data } = await supabase
    .from("progresso")
    .select("trilha, capitulo_id, completo, pontuacao")
    .eq("user_id", userId);
  return data ?? [];
}

export async function atualizarPerfil(userId: string, updates: Partial<Perfil>) {
  await supabase.from("perfis").update(updates).eq("id", userId);
}

export async function registrarLoginDiario(perfil: Perfil): Promise<Partial<Perfil>> {
  const hoje = new Date().toISOString().split("T")[0];
  if (perfil.sequencia_ultimo_dia === hoje) return {};

  const ontem = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const novaSequencia =
    perfil.sequencia_ultimo_dia === ontem ? perfil.sequencia + 1 : 1;

  const updates: Partial<Perfil> = {
    talentos: perfil.talentos + TALENTOS_LOGIN_DIARIO,
    sequencia: novaSequencia,
    sequencia_max: Math.max(perfil.sequencia_max, novaSequencia),
    sequencia_ultimo_dia: hoje,
  };
  await atualizarPerfil(perfil.id, updates);
  return updates;
}
