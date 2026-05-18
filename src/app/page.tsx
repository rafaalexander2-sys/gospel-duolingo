"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Questao, Capitulo } from "@/types";
import { velhoTestamento } from "@/data/velho-testamento";
import { novoTestamento } from "@/data/novo-testamento";
import { jornadaJesus } from "@/data/jornada-jesus";
import { supabase, supabaseConfigured, Perfil } from "@/lib/supabase";
import {
  VIDAS_MAX, XP_QUESTAO_CERTA, TALENTOS_QUESTAO_CERTA,
  TALENTOS_CAPITULO_COMPLETO, PECAS_ARMADURA,
  calcularVidasAtuais, minutosProxVida,
  carregarPerfil, garantirPerfil, salvarProgresso, carregarProgresso,
  atualizarPerfil, registrarLoginDiario, verificarArmaduraDesbloqueios,
  carregarRanking, carregarTodosPerfis, resetarPerfilAdmin, deletarProgressoAdmin,
  type PerfilRanking, type PerfilAdmin,
} from "@/lib/gameEngine";
import {
  sfxAcerto, sfxErro, sfxCapituloCompleto, sfxUnlock,
  sfxClick, sfxRevisao, sfxVidaPerdida, startBgm, stopBgm,
  toggleBgm, isBgmAtivo,
} from "@/lib/sounds";

// ── Design tokens ─────────────────────────────────────────────────
const DS = {
  bg: "#F9FAFB", white: "#FFFFFF",
  blue: "#1A7FFF", blueDk: "#0062E0", blueLt: "#B8D9FF", blueTint: "#F0F6FF",
  sky: "#38BDF8", teal: "#2DD4BF", tealDk: "#0D9488",
  lav: "#A78BFA", lavDk: "#7C3AED",
  success: "#12B76A", warn: "#F79009", error: "#F04438",
  t0: "#0F172A", t1: "#374151", t2: "#6B7280", t3: "#9CA3AF",
  border: "#E5E7EB", borderLt: "#F3F4F6",
  shSm: "0 1px 3px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)",
  shLg: "0 4px 14px rgba(0,0,0,0.10), 0 8px 22px rgba(0,0,0,0.05)",
  shBlue: "0 4px 16px rgba(26,127,255,0.28)",
  shPurp: "0 4px 14px rgba(124,58,237,0.22)",
  shTeal: "0 4px 16px rgba(45,212,191,0.28)",
  // Keep these for backward compat during migration (map to new values):
  titulo: "#0F172A", corpo: "#374151", off: "#6B7280", borda: "#E5E7EB",
  dourado: "#1A7FFF", douradoClaro: "#1A7FFF", douradoSombra: "#0062E0",
  verde: "#12B76A", acerto: "#ECFDF5", erro: "#FFF1F0",
  vermelho: "#F04438", vermelhoEsc: "#C0302A",
  bgCard: "#FFFFFF",
};

type Tela = "login" | "cadastro" | "criar_personagem" | "home" | "trilhas" | "mapa" | "etapas" | "jogo" | "resultado" | "armadura" | "ranking" | "missoes" | "admin" | "planos" | "sem_vidas";
const ADMIN_EMAILS = ["rafaalexander2@gmail.com", "santosaline2802@gmail.com"];
type Trilha = "VT" | "NT" | "JESUS";
type TipoPersonagem = "peregrino" | "profeta" | "guerreiro" | "sabia";

const CORES_ROUPA = [
  { id: "dourado", hex: "#b8860b", nome: "Dourado" },
  { id: "vermelho", hex: "#7a1515", nome: "Vermelho" },
  { id: "azul", hex: "#15407a", nome: "Azul" },
  { id: "verde", hex: "#1a4a1a", nome: "Verde" },
  { id: "roxo", hex: "#4a1580", nome: "Roxo" },
  { id: "branco", hex: "#c8c0a8", nome: "Branco" },
];

function sub(texto: string, nome: string) {
  return texto.replace(/\{nome\}/g, nome);
}

// ── SVG Personagens ───────────────────────────────────────────────
function SvgPersonagem({ tipo, cor, size = 80 }: { tipo: TipoPersonagem; cor: string; size?: number }) {
  const bgColors: Record<TipoPersonagem, string> = {
    peregrino: "#DBEAFE",
    profeta:   "#FEF3C7",
    guerreiro: "#EDE9FE",
    sabia:     "#FCE7F3",
  };
  const skinColors: Record<TipoPersonagem, string> = {
    peregrino: "#FFCB99",
    profeta:   "#D4956A",
    guerreiro: "#E8A875",
    sabia:     "#F8C8A0",
  };
  const hairColors: Record<TipoPersonagem, string> = {
    peregrino: "#6B3A2A",
    profeta:   "#78787A",
    guerreiro: "#1A1A2E",
    sabia:     "#4A2020",
  };
  const skin = skinColors[tipo];
  const hair = hairColors[tipo];
  const bg   = bgColors[tipo];

  return (
    <svg width={size} height={Math.round(size * 1.2)} viewBox="0 0 80 96">
      {/* Background bubble */}
      <circle cx="40" cy="54" r="38" fill={bg} />

      {/* Body */}
      <rect x="18" y="54" width="44" height="38" rx="22" fill={cor} />

      {/* Arms */}
      <ellipse cx="12" cy="64" rx="7" ry="10" fill={cor} transform="rotate(-18 12 64)" />
      <ellipse cx="68" cy="64" rx="7" ry="10" fill={cor} transform="rotate(18 68 64)" />
      {/* Hands */}
      <circle cx="8"  cy="74" r="5.5" fill={skinColors[tipo]} />
      <circle cx="72" cy="74" r="5.5" fill={skinColors[tipo]} />

      {/* Neck */}
      <rect x="36" y="48" width="8" height="8" rx="4" fill={skin} />

      {/* Hair (behind head) */}
      {tipo === "peregrino" && (
        <>
          <ellipse cx="40" cy="9" rx="20" ry="12" fill={hair} />
          <path d="M19 22 Q16 34 18 44" stroke={hair} strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M61 22 Q64 34 62 44" stroke={hair} strokeWidth="8" strokeLinecap="round" fill="none" />
        </>
      )}
      {tipo === "profeta" && (
        <>
          <ellipse cx="40" cy="8" rx="19" ry="11" fill={hair} />
          <path d="M20 22 Q18 32 20 42" stroke={hair} strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M60 22 Q62 32 60 42" stroke={hair} strokeWidth="7" strokeLinecap="round" fill="none" />
        </>
      )}
      {tipo === "guerreiro" && (
        <>
          <rect x="19" y="4" width="42" height="20" rx="10" fill={hair} />
          <rect x="16" y="14" width="9" height="16" rx="4.5" fill={hair} />
          <rect x="55" y="14" width="9" height="16" rx="4.5" fill={hair} />
        </>
      )}
      {tipo === "sabia" && (
        <>
          <ellipse cx="40" cy="8" rx="21" ry="12" fill={hair} />
          <path d="M18 20 Q13 36 15 52" stroke={hair} strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M62 20 Q67 36 65 52" stroke={hair} strokeWidth="10" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* Head */}
      <ellipse cx="40" cy="28" rx="22" ry="24" fill={skin} />

      {/* Eyebrows */}
      {tipo === "guerreiro" ? (
        <>
          <path d="M27 16 Q32 13 37 16" stroke={hair} strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d="M43 16 Q48 13 53 16" stroke={hair} strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d="M35 15 L38 17" stroke={hair} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M45 15 L42 17" stroke={hair} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M27 16 Q32 12 37 15" stroke={hair} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M43 15 Q48 12 53 16" stroke={hair} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Eyes */}
      <ellipse cx="32" cy="27" rx="6" ry="6.5" fill="white" />
      <ellipse cx="48" cy="27" rx="6" ry="6.5" fill="white" />
      <circle cx="33" cy="27.5" r="4" fill="#1A1A2E" />
      <circle cx="49" cy="27.5" r="4" fill="#1A1A2E" />
      <circle cx="34.5" cy="25.5" r="1.8" fill="white" />
      <circle cx="50.5" cy="25.5" r="1.8" fill="white" />

      {/* Cheeks */}
      <ellipse cx="24" cy="34" rx="4.5" ry="3" fill="#FF8888" opacity="0.30" />
      <ellipse cx="56" cy="34" rx="4.5" ry="3" fill="#FF8888" opacity="0.30" />

      {/* Nose */}
      <ellipse cx="40" cy="33" rx="2" ry="1.5" fill={hair} opacity="0.25" />

      {/* Mouth */}
      {tipo === "guerreiro" ? (
        <path d="M33 39 Q40 42 47 39" stroke="#CC6644" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      ) : tipo === "profeta" ? (
        <path d="M33 40 Q40 44 47 40" stroke="#CC6644" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M32 39 Q40 47 48 39" stroke="#CC6644" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}

      {/* Profeta: beard */}
      {tipo === "profeta" && (
        <path d="M27 38 Q28 50 40 52 Q52 50 53 38 Q48 46 40 47 Q32 46 27 38Z" fill={hair} opacity="0.75" />
      )}

      {/* Sábia: headband */}
      {tipo === "sabia" && (
        <path d="M18 20 Q40 12 62 20" stroke="#1A7FFF" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )}

      {/* Accessories */}
      {tipo === "peregrino" && (
        // Backpack
        <g>
          <rect x="54" y="52" width="11" height="15" rx="3.5" fill={hair} opacity="0.85" />
          <rect x="56" y="50" width="7" height="5" rx="2" fill={hair} opacity="0.7" />
          <line x1="57" y1="56" x2="63" y2="56" stroke="white" strokeWidth="1" opacity="0.5" />
          <line x1="57" y1="59" x2="63" y2="59" stroke="white" strokeWidth="1" opacity="0.5" />
        </g>
      )}
      {tipo === "profeta" && (
        // Scroll
        <g>
          <rect x="3" y="55" width="11" height="15" rx="2.5" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" />
          <line x1="6" y1="60" x2="11" y2="60" stroke="#D97706" strokeWidth="1.2" />
          <line x1="6" y1="63" x2="11" y2="63" stroke="#D97706" strokeWidth="1.2" />
          <line x1="6" y1="66" x2="11" y2="66" stroke="#D97706" strokeWidth="1.2" />
        </g>
      )}
      {tipo === "guerreiro" && (
        // Shield
        <g>
          <path d="M3 52 Q3 66 8 72 Q10 74 10 74 Q10 74 12 72 Q17 66 17 52 Q10 48 3 52Z" fill="#6366F1" />
          <path d="M5 54 Q5 65 9 70 Q9 70 10 71 Q10 71 11 70 Q15 65 15 54 Q10 51 5 54Z" fill="#818CF8" />
          <line x1="6" y1="56" x2="14" y2="56" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="10" y1="52" x2="10" y2="70" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      )}
      {tipo === "sabia" && (
        // Open book
        <g>
          <rect x="3" y="55" width="9" height="12" rx="2" fill="white" stroke="#1A7FFF" strokeWidth="1.5" />
          <rect x="12" y="55" width="9" height="12" rx="2" fill="white" stroke="#1A7FFF" strokeWidth="1.5" />
          <line x1="6"  y1="59" x2="10" y2="59" stroke="#1A7FFF" strokeWidth="0.9" />
          <line x1="6"  y1="62" x2="10" y2="62" stroke="#1A7FFF" strokeWidth="0.9" />
          <line x1="6"  y1="65" x2="10" y2="65" stroke="#1A7FFF" strokeWidth="0.9" />
          <line x1="14" y1="59" x2="19" y2="59" stroke="#1A7FFF" strokeWidth="0.9" />
          <line x1="14" y1="62" x2="19" y2="62" stroke="#1A7FFF" strokeWidth="0.9" />
          <line x1="14" y1="65" x2="19" y2="65" stroke="#1A7FFF" strokeWidth="0.9" />
        </g>
      )}
    </svg>
  );
}

function MascoteFlutuante() {
  return (
    <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #38BDF8 0%, #1A7FFF 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(26,127,255,0.35)" }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    </div>
  );
}

// ── Slot de anúncio (placeholder até AdSense aprovado) ────────────
function SlotAnuncio({ altura = 90, label = "Anúncio" }: { altura?: number; label?: string }) {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID) {
    return (
      <div style={{ textAlign: "center", padding: "4px 0" }}>
        {/* TODO: substituir pelo snippet do AdSense quando aprovado */}
        {/* <ins className="adsbygoogle" style={{display:"block"}} data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID} data-ad-slot="SLOT_ID" data-ad-format="auto" /> */}
      </div>
    );
  }
  return (
    <div style={{
      height: `${altura}px`, border: `1px dashed ${DS.off}`,
      borderRadius: "6px", display: "flex", alignItems: "center",
      justifyContent: "center", opacity: 0.4, fontSize: "11px",
      color: DS.off, fontFamily: "monospace", margin: "4px 0",
    }}>{label}</div>
  );
}

// ── Helpers de questão ────────────────────────────────────────────
function getEnunciado(q: Questao, nome: string): string {
  switch (q.tipo) {
    case "fato_fake":           return sub(q.afirmacao, nome);
    case "multipla_escolha":    return sub(q.enunciado, nome);
    case "completar_versiculo": return `${sub(q.versiculo, nome)}\n\n— ${q.referencia}`;
    case "quem_disse":          return `"${sub(q.frase, nome)}"`;
    case "onde_aconteceu":      return sub(q.evento, nome);
    case "qual_numero":         return sub(q.enunciado, nome);
    case "qual_livro":          return sub(q.enunciado, nome);
    case "personagem_misterio": return sub(q.pistas.slice(0, 2).join("\n\n"), nome);
    case "verdade_mito":        return sub(q.mito, nome);
    case "ordenar_eventos":     return sub(q.enunciado, nome);
    default: return "";
  }
}
function getTitulo(q: Questao): string {
  const map: Record<string, string> = {
    fato_fake: "Fato ou Fake?", verdade_mito: "Verdade ou Mito?",
    multipla_escolha: "Escolha a certa", completar_versiculo: "Complete o versículo",
    quem_disse: "Quem disse isso?", onde_aconteceu: "Onde aconteceu?",
    qual_numero: "Qual é o número?", qual_livro: "Em qual livro?",
    personagem_misterio: "Quem sou eu?", ordenar_eventos: "Ordene os eventos",
  };
  return map[q.tipo] ?? "Responda";
}
function getOpcoes(q: Questao): string[] {
  switch (q.tipo) {
    case "fato_fake":    return ["Sim, é Fato!", "Não, é Fake!"];
    case "verdade_mito": return ["É Verdade!", "É Mito!"];
    case "multipla_escolha": return q.opcoes;
    case "completar_versiculo": return q.opcoes;
    case "quem_disse":   return q.opcoes;
    case "onde_aconteceu": return q.opcoes;
    case "qual_numero":  return q.opcoes;
    case "qual_livro":   return q.opcoes;
    case "personagem_misterio": return q.opcoes;
    case "ordenar_eventos": return q.eventos;
    default: return [];
  }
}
function getCorreta(q: Questao): number {
  switch (q.tipo) {
    case "fato_fake":    return q.fato ? 0 : 1;
    case "verdade_mito": return q.fato ? 0 : 1;
    case "multipla_escolha": return q.resposta;
    case "completar_versiculo": return q.resposta;
    case "quem_disse":   return q.resposta;
    case "onde_aconteceu": return q.resposta;
    case "qual_numero":  return q.resposta;
    case "qual_livro":   return q.resposta;
    case "personagem_misterio": return q.resposta;
    case "ordenar_eventos": return q.ordemCorreta[0];
    default: return 0;
  }
}

// ── Tela LOGIN ────────────────────────────────────────────────────
function TelaLogin({ onLogin, onCadastro }: { onLogin: () => void; onCadastro: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    if (!email || !senha) { setErro("Preencha email e senha."); return; }
    setCarregando(true); setErro("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) setErro("Email ou senha incorretos.");
    else onLogin();
    setCarregando(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
      <main style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <MascoteFlutuante />
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: "800", color: DS.t0, marginTop: "0", letterSpacing: "-0.03em", lineHeight: 1 }}>
            DISCYPULO
          </h1>
          <p style={{ color: DS.t2, fontStyle: "italic", fontSize: "14px", marginTop: "6px", fontFamily: "var(--font-verse)" }}>Uma jornada pela Palavra de Deus</p>
        </div>

        <div className="card-verbum" style={{ padding: "28px 24px" }}>
          <h2 style={{ fontSize: "17px", fontWeight: "700", color: DS.t0, marginBottom: "20px", textAlign: "center", letterSpacing: "-0.02em" }}>
            Entrar
          </h2>

          {erro && (
            <div style={{ background: "#FFF1F0", border: `1px solid #FECACA`, borderRadius: "8px", padding: "10px 12px", marginBottom: "14px", color: DS.error, fontSize: "13px" }}>
              {erro}
            </div>
          )}

          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: DS.t1, marginBottom: "6px", letterSpacing: "0.02em" }}>E-MAIL</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="input-verbum"
            style={{ marginBottom: "14px" }}
          />

          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: DS.t1, marginBottom: "6px", letterSpacing: "0.02em" }}>SENHA</label>
          <input
            type="password" value={senha} onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === "Enter" && entrar()}
            placeholder="••••••••"
            className="input-verbum"
            style={{ marginBottom: "20px" }}
          />

          <button
            onClick={entrar} disabled={carregando}
            className="btn-primary"
            style={{ width: "100%", padding: "14px", fontSize: "15px", marginBottom: "12px" }}
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>

          <button
            onClick={onCadastro}
            className="btn-outline"
            style={{ width: "100%", padding: "13px", fontSize: "14px" }}
          >
            Criar conta — é grátis
          </button>
        </div>
      </main>
    </div>
  );
}

// ── Tela CADASTRO ─────────────────────────────────────────────────
function TelaCadastro({ onCadastrado, onVoltar }: { onCadastrado: () => void; onVoltar: () => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function cadastrar() {
    if (!nome || !email || !senha) { setErro("Preencha todos os campos."); return; }
    if (senha.length < 6) { setErro("Senha deve ter ao menos 6 caracteres."); return; }
    setCarregando(true); setErro("");
    const { error } = await supabase.auth.signUp({
      email, password: senha,
      options: { data: { nome } },
    });
    if (error) setErro(error.message);
    else {
      localStorage.setItem("gq_novo_usuario", "1");
      onCadastrado();
    }
    setCarregando(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
      <main style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: DS.t0, letterSpacing: "-0.03em" }}>
            Criar Conta
          </h1>
          <p style={{ fontSize: "14px", color: DS.t2, marginTop: "4px" }}>Comece sua jornada bíblica hoje</p>
        </div>

        <div className="card-verbum" style={{ padding: "28px 24px" }}>
          {erro && (
            <div style={{ background: "#FFF1F0", border: `1px solid #FECACA`, borderRadius: "8px", padding: "10px 12px", marginBottom: "14px", color: DS.error, fontSize: "13px" }}>
              {erro}
            </div>
          )}

          {([["NOME", "text", "Seu nome na jornada"], ["E-MAIL", "email", "seu@email.com"], ["SENHA", "password", "Mínimo 6 caracteres"]] as const).map(([label, type, placeholder], i) => (
            <div key={label}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: DS.t1, marginBottom: "6px", letterSpacing: "0.02em" }}>{label}</label>
              <input
                type={type}
                value={[nome, email, senha][i]}
                onChange={e => [setNome, setEmail, setSenha][i](e.target.value)}
                placeholder={placeholder}
                className="input-verbum"
                style={{ marginBottom: "14px" }}
              />
            </div>
          ))}

          <button onClick={cadastrar} disabled={carregando} className="btn-primary"
            style={{ width: "100%", padding: "14px", fontSize: "15px", marginBottom: "12px" }}>
            {carregando ? "Criando conta..." : "Criar Conta"}
          </button>
          <button onClick={onVoltar} className="btn-outline"
            style={{ width: "100%", padding: "13px", fontSize: "14px" }}>
            ← Voltar
          </button>
        </div>
      </main>
    </div>
  );
}

// ── Tela CRIAR PERSONAGEM ─────────────────────────────────────────
const ARQUETIPOS: { id: TipoPersonagem; nome: string; desc: string }[] = [
  { id: "peregrino", nome: "O Peregrino", desc: "Viajante fiel, busca sabedoria no caminho." },
  { id: "profeta", nome: "O Profeta", desc: "Mensageiro de Deus, fala com autoridade." },
  { id: "guerreiro", nome: "O Guerreiro", desc: "Defende a fé com coragem e perseverança." },
  { id: "sabia", nome: "A Sábia", desc: "Mestre das escrituras, luz para os outros." },
];

function TelaCriarPersonagem({ userId, onConcluir }: { userId: string; onConcluir: (tipo: TipoPersonagem, cor: string) => void }) {
  const [tipoSel, setTipoSel] = useState<TipoPersonagem>("peregrino");
  const [corSel, setCorSel] = useState(CORES_ROUPA[0].hex);
  const [carregando, setCarregando] = useState(false);

  async function confirmar() {
    setCarregando(true);
    await atualizarPerfil(userId, { personagem_tipo: tipoSel, personagem_cor: corSel });
    localStorage.removeItem("gq_novo_usuario");
    onConcluir(tipoSel, corSel);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", overflowY: "auto", display: "flex", justifyContent: "center", padding: "20px" }}>
      <main style={{ width: "100%", maxWidth: "450px", paddingBottom: "40px" }}>
        <div style={{ textAlign: "center", margin: "20px 0 24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: DS.t0, letterSpacing: "-0.02em" }}>
            Escolha seu Personagem
          </h1>
          <p style={{ color: DS.t2, fontSize: "13px", marginTop: "4px" }}>Você pode trocar depois</p>
        </div>

        {/* Preview */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <SvgPersonagem tipo={tipoSel} cor={corSel} size={110} />
        </div>

        {/* Arquétipos */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          {ARQUETIPOS.map(a => (
            <button key={a.id} onClick={() => setTipoSel(a.id)}
              style={{
                padding: "12px 10px", borderRadius: "12px", cursor: "pointer", textAlign: "left",
                border: `2px solid ${tipoSel === a.id ? DS.blue : DS.border}`,
                background: tipoSel === a.id ? DS.blueTint : DS.white,
                boxShadow: tipoSel === a.id ? DS.shBlue : DS.shSm,
                transition: "all 0.15s",
              }}>
              <div style={{ marginBottom: "4px" }}>
                <SvgPersonagem tipo={a.id} cor={corSel} size={44} />
              </div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: DS.t0 }}>{a.nome}</div>
              <div style={{ fontSize: "11px", color: DS.t2, marginTop: "2px", lineHeight: 1.3 }}>{a.desc}</div>
            </button>
          ))}
        </div>

        {/* Cor da roupa */}
        <div className="card-verbum" style={{ padding: "16px 20px", marginBottom: "20px" }}>
          <p style={{ fontSize: "12px", fontWeight: "700", color: DS.t1, marginBottom: "12px", letterSpacing: "0.05em" }}>COR DA ROUPA</p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {CORES_ROUPA.map(c => (
              <button key={c.id} onClick={() => setCorSel(c.hex)}
                title={c.nome}
                style={{
                  width: "36px", height: "36px", borderRadius: "50%", background: c.hex, cursor: "pointer",
                  border: `3px solid ${corSel === c.hex ? DS.blue : "transparent"}`,
                  boxShadow: corSel === c.hex ? DS.shBlue : "0 1px 3px rgba(0,0,0,0.3)",
                  transition: "all 0.15s",
                }} />
            ))}
          </div>
        </div>

        <button onClick={confirmar} disabled={carregando} className="btn-primary"
          style={{ width: "100%", padding: "15px", fontSize: "15px" }}>
          {carregando ? "Salvando..." : "Começar a Jornada"}
        </button>
      </main>
    </div>
  );
}

// ── Tela ARMADURA ─────────────────────────────────────────────────
function TelaArmadura({ perfil, onVoltar }: { perfil: Perfil; onVoltar: () => void }) {
  const pecasUnlocked = perfil.armadura;
  const totalPecas = Object.values(pecasUnlocked).filter(Boolean).length;

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* Header */}
      <div className="status-bar" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={onVoltar} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text-2)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize: "16px", fontWeight: "800", color: DS.t0, letterSpacing: "-0.02em" }}>
          Armadura de Deus
        </span>
        <span style={{ marginLeft: "auto", fontSize: "11px", color: DS.t3 }}>Ef 6:11</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 80px" }}>
        {/* Personagem + stats */}
        <div className="card-verbum" style={{ padding: "20px", marginBottom: "16px", textAlign: "center" }}>
          <SvgPersonagem tipo={perfil.personagem_tipo} cor={perfil.personagem_cor} size={90} />
          <div style={{ fontSize: "18px", fontWeight: "700", color: DS.t0, marginTop: "8px" }}>{perfil.nome}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "12px" }}>
            {[
              { icon: "⭐", val: perfil.xp.toLocaleString(), label: "Maná" },
              { icon: "🪙", val: perfil.talentos, label: "Talentos" },
              { icon: "🔥", val: perfil.sequencia, label: "Dias" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "18px" }}>{s.icon}</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: DS.t0 }}>{s.val}</div>
                <div style={{ fontSize: "11px", color: DS.t2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "14px" }}>
            <div style={{ fontSize: "12px", color: DS.t2, marginBottom: "6px" }}>{totalPecas}/6 peças</div>
            <div className="xp-track">
              <div className="xp-fill" style={{ width: `${(totalPecas / 6) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Versículo */}
        <div style={{ textAlign: "center", padding: "12px 20px", marginBottom: "16px" }}>
          <p style={{ fontStyle: "italic", color: DS.t1, fontSize: "13px", lineHeight: 1.6, fontFamily: "var(--font-verse)" }}>
            "Revesti-vos de toda a armadura de Deus, para que possais estar firmes contra as ciladas do diabo."
          </p>
          <span style={{ fontSize: "12px", color: DS.blue }}>— Efésios 6:11</span>
        </div>

        {/* Peças */}
        {PECAS_ARMADURA.map(peca => {
          const desbloqueada = !!pecasUnlocked[peca.id];
          return (
            <div key={peca.id} className="card-verbum" style={{
              padding: "14px 16px", marginBottom: "10px", display: "flex", gap: "14px", alignItems: "flex-start",
              opacity: desbloqueada ? 1 : 0.55,
              filter: desbloqueada ? "none" : "grayscale(0.4)",
            }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "14px", flexShrink: 0,
                background: desbloqueada
                  ? `linear-gradient(135deg, ${DS.blue}, ${DS.blueDk})`
                  : "linear-gradient(145deg, #E5E7EB, #D1D5DB)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "22px",
                boxShadow: desbloqueada ? DS.shBlue : "none",
              }}>
                {desbloqueada ? peca.icone : "🔒"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: DS.t0 }}>{peca.nome}</span>
                  <span style={{ fontSize: "11px", color: DS.blue }}>{peca.referencia}</span>
                </div>
                <p style={{ fontSize: "12px", color: DS.t1, marginTop: "4px", lineHeight: 1.4 }}>{peca.descricao}</p>
                <p style={{ fontSize: "11px", color: desbloqueada ? DS.success : DS.t2, marginTop: "4px", fontWeight: "600" }}>
                  {desbloqueada ? `✓ ${peca.bonus}` : `🔒 ${peca.condicao}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── BGM toggle ────────────────────────────────────────────────────
function BotaoBgm() {
  const [ativo, setAtivo] = useState(false);
  return (
    <button
      onClick={() => { const on = toggleBgm(); setAtivo(on); }}
      title={ativo ? "Pausar música" : "Tocar música"}
      style={{
        background: ativo ? DS.blueTint : "transparent",
        border: `1.5px solid ${ativo ? DS.blueLt : DS.border}`,
        borderRadius: "50%", width: "30px", height: "30px",
        cursor: "pointer", fontSize: "14px", display: "flex",
        alignItems: "center", justifyContent: "center",
        transition: "all 0.2s",
      }}
    >{ativo ? "🎵" : "🔇"}</button>
  );
}

// ── Missões Diárias ───────────────────────────────────────────────
interface Missao {
  id: string;
  titulo: string;
  descricao: string;
  devocional: string;
  versiculo: string;
  referencia: string;
  xp: number;
  talentos: number;
}
interface MissaoConcluida {
  missaoId: string;
  data: string; // "YYYY-MM-DD"
  reflexao: string;
  xpGanho: number;
}

const MISSOES: Missao[] = [
  { id:"m1", titulo:"Perdoar Alguém", descricao:"Perdoe alguém que te magoou — de coração, sem guardar rancor.", devocional:"Perdoar não é fraqueza, é um ato de fé. Quando escolhemos perdoar, seguimos o exemplo de Cristo, que nos perdoou mesmo quando não merecíamos. O rancor aprisiona, mas o perdão liberta.", versiculo:"Sede bondosos uns para com os outros, compassivos, perdoando-vos mutuamente, assim como Deus vos perdoou em Cristo.", referencia:"Efésios 4:32", xp:80, talentos:15 },
  { id:"m2", titulo:"Ajudar uma Pessoa", descricao:"Ofereça ajuda concreta a alguém hoje — sem esperar nada em troca.", devocional:"O amor cristão se prova em ações. Servir ao próximo é servir a Cristo. Uma mão estendida pode mudar o dia — ou a vida — de alguém.", versiculo:"Cada um cuide, não somente dos seus próprios interesses, mas também dos interesses dos outros.", referencia:"Filipenses 2:4", xp:70, talentos:12 },
  { id:"m3", titulo:"Ler a Bíblia por 20 min", descricao:"Reserve 20 minutos de silêncio para ler e meditar na Palavra de Deus.", devocional:"A Bíblia não é apenas um livro — é o pão do espírito. Cada versículo lido com atenção transforma nossa mente e fortalece nossa fé contra as dificuldades do dia.", versiculo:"Lâmpada para os meus pés é a tua palavra e luz para o meu caminho.", referencia:"Salmos 119:105", xp:60, talentos:10 },
  { id:"m4", titulo:"Fazer uma Doação", descricao:"Doe algo de valor — dinheiro, roupa, comida — a quem precisa.", devocional:"A generosidade é o antídoto para a ganância. Quando damos, declaramos que nossa confiança está em Deus e não nas posses. O que damos ao próximo, damos ao Senhor.", versiculo:"Quem é generoso para com o pobre empresta ao Senhor, e ele o recompensará.", referencia:"Provérbios 19:17", xp:90, talentos:20 },
  { id:"m5", titulo:"Orar por Alguém Publicamente", descricao:"Ore em voz alta por alguém na presença de outras pessoas hoje.", devocional:"Orar pelo outro na frente de testemunhas declara publicamente nossa dependência de Deus e nosso amor pelo próximo. Não é vaidade — é coragem espiritual.", versiculo:"Orai uns pelos outros, para que sareis. A oração do justo é poderosa e eficaz.", referencia:"Tiago 5:16", xp:100, talentos:20 },
  { id:"m6", titulo:"Compartilhar o Evangelho", descricao:"Fale sobre Jesus com alguém que ainda não o conhece.", devocional:"A boa notícia é boa demais para guardar. Cada cristão é chamado a ser embaixador de Cristo. Não precisamos de palavras perfeitas — apenas de coração disposto.", versiculo:"Portanto ide e fazei discípulos de todas as nações.", referencia:"Mateus 28:19", xp:120, talentos:25 },
  { id:"m7", titulo:"Convidar para um Café", descricao:"Convide alguém para um café e ouça sua história com atenção.", devocional:"Jesus construiu relacionamentos à mesa. Um café simples pode abrir portas que sermões não abrem. Mostrar interesse genuíno pelo outro é uma forma de amor.", versiculo:"Praticai a hospitalidade uns para com os outros, sem murmurar.", referencia:"1 Pedro 4:9", xp:60, talentos:10 },
  { id:"m8", titulo:"Convidar para a Igreja", descricao:"Convide alguém novo para participar do culto ou célula com você.", devocional:"A Igreja é a família de Deus, e toda família cresce quando novos membros são acolhidos. Seu convite pode ser a virada na história de alguém.", versiculo:"Não deixemos de nos reunir, como é costume de alguns, mas que um encoraje ao outro.", referencia:"Hebreus 10:25", xp:100, talentos:20 },
  { id:"m9", titulo:"Boa Ação Anônima", descricao:"Faça uma boa ação sem que ninguém saiba que foi você.", devocional:"A recompensa mais pura vem do que fazemos quando ninguém está vendo. Agir sem reconhecimento é o grau mais alto da generosidade cristã.", versiculo:"Não saiba a tua mão esquerda o que faz a tua mão direita.", referencia:"Mateus 6:3", xp:80, talentos:15 },
  { id:"m10", titulo:"Dar uma Bíblia de Presente", descricao:"Presenteie alguém com uma Bíblia ou compartilhe um texto bíblico.", devocional:"Nenhum presente tem valor eterno maior que a Palavra de Deus. Uma Bíblia entregue no momento certo pode plantar uma semente que dura para sempre.", versiculo:"A palavra de Deus é viva, e eficaz, e mais afiada do que qualquer espada de dois gumes.", referencia:"Hebreus 4:12", xp:90, talentos:18 },
  { id:"m11", titulo:"Escrever uma Carta de Gratidão", descricao:"Escreva uma carta ou mensagem agradecendo alguém que impactou sua vida.", devocional:"A gratidão transforma quem a expressa tanto quanto quem a recebe. Reconhecer a bondade nos outros é reconhecer a mão de Deus agindo através deles.", versiculo:"Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus para convosco.", referencia:"1 Tessalonicenses 5:18", xp:70, talentos:12 },
  { id:"m12", titulo:"Jejum e Oração", descricao:"Faça um jejum (de comida ou de redes sociais) e dedique esse tempo à oração.", devocional:"O jejum não muda Deus — nos muda. Quando silenciamos os apetites do corpo, aguçamos os do espírito. É um ato de rendição que posiciona nossa alma para ouvir.", versiculo:"Quando jejuardes, não ponhais cara triste como os hipócritas.", referencia:"Mateus 6:16", xp:110, talentos:22 },
  { id:"m13", titulo:"Visitar o Solitário", descricao:"Visite ou ligue para alguém que está sozinho — idoso, doente, amigo distante.", devocional:"Solidão é uma das maiores dores humanas. Sua presença pode ser o instrumento de cura que Deus escolheu usar hoje. Não subestime o poder de simplesmente aparecer.", versiculo:"Religião pura e sem mácula é esta: visitar os órfãos e as viúvas nas suas tribulações.", referencia:"Tiago 1:27", xp:90, talentos:18 },
  { id:"m14", titulo:"Palavra de Encorajamento", descricao:"Diga ou escreva uma palavra de encorajamento genuíno para alguém hoje.", devocional:"As palavras têm poder de vida e de morte. Um elogio sincero, uma afirmação no momento certo, pode reacender a chama de alguém que está prestes a desistir.", versiculo:"Portanto, encorajai-vos uns aos outros e edificai-vos uns aos outros.", referencia:"1 Tessalonicenses 5:11", xp:60, talentos:10 },
  { id:"m15", titulo:"Pagar pelo Próximo", descricao:"Pague o almoço, café ou conta de alguém de surpresa hoje.", devocional:"Pequenos gestos financeiros carregam uma mensagem poderosa: você foi visto, você importa. Cristo nos viu quando ninguém nos via. Podemos passar isso adiante.", versiculo:"Servi-vos uns aos outros por amor.", referencia:"Gálatas 5:13", xp:80, talentos:15 },
  { id:"m16", titulo:"Ligar para Quem Faz Tempo", descricao:"Ligue para alguém com quem não fala há meses. Só para saber como está.", devocional:"Relacionamentos precisam de atenção para sobreviver. Uma ligação inesperada pode reconstruir pontes que pareciam irreparáveis. Deus nos chama para restaurar laços.", versiculo:"O amigo ama em todo tempo, e como irmão se mostra na adversidade.", referencia:"Provérbios 17:17", xp:65, talentos:10 },
  { id:"m17", titulo:"Agradecer por 5 Bênçãos", descricao:"Liste 5 bênçãos específicas hoje e agradeça a Deus por cada uma.", devocional:"Gratidão é um exercício espiritual que recalibra nossa visão. Quando focamos no que temos em vez do que falta, nossa perspectiva muda e nossa fé cresce.", versiculo:"Bom é render graças ao Senhor e cantar louvores ao Teu nome, ó Altíssimo.", referencia:"Salmos 92:1", xp:50, talentos:8 },
  { id:"m18", titulo:"Reconciliar-se com Alguém", descricao:"Dê o primeiro passo para restaurar um relacionamento rompido.", devocional:"A reconciliação exige humildade — e a humildade é a postura do discípulo de Cristo. Ir primeiro, mesmo sem ter errado, é o caminho que Jesus traçou.", versiculo:"Se, pois, trouxeres a tua oferta ao altar e ali te lembrares que teu irmão tem alguma coisa contra ti... primeiro reconcilia-te com teu irmão.", referencia:"Mateus 5:23-24", xp:120, talentos:25 },
  { id:"m19", titulo:"Cantar um Louvor", descricao:"Cante ou toque um louvor — sozinho, com alguém ou numa reunião.", devocional:"O louvor não é só música — é uma declaração de fé. Quando louvamos em meio às dificuldades, estamos dizendo que Deus é maior do que nossos problemas.", versiculo:"Cantai ao Senhor um cântico novo; cantai ao Senhor toda a terra.", referencia:"Salmos 96:1", xp:55, talentos:8 },
  { id:"m20", titulo:"Memorizar um Versículo", descricao:"Escolha um versículo e o memorize até o fim do dia.", devocional:"A Palavra guardada no coração é a arma mais poderosa contra a tentação, a dúvida e o desânimo. Jesus usou versículos contra Satanás no deserto.", versiculo:"Guardo no coração as Tuas palavras para não pecar contra Ti.", referencia:"Salmos 119:11", xp:75, talentos:12 },
  { id:"m21", titulo:"Servir na Comunidade", descricao:"Voluntarie-se em algo: limpeza, cozinha, atendimento, qualquer serviço.", devocional:"Jesus lavou os pés de seus discípulos — o ato mais humilde de um Rei. Servir sem título ou reconhecimento é um dos sinais mais claros de transformação pelo Evangelho.", versiculo:"O maior entre vós será o vosso servo.", referencia:"Mateus 23:11", xp:100, talentos:20 },
  { id:"m22", titulo:"Silêncio e Meditação", descricao:"Passe 15 minutos em silêncio total — sem celular, só ouvindo Deus.", devocional:"Num mundo cheio de barulho, o silêncio é revolucionário. É no silêncio que Deus fala em voz mansa e delicada. Aprender a ouvir é a disciplina mais necessária do discípulo.", versiculo:"Aquietai-vos e sabei que eu sou Deus.", referencia:"Salmos 46:10", xp:65, talentos:10 },
  { id:"m23", titulo:"Perdoar a Si Mesmo", descricao:"Escolha se perdoar por algo que carrega com culpa — e seguir em frente.", devocional:"Muitos cristãos perdoam os outros com facilidade mas se torturam com seus próprios erros. A graça de Deus é suficiente para tudo — inclusive para o que você fez. Receba-a.", versiculo:"Portanto, já não há nenhuma condenação para os que estão em Cristo Jesus.", referencia:"Romanos 8:1", xp:85, talentos:15 },
  { id:"m24", titulo:"Compartilhar sua Fé Online", descricao:"Publique algo sobre sua fé — versículo, reflexão ou testemunho.", devocional:"As redes sociais podem ser palanque de superficialidade ou de impacto eterno. Uma palavra de fé no lugar certo pode alcançar alguém que jamais entraria numa igreja.", versiculo:"Portanto, não vos envergonheis do testemunho do nosso Senhor.", referencia:"2 Timóteo 1:8", xp:70, talentos:12 },
  { id:"m25", titulo:"Orar pelo Governo", descricao:"Ore especificamente por líderes do seu país — mesmo os que não admira.", devocional:"A oração pelos governantes não é aprovação política — é obediência. Deus usa reis, presidentes e prefeitos para seus propósitos. Nossa oração molda a história.", versiculo:"Exorto, pois, antes de tudo, que se façam súplicas, orações... pelos reis e por todos os que estão em autoridade.", referencia:"1 Timóteo 2:1-2", xp:60, talentos:10 },
  { id:"m26", titulo:"Testemunhar no Trabalho", descricao:"Compartilhe algo de sua fé com um colega de trabalho ou estudo.", devocional:"Passamos a maior parte de nossa vida útil no trabalho. Se o Evangelho não entra nesse espaço, fica confinado a duas horas por semana. Seja luz onde você já está.", versiculo:"Vós sois a luz do mundo. Não se pode esconder uma cidade edificada sobre um monte.", referencia:"Mateus 5:14", xp:90, talentos:18 },
  { id:"m27", titulo:"Dar sem Receber", descricao:"Dê algo de valor — tempo, presente, dinheiro — a alguém que nunca poderá retribuir.", devocional:"O nível mais alto de generosidade é o que não espera retorno. Dar a quem não pode pagar de volta é imitar o coração de Deus, que nos amou quando ainda éramos inimigos seus.", versiculo:"Quando deres um banquete, convida os pobres, os aleijados, os coxos, os cegos. Serás bem-aventurado.", referencia:"Lucas 14:13-14", xp:100, talentos:20 },
  { id:"m28", titulo:"Praticar a Paciência", descricao:"Escolha conscientemente não reagir com raiva ou irritação hoje.", devocional:"Paciência não é passividade — é força sob controle. Em nossa cultura da resposta imediata, aguentar firme e responder com mansidão é um ato radical de contracorrente.", versiculo:"A brandura da resposta desvia o furor, mas a palavra dura suscita a ira.", referencia:"Provérbios 15:1", xp:70, talentos:12 },
];

function getMissaoHoje(): Missao {
  const d = new Date();
  const day = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
  return MISSOES[day % MISSOES.length];
}

// ── Anel de progresso (5 segmentos ao redor do nó) ───────────────
function AnelProgresso({ completas, total = 5 }: { completas: number; total?: number }) {
  const cx = 45, cy = 45, r = 42;
  const segDeg = 64, gapDeg = 8; // 5*(64+8)=360
  const toRad = (d: number) => d * Math.PI / 180;
  return (
    <svg width="90" height="90" style={{ position: "absolute", top: "-7px", left: "-7px", pointerEvents: "none" }}>
      {Array.from({ length: total }, (_, i) => {
        const s = -90 + i * (segDeg + gapDeg);
        const e = s + segDeg;
        const x1 = cx + r * Math.cos(toRad(s)), y1 = cy + r * Math.sin(toRad(s));
        const x2 = cx + r * Math.cos(toRad(e)), y2 = cy + r * Math.sin(toRad(e));
        return (
          <path key={i}
            d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`}
            stroke={i < completas ? DS.blue : "rgba(255,255,255,0.2)"}
            strokeWidth="5.5" fill="none" strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

// ── Barra de Nav Global ───────────────────────────────────────────
function BarraNavGlobal({
  tela, onHome, onMissoes, onPlanos, onRanking, onArmadura, missaoConcluidaHoje,
}: {
  tela: Tela;
  onHome: () => void;
  onMissoes: () => void;
  onPlanos: () => void;
  onRanking: () => void;
  onArmadura: () => void;
  missaoConcluidaHoje: boolean;
}) {
  const items = [
    {
      id: "home", label: "Início", action: onHome, active: tela === "home", badge: false,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    },
    {
      id: "missoes", label: "Missões", action: onMissoes, active: tela === "missoes", badge: !missaoConcluidaHoje,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    },
    {
      id: "planos", label: "Premium", action: onPlanos, active: tela === "planos", badge: false,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    },
    {
      id: "ranking", label: "Ranking", action: onRanking, active: tela === "ranking", badge: false,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
    },
    {
      id: "armadura", label: "Armadura", action: onArmadura, active: tela === "armadura", badge: false,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"/></svg>,
    },
  ];

  return (
    <nav className="tab-bar">
      {items.map(item => (
        <button key={item.id} className={`tab-item${item.active ? " tab-active" : ""}`} onClick={item.action}>
          <div className="tab-item-inner" style={{ color: item.active ? "var(--blue)" : "var(--text-3)", position: "relative" }}>
            {item.icon}
            {item.badge && (
              <span style={{ position: "absolute", top: "-2px", right: "-2px", width: "8px", height: "8px", borderRadius: "50%", background: DS.error, border: "1.5px solid var(--bg)" }} />
            )}
          </div>
          <span className="tab-lbl">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ── Tela HOME ─────────────────────────────────────────────────────
function TelaHome({
  perfil, vidas, onEscolher, onArmadura, onPersonagem, onRanking, onTrilhas, onMissoes, onSair,
  missaoConcluidaHoje, onAdmin, onPlanos,
}: {
  perfil: Perfil; vidas: number;
  onEscolher: (t: Trilha) => void;
  onArmadura: () => void;
  onPersonagem: () => void;
  onRanking: () => void;
  onTrilhas: () => void;
  onMissoes: () => void;
  onSair: () => void;
  missaoConcluidaHoje?: boolean;
  onAdmin?: () => void;
  onPlanos: () => void;
}) {
  const pecasTotal = Object.values(perfil.armadura).filter(Boolean).length;
  const missaoHoje = getMissaoHoje();
  const nivel = Math.floor(perfil.xp / 500) + 1;
  const xpPct = (perfil.xp % 500) / 5;

  return (
    <div className="tela-scroll">
      <main style={{ width: "100%", maxWidth: "450px", padding: "0 0 90px" }}>
        {/* Status bar */}
        <div className="status-bar" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={onPersonagem} title="Personalizar personagem"
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <SvgPersonagem tipo={perfil.personagem_tipo} cor={perfil.personagem_cor} size={28} />
          </button>
          {/* Streak */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: "9999px", padding: "4px 10px", fontSize: "12px", fontWeight: 800, color: "#c2410c" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            {perfil.sequencia}d
          </div>
          {/* Maná */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--blue-tint)", border: "1.5px solid var(--blue-lt)", borderRadius: "9999px", padding: "4px 10px", fontSize: "12px", fontWeight: 800, color: "var(--blue-dk)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            {perfil.xp.toLocaleString()}
          </div>
          {/* Lives */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "#fff1f2", border: "1.5px solid #fecdd3", borderRadius: "9999px", padding: "4px 10px", fontSize: "12px", fontWeight: 800, color: "#be123c" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {vidas}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
            <BotaoBgm />
            <button onClick={onSair} title="Sair" style={{ background:"none",border:"none",cursor:"pointer",color:DS.t2, padding: "2px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 12h8M14 8l4 4-4 4"/><path d="M14 5H5v14h9" fill="none"/></svg>
            </button>
          </div>
        </div>

        <div style={{ padding: "16px 20px 0" }}>
          {/* Hero card */}
          <div className="card-hero" style={{ padding: "20px", marginBottom: "16px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2px" }}>Nível {nivel}</div>
              <h1 style={{ fontSize: "26px", fontWeight: "800", color: "white", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
                DISCYPULO
              </h1>
              <p style={{ color: "rgba(255,255,255,0.75)", fontStyle: "italic", fontSize: "13px", fontFamily: "var(--font-verse)" }}>Uma jornada pela Palavra de Deus</p>
              <div style={{ marginTop: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.65)", marginBottom: "5px" }}>
                  <span>{perfil.xp.toLocaleString()} Maná</span>
                  <span>{500 - (perfil.xp % 500)} p/ nível {nivel + 1}</span>
                </div>
                <div style={{ height: "5px", background: "rgba(255,255,255,0.2)", borderRadius: "9999px", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: "9999px", background: "rgba(255,255,255,0.9)", width: `${xpPct}%`, transition: "width 0.4s ease" }} />
                </div>
              </div>
            </div>
            {pecasTotal > 0 && (
              <button onClick={onArmadura} style={{ background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", marginTop: "10px", borderRadius: "8px", padding: "5px 10px", display: "block", width: "100%", textAlign: "center" }}>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                  {PECAS_ARMADURA.filter(p => perfil.armadura[p.id]).map(p => p.icone).join(" ")} — {pecasTotal}/6 peças
                </span>
              </button>
            )}
          </div>

          {/* Bíblia */}
          <div className="card-verbum" style={{ padding: "16px 20px", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: DS.blueTint, border: `1.5px solid ${DS.blueLt}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={DS.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
              <span style={{ fontSize: "14px", fontWeight: "700", color: DS.t0 }}>A Bíblia</span>
            </div>
            <p style={{ fontSize: "13px", color: DS.t1, marginBottom: "12px", lineHeight: 1.5 }}>
              Explore o Velho e o Novo Testamento com quizzes sobre todos os livros sagrados.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => onEscolher("VT")} className="btn-primary"
                style={{ flex: 1, padding: "11px 8px", fontSize: "13px" }}>
                Velho Test.
              </button>
              <button onClick={() => onEscolher("NT")} className="btn-teal"
                style={{ flex: 1, padding: "11px 8px", fontSize: "13px" }}>
                Novo Test.
              </button>
            </div>
          </div>

          {/* Jornada de Jesus */}
          <div style={{
            background: `linear-gradient(135deg, ${DS.lav}, ${DS.lavDk})`,
            borderRadius: "var(--r-lg)", padding: "16px 20px", marginBottom: "12px",
            boxShadow: DS.shPurp, position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -10, right: -10, width: 80, height: 80, background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
            <p style={{ fontSize: "14px", fontWeight: "700", color: "white", marginBottom: "4px" }}>Jornada de Jesus</p>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", marginBottom: "12px", lineHeight: 1.5 }}>
              Caminhe ao lado de Jesus — do nascimento à ressurreição.
            </p>
            <button onClick={() => onEscolher("JESUS")} style={{
              width: "100%", padding: "11px", fontSize: "13px", fontWeight: 700, cursor: "pointer",
              background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.4)",
              borderRadius: "var(--r-md)", color: "white", transition: "all 0.15s",
            }}>
              Iniciar Jornada
            </button>
          </div>

          {/* Missão do Dia */}
          <div className="card-verbum" style={{ padding: "13px 16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: DS.blueTint, border: `1.5px solid ${DS.blueLt}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={DS.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: DS.blue, marginBottom: "2px", letterSpacing: "0.05em", textTransform: "uppercase" }}>MISSÃO DE HOJE</p>
              <p style={{ fontSize: "13px", color: DS.t0, fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{missaoHoje.titulo}</p>
            </div>
            {missaoConcluidaHoje ? (
              <span className="badge badge-success">✓ Feita</span>
            ) : (
              <button onClick={onMissoes} className="btn-primary" style={{ padding: "7px 12px", fontSize: "12px", flexShrink: 0 }}>
                Fazer →
              </button>
            )}
          </div>

          {/* Banner Premium */}
          <button onClick={onPlanos} style={{
            width: "100%", padding: "12px 16px", borderRadius: "var(--r-lg)", cursor: "pointer",
            background: "linear-gradient(135deg, #F5F3FF, #EDE9FE)",
            border: `1.5px solid #DDD6FE`,
            display: "flex", alignItems: "center", gap: "12px",
            marginBottom: "8px", textAlign: "left",
            boxShadow: DS.shSm,
          }}>
            <span style={{ fontSize: "22px" }}>👑</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: DS.lavDk }}>Discípulo Premium</div>
              <div style={{ fontSize: "11px", color: DS.t2, marginTop: "2px" }}>Vidas ilimitadas · Sem anúncios · A partir de R$ 7,49/mês</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={DS.lavDk} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          {onAdmin && (
            <button onClick={onAdmin} style={{
              background: "none", border: `1.5px solid ${DS.border}`,
              borderRadius: "var(--r-md)", padding: "8px 14px",
              color: DS.t2, fontSize: "12px", fontWeight: 600,
              cursor: "pointer", width: "100%", marginBottom: "8px",
            }}>
              ⚙ Painel Admin
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Tela MAPA ─────────────────────────────────────────────────────
function TelaMapa({
  trilha, perfil, vidas, progressoCompleto, progressoEtapas,
  onCapitulo, onVoltar,
}: {
  trilha: Trilha; perfil: Perfil; vidas: number;
  progressoCompleto: Set<string>;
  progressoEtapas: Record<string, number>;
  onCapitulo: (c: Capitulo, idx: number) => void;
  onVoltar: () => void;
}) {
  const capitulos: Capitulo[] = trilha === "VT" ? velhoTestamento : trilha === "NT" ? novoTestamento : jornadaJesus;
  const titulo = trilha === "VT" ? "Velho Testamento" : trilha === "NT" ? "Novo Testamento" : "Jornada de Jesus";
  const unitColor = trilha === "VT" ? "blue" : trilha === "NT" ? "teal" : "lav";

  const primeiroNaoCompleto = capitulos.findIndex((cap) => !progressoCompleto.has(`${trilha}_${cap.id}`));
  const idxAtual = primeiroNaoCompleto === -1 ? capitulos.length : primeiroNaoCompleto;

  const [tooltipIdx, setTooltipIdx] = useState<number | null>(idxAtual < capitulos.length ? idxAtual : null);

  // Node offset pattern (Duolingo style winding path)
  const offsets = [0, 56, 80, 56, 0, -56, -80, -56];

  const unitGrad = {
    blue: "linear-gradient(135deg, #0062E0, #1A7FFF)",
    teal: "linear-gradient(135deg, #0D9488, #14B8A6)",
    lav:  "linear-gradient(135deg, #7C3AED, #8B5CF6)",
  };
  const unitShadow = {
    blue: "0 8px 20px -4px rgba(26,127,255,0.35)",
    teal: "0 8px 20px -4px rgba(20,184,166,0.35)",
    lav:  "0 8px 20px -4px rgba(139,92,246,0.35)",
  };
  const nodeDone = {
    blue: "linear-gradient(145deg, #4da0ff, #0062E0)",
    teal: "linear-gradient(145deg, #2dd4bf, #14b8a6)",
    lav:  "linear-gradient(145deg, #a78bfa, #8b5cf6)",
  };
  const nodeDoneShadow = {
    blue: "0 4px 0 #0062E0, 0 8px 20px -4px rgba(26,127,255,0.35)",
    teal: "0 4px 0 #0D9488, 0 8px 20px -4px rgba(20,184,166,0.35)",
    lav:  "0 4px 0 #6D28D9, 0 8px 20px -4px rgba(139,92,246,0.35)",
  };

  const xpTotal = perfil.xp;
  const totalCompletos = capitulos.filter((c) => progressoCompleto.has(`${trilha}_${c.id}`)).length;
  const pctTotal = Math.round(totalCompletos / capitulos.length * 100);

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* Status bar */}
      <div className="status-bar" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button onClick={onVoltar} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text-2)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        {/* Streak */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: "9999px", padding: "5px 12px", fontSize: "12px", fontWeight: 800, color: "#c2410c" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          {perfil.sequencia} dias
        </div>
        {/* XP */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", background: "var(--blue-tint)", border: "1.5px solid var(--blue-lt)", borderRadius: "9999px", padding: "5px 12px", fontSize: "12px", fontWeight: 800, color: "var(--blue-dk)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          {xpTotal.toLocaleString()} Maná
        </div>
        {/* Lives */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", background: "#fff1f2", border: "1.5px solid #fecdd3", borderRadius: "9999px", padding: "5px 12px", fontSize: "12px", fontWeight: 800, color: "#be123c", marginLeft: "auto" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          {vidas}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "40px" }}>
        {/* Chapter progress */}
        <div style={{ padding: "14px 20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-2)" }}>Progresso · {titulo}</span>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--blue-dk)" }}>{pctTotal}%</span>
          </div>
          <div className="xp-track"><div className="xp-fill" style={{ width: `${pctTotal}%`, animation: "grow 1.2s cubic-bezier(.34,1.56,.64,1) both" }} /></div>
        </div>

        {/* Unit band */}
        <div style={{ padding: "24px 16px 0" }}>
          {/* Unit header card */}
          <div style={{
            background: unitGrad[unitColor as keyof typeof unitGrad],
            boxShadow: unitShadow[unitColor as keyof typeof unitShadow],
            borderRadius: "28px", padding: "18px 20px",
            display: "flex", alignItems: "center", gap: "14px",
            marginBottom: "24px", position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: "120px", height: "120px", background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ width: "48px", height: "48px", borderRadius: "16px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: "2px" }}>Trilha</div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "rgba(255,255,255,0.98)", letterSpacing: "-0.02em" }}>{titulo}</div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.65)", marginTop: "2px" }}>{capitulos.length} lições</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>

          {/* Nodes */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {capitulos.map((cap, idx) => {
              const chave = `${trilha}_${cap.id}`;
              const completo = progressoCompleto.has(chave);
              const bloqueado = idx > 0 && !progressoCompleto.has(`${trilha}_${capitulos[idx - 1].id}`);
              const atual = idx === idxAtual;
              const offset = offsets[idx % 8];

              let nodeBg, nodeShadow, nodeAnim = "";
              if (completo) {
                nodeBg = nodeDone[unitColor as keyof typeof nodeDone];
                nodeShadow = nodeDoneShadow[unitColor as keyof typeof nodeDoneShadow];
              } else if (atual) {
                nodeBg = unitColor === "teal"
                  ? "linear-gradient(145deg, #5eead4, #14b8a6)"
                  : unitColor === "lav"
                    ? "linear-gradient(145deg, #c4b5fd, #8b5cf6)"
                    : "linear-gradient(145deg, #38bdf8, #1A7FFF)";
                nodeShadow = unitColor === "teal"
                  ? "0 4px 0 #0D9488, 0 0 0 5px rgba(20,184,166,0.15), 0 8px 20px -4px rgba(20,184,166,0.35)"
                  : unitColor === "lav"
                    ? "0 4px 0 #6D28D9, 0 0 0 5px rgba(139,92,246,0.15)"
                    : "0 4px 0 #0062E0, 0 0 0 5px rgba(26,127,255,0.15), var(--shadow-blue)";
                nodeAnim = unitColor === "teal" ? "pulse-teal 2s ease-in-out infinite" : "pulse-node 2s ease-in-out infinite";
              } else if (bloqueado) {
                nodeBg = "linear-gradient(145deg, #E5E7EB, #D1D5DB)";
                nodeShadow = "0 4px 0 #9CA3AF";
              } else {
                nodeBg = "linear-gradient(145deg, #60a5fa, #2563eb)";
                nodeShadow = "0 4px 0 #1d4ed8, var(--shadow-blue)";
              }

              const stars = completo ? (progressoEtapas[chave] !== undefined
                ? Math.min(3, Math.ceil((progressoEtapas[chave] as number) / (cap.etapas?.length || 1) * 3))
                : 3) : 0;

              return (
                <div key={cap.id} style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1, width: "100%", height: "88px" }}>
                  <div style={{
                    transform: `translateX(${offset}px)`,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                    position: "relative",
                  }}>
                    {/* Crown on active */}
                    {atual && (
                      <div style={{ position: "absolute", top: "-22px", left: "50%", transform: "translateX(-50%)", animation: "bounce-crown 1.5s ease-in-out infinite", fontSize: "16px" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/></svg>
                      </div>
                    )}

                    <button
                      disabled={bloqueado}
                      onClick={() => {
                        if (bloqueado) return;
                        setTooltipIdx(tooltipIdx === idx ? null : idx);
                      }}
                      style={{
                        width: "64px", height: "64px",
                        borderRadius: "50%",
                        border: "none",
                        background: nodeBg,
                        boxShadow: nodeShadow,
                        cursor: bloqueado ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        position: "relative",
                        animation: nodeAnim,
                        transition: "transform 0.15s",
                      }}
                    >
                      {bloqueado
                        ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        : <span style={{ fontSize: "24px", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}>{cap.icone}</span>
                      }
                      {/* Stars */}
                      {completo && stars > 0 && (
                        <div style={{ position: "absolute", bottom: "-4px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "1px" }}>
                          {[1,2,3].map(s => (
                            <svg key={s} width="11" height="11" viewBox="0 0 24 24" fill={s <= stars ? "#FBBF24" : "rgba(255,255,255,0.3)"} stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          ))}
                        </div>
                      )}
                    </button>

                    <span style={{
                      fontSize: "11px", fontWeight: 700,
                      color: bloqueado ? "var(--text-3)" : atual ? "var(--blue-dk)" : completo ? "var(--text-1)" : "var(--text-2)",
                      whiteSpace: "nowrap", letterSpacing: "-0.01em",
                    }}>{cap.titulo}</span>
                  </div>

                  {/* Tooltip on active/selected */}
                  {tooltipIdx === idx && !bloqueado && (
                    <div style={{
                      position: "absolute",
                      top: "96px",
                      left: "50%",
                      transform: `translateX(calc(-50% + ${offset}px))`,
                      zIndex: 20,
                      animation: "tooltip-in 0.3s cubic-bezier(.34,1.56,.64,1) both",
                    }}>
                      <div style={{
                        background: "white",
                        border: "1.5px solid var(--blue-lt)",
                        borderRadius: "var(--r-xl)",
                        padding: "14px 18px",
                        boxShadow: "var(--shadow-lg)",
                        width: "240px",
                      }}>
                        <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-0)", marginBottom: "3px" }}>{cap.titulo}</div>
                        {(cap as any).desc && <div style={{ fontSize: "12px", color: "var(--text-2)", lineHeight: 1.45, marginBottom: "10px" }}>{(cap as any).desc}</div>}
                        <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                          {cap.etapas && (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, padding: "3px 9px", borderRadius: "9999px", color: "var(--blue-dk)", background: "var(--blue-tint)", border: "1px solid var(--blue-lt)" }}>
                              {cap.etapas.length} etapas
                            </span>
                          )}
                          <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, padding: "3px 9px", borderRadius: "9999px", color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                            {completo ? "Completo!" : "+Maná"}
                          </span>
                        </div>
                        <button
                          className="btn-primary"
                          onClick={() => { setTooltipIdx(null); onCapitulo(cap, idx); }}
                          style={{ width: "100%", padding: "11px", fontSize: "13px" }}
                        >
                          {completo ? "Revisar lição" : "Iniciar lição"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tela MISSOES ──────────────────────────────────────────────────
function TelaMissoes({
  perfil, missoesCompletas, onConcluir, onVoltar,
}: {
  perfil: Perfil;
  missoesCompletas: MissaoConcluida[];
  onConcluir: (mc: MissaoConcluida, xp: number, talentos: number) => void;
  onVoltar: () => void;
}) {
  const missao = getMissaoHoje();
  const hoje = new Date().toISOString().split("T")[0];
  const jaConcluidaHoje = missoesCompletas.find(mc => mc.missaoId === missao.id && mc.data === hoje);
  const [reflexao, setReflexao] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [recompensas, setRecompensas] = useState({ xp: 0, talentos: 0 });

  function handleConcluir() {
    if (!reflexao.trim()) return;
    setEnviando(true);
    sfxCapituloCompleto();
    const mc: MissaoConcluida = { missaoId: missao.id, data: hoje, reflexao: reflexao.trim(), xpGanho: missao.xp };
    setTimeout(() => {
      onConcluir(mc, missao.xp, missao.talentos);
      setRecompensas({ xp: missao.xp, talentos: missao.talentos });
      setConcluido(true);
      setEnviando(false);
      setConfirmando(false);
    }, 400);
  }

  if (concluido) {
    return (
      <div style={{ position: "fixed", inset: 0, background: `linear-gradient(150deg, #38BDF8 0%, #1A7FFF 45%, #0062E0 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", zIndex: 100 }}>
        <div style={{ animation: "missao-float 2.4s ease-in-out infinite", marginBottom: "20px" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>

        <h2 style={{
          animation: "missao-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
          fontSize: "26px", fontWeight: "800",
          color: "white", textAlign: "center", marginBottom: "6px",
          letterSpacing: "-0.02em",
        }}>
          Missão Concluída!
        </h2>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "14px", fontStyle: "italic", marginBottom: "28px", textAlign: "center", fontFamily: "var(--font-verse)" }}>
          {missao.titulo}
        </p>

        <div style={{
          background: "rgba(255,255,255,0.15)",
          border: "1.5px solid rgba(255,255,255,0.4)",
          backdropFilter: "blur(10px)",
          borderRadius: "20px",
          padding: "24px 48px", textAlign: "center", marginBottom: "28px",
        }}>
          <div style={{ fontSize: "36px", fontWeight: "800", color: "white" }}>
            +{recompensas.xp} Maná
          </div>
          <div style={{ fontSize: "18px", color: "rgba(255,255,255,0.8)", marginTop: "4px" }}>
            +{recompensas.talentos} Talentos
          </div>
        </div>

        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", fontStyle: "italic", textAlign: "center", maxWidth: "300px", marginBottom: "32px", lineHeight: 1.7, fontFamily: "var(--font-verse)" }}>
          &ldquo;{missao.versiculo}&rdquo;
          <br />
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", fontStyle: "normal", fontFamily: "var(--font-ui)" }}>— {missao.referencia}</span>
        </p>

        <button onClick={onVoltar} style={{
          padding: "16px 48px", fontSize: "15px", fontWeight: 700, cursor: "pointer",
          background: "white", color: DS.blue, border: "none", borderRadius: "var(--r-md)",
          boxShadow: "0 4px 14px rgba(0,0,0,0.15)", letterSpacing: "-0.01em",
        }}>
          Ir para Início ✦
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* Header */}
      <div className="status-bar" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={onVoltar} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text-2)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize: "16px", fontWeight: "800", color: DS.t0, letterSpacing: "-0.02em" }}>Missões Diárias</span>
        <div style={{ marginLeft: "auto" }}>
          <span className="badge badge-blue">{missoesCompletas.length} concluídas</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 80px" }}>

        {/* Missão do Dia */}
        <div style={{ marginBottom: "6px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: DS.blue, letterSpacing: "0.08em", marginBottom: "10px", textTransform: "uppercase" }}>
            MISSÃO DE HOJE
          </p>

          <div className="card-verbum" style={{
            border: `2px solid ${DS.blueLt}`,
            padding: "20px",
            marginBottom: "12px",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* decorative corner */}
            <div style={{ position: "absolute", top: 0, right: 0, width: "80px", height: "80px", background: `linear-gradient(225deg, ${DS.blueTint}, transparent)`, borderRadius: "0 16px 0 80px" }} />

            {/* XP badge */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
              <span className="badge badge-blue">
                +{missao.xp} Maná · +{missao.talentos} Talentos
              </span>
              {jaConcluidaHoje && (
                <span className="badge badge-success">✓ Concluída</span>
              )}
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: "800", color: DS.t0, marginBottom: "8px", letterSpacing: "-0.02em" }}>
              {missao.titulo}
            </h2>
            <p style={{ fontSize: "14px", color: DS.t1, fontWeight: "600", marginBottom: "14px", lineHeight: 1.5 }}>
              {missao.descricao}
            </p>

            {/* Divisor */}
            <div style={{ height: "1px", background: DS.border, margin: "12px 0" }} />

            {/* Devocional */}
            <p style={{ fontSize: "13px", color: DS.t1, lineHeight: 1.7, marginBottom: "14px" }}>
              {missao.devocional}
            </p>

            {/* Versículo */}
            <div style={{
              background: DS.blueTint,
              borderRadius: "var(--r-md)", padding: "14px 16px",
              borderLeft: `4px solid ${DS.blue}`,
            }}>
              <p style={{ fontStyle: "italic", color: DS.t0, fontSize: "13px", lineHeight: 1.6, marginBottom: "6px", fontFamily: "var(--font-verse)" }}>
                "{missao.versiculo}"
              </p>
              <span style={{ fontSize: "11px", color: DS.blue, fontWeight: 700 }}>— {missao.referencia}</span>
            </div>
          </div>

          {/* Ação */}
          {!jaConcluidaHoje ? (
            !confirmando ? (
              <button onClick={() => setConfirmando(true)} className="btn-primary"
                style={{ width: "100%", padding: "15px", fontSize: "14px" }}>
                Concluir Missão ✦
              </button>
            ) : (
              <div className="card-verbum" style={{ padding: "16px 20px" }}>
                <p style={{ fontSize: "12px", fontWeight: "700", color: DS.t0, marginBottom: "10px", letterSpacing: "0.03em" }}>
                  O QUE VOCÊ APRENDEU COM ESSA MISSÃO?
                </p>
                <textarea
                  value={reflexao}
                  onChange={e => setReflexao(e.target.value)}
                  placeholder="Escreva sua reflexão, o que sentiu, o que aconteceu..."
                  className="input-verbum"
                  style={{ minHeight: "100px", resize: "vertical", lineHeight: 1.6 }}
                />
                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button onClick={() => setConfirmando(false)} className="btn-outline"
                    style={{ flex: 1, padding: "12px", fontSize: "13px" }}>
                    Cancelar
                  </button>
                  <button
                    onClick={handleConcluir}
                    disabled={!reflexao.trim() || enviando}
                    className="btn-primary"
                    style={{ flex: 2, padding: "12px", fontSize: "13px", opacity: reflexao.trim() ? 1 : 0.5 }}>
                    {enviando ? "Salvando..." : "Registrar Reflexão ✦"}
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Reflexão já registrada */
            <div className="card-verbum" style={{ padding: "16px 20px", borderLeft: `4px solid ${DS.success}` }}>
              <p style={{ fontSize: "11px", fontWeight: "700", color: DS.success, marginBottom: "8px" }}>
                ✓ SUA REFLEXÃO DE HOJE
              </p>
              <p style={{ fontSize: "13px", color: DS.t1, lineHeight: 1.6, fontStyle: "italic", fontFamily: "var(--font-verse)" }}>
                "{jaConcluidaHoje.reflexao}"
              </p>
            </div>
          )}
        </div>

        {/* Diário de Fé */}
        {missoesCompletas.length > 0 && (
          <div style={{ marginTop: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ flex: 1, height: "1px", background: DS.border }} />
              <span style={{ fontSize: "12px", fontWeight: 700, color: DS.t2 }}>Diário de Fé</span>
              <div style={{ flex: 1, height: "1px", background: DS.border }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[...missoesCompletas].reverse().map((mc, i) => {
                const m = MISSOES.find(x => x.id === mc.missaoId);
                if (!m) return null;
                const dataFmt = new Date(mc.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
                return (
                  <div key={i} className="card-verbum" style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: DS.t0 }}>{m.titulo}</span>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span className="badge badge-blue">+{mc.xpGanho} Maná</span>
                        <span style={{ fontSize: "11px", color: DS.t2 }}>{dataFmt}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: "12px", color: DS.t1, lineHeight: 1.5, fontStyle: "italic", fontFamily: "var(--font-verse)" }}>
                      "{mc.reflexao}"
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {missoesCompletas.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 16px", color: DS.t2, fontSize: "13px", fontStyle: "italic" }}>
            Complete a primeira missão para começar seu Diário de Fé.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tela ETAPAS ───────────────────────────────────────────────────
function TelaEtapas({
  capitulo, trilha, progressoEtapas, onEtapa, onVoltar,
}: {
  capitulo: Capitulo; trilha: Trilha; progressoEtapas: number;
  onEtapa: (idx: number) => void; onVoltar: () => void;
}) {
  const etapas = capitulo.etapas ?? [];
  const nomes = ["Iniciante", "Aprendiz", "Conhecedor", "Sábio", "Mestre"];

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <div className="status-bar" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={onVoltar} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text-2)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize: "16px", fontWeight: "800", color: DS.t0, letterSpacing: "-0.02em" }}>{capitulo.titulo}</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 80px" }}>
        {/* Capítulo info */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ position: "relative", display: "inline-block", width: "76px", height: "76px", marginBottom: "12px" }}>
            <div style={{
              width: "76px", height: "76px", borderRadius: "50%",
              background: `linear-gradient(135deg, ${DS.blue}, ${DS.blueDk})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "28px",
              boxShadow: DS.shBlue,
            }}>{capitulo.icone}</div>
            <AnelProgresso completas={progressoEtapas} total={etapas.length} />
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: DS.t0, marginTop: "8px", letterSpacing: "-0.02em" }}>{capitulo.titulo}</div>
          <div style={{ fontSize: "12px", color: DS.t2, marginTop: "4px" }}>{capitulo.subtitulo}</div>
          <div style={{ fontSize: "12px", color: DS.blue, marginTop: "8px", fontWeight: "700" }}>
            {progressoEtapas}/{etapas.length} etapas concluídas
          </div>
        </div>

        {/* Lista de etapas */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "380px", margin: "0 auto" }}>
          {etapas.map((etapa, i) => {
            const completa = i < progressoEtapas;
            const atual = i === progressoEtapas;
            const bloqueada = i > progressoEtapas;
            return (
              <button key={i} disabled={bloqueada}
                onClick={() => { sfxClick(); !bloqueada && onEtapa(i); }}
                style={{
                  padding: "14px 18px", borderRadius: "var(--r-lg)",
                  cursor: bloqueada ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: "14px", textAlign: "left",
                  background: completa ? DS.blueTint : atual ? `linear-gradient(135deg, ${DS.blue}, ${DS.blueDk})` : DS.white,
                  border: `2px solid ${completa ? DS.blue : atual ? DS.blue : DS.border}`,
                  boxShadow: atual ? DS.shBlue : DS.shSm,
                  opacity: bloqueada ? 0.45 : 1,
                  transition: "all 0.15s",
                  width: "100%",
                }}>
                <div style={{
                  width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
                  background: completa ? DS.blue : atual ? "rgba(255,255,255,0.2)" : DS.border,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "14px", fontWeight: "700",
                  color: completa ? "white" : atual ? "white" : DS.t2,
                }}>
                  {completa ? "✓" : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: atual ? "white" : completa ? DS.blue : DS.t0 }}>
                    Etapa {i + 1} — {nomes[i] ?? "Desafio"}
                  </div>
                  <div style={{ fontSize: "11px", color: atual ? "rgba(255,255,255,0.7)" : DS.t2, marginTop: "2px" }}>
                    {etapa.length} questões
                  </div>
                </div>
                {completa && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={DS.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
                {bloqueada && (
                  <svg width="16" height="18" viewBox="0 0 24 24" fill="none" stroke={DS.t3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                )}
                {atual && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M5 3l14 9-14 9V3z"/></svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Tela QUIZ ─────────────────────────────────────────────────────
function TelaQuiz({
  capitulo, trilha, perfil, vidas, questoes: questoesProp,
  onConcluir, onSemVidas,
}: {
  capitulo: Capitulo; trilha: Trilha; perfil: Perfil; vidas: number;
  questoes?: Questao[];
  onConcluir: (acertos: number, xpGanho: number, talentosGanho: number) => void;
  onSemVidas: () => void;
}) {
  const questoesPrincipais = questoesProp ?? capitulo.perguntas;
  const [idx, setIdx] = useState(0);
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [confirmada, setConfirmada] = useState(false);
  const [acertos, setAcertos] = useState(0);
  const [vidasRestantes, setVidasRestantes] = useState(vidas);
  const [xpGanho, setXpGanho] = useState(0);
  const [talentosGanho, setTalentosGanho] = useState(0);
  const [feedback, setFeedback] = useState<{ certa: boolean; explicacao: string } | null>(null);
  const [pistaIdx, setPistaIdx] = useState(1);
  const [ordemToque, setOrdemToque] = useState<number[]>([]);
  const [wrongList, setWrongList] = useState<Questao[]>([]);
  const [phase, setPhase] = useState<"main" | "review-intro" | "review">("main");
  const [reviewList, setReviewList] = useState<Questao[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const avisoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [msgMotivacional, setMsgMotivacional] = useState<string | null>(null);
  const [msgMotivacionalRef, setMsgMotivacionalRef] = useState<string | null>(null);

  const MSGS_MOTIVACIONAIS = [
    { texto: "\"Tudo posso naquele que me fortalece.\"", ref: "— Filipenses 4:13" },
    { texto: "\"O Senhor é o meu pastor e nada me faltará.\"", ref: "— Salmos 23:1" },
    { texto: "\"Sede fortes e corajosos. Não temais!\"", ref: "— Deuteronômio 31:6" },
    { texto: "\"Confiai no Senhor de todo o coração.\"", ref: "— Provérbios 3:5" },
    { texto: "\"Buscai primeiro o Reino de Deus.\"", ref: "— Mateus 6:33" },
    { texto: "\"Com Deus, nada é impossível.\"", ref: "— Lucas 1:37" },
  ];

  function mostrarAviso(msg: string) {
    if (avisoRef.current) clearTimeout(avisoRef.current);
    setAviso(msg);
    avisoRef.current = setTimeout(() => setAviso(null), 2800);
  }

  useEffect(() => {
    if (phase !== "review-intro") return;
    const t = setTimeout(() => setPhase("review"), 2500);
    return () => clearTimeout(t);
  }, [phase]);

  const isReview = phase === "review";
  const questoes = isReview ? reviewList : questoesPrincipais;
  const questaoAtual = isReview ? reviewIdx : idx;
  const q = questoes[questaoAtual];
  const opcoes = q ? getOpcoes(q) : [];
  const correta = q ? getCorreta(q) : 0;
  const progressoPct = questoes.length > 0 ? (questaoAtual / questoes.length) * 100 : 0;
  const isOrdenar = q?.tipo === "ordenar_eventos";

  function resetQuestao() {
    setFeedback(null); setSelecionada(null); setConfirmada(false);
    setPistaIdx(1); setOrdemToque([]);
  }

  function confirmar() {
    if (!q) return;
    if (isOrdenar) {
      if (ordemToque.length < opcoes.length) return;
      const ordemCorreta = (q as any).ordemCorreta as number[];
      const certa = ordemToque.every((v, i) => v === ordemCorreta[i]);
      setConfirmada(true); setSelecionada(ordemCorreta[0]);
      if (certa) {
        sfxAcerto();
        if (!isReview) { setAcertos(a => a + 1); setXpGanho(x => x + XP_QUESTAO_CERTA); setTalentosGanho(t => t + TALENTOS_QUESTAO_CERTA); }
      } else {
        sfxErro();
        if (!isReview) {
          setWrongList(prev => [...prev, q]);
          const nv = vidasRestantes - 1; setVidasRestantes(nv); sfxVidaPerdida();
          mostrarAviso(`❤️ ${nv} vida${nv !== 1 ? "s" : ""} restante${nv !== 1 ? "s" : ""}!`);
          if (nv <= 0) { setTimeout(onSemVidas, 1200); return; }
        }
      }
      setFeedback({ certa, explicacao: (q as any).explicacao ?? "" }); return;
    }
    if (selecionada === null) return;
    const certa = selecionada === correta;
    setConfirmada(true);
    if (certa) {
      sfxAcerto();
      if (!isReview) { setAcertos(a => a + 1); setXpGanho(x => x + XP_QUESTAO_CERTA); setTalentosGanho(t => t + TALENTOS_QUESTAO_CERTA); }
    } else {
      sfxErro();
      if (!isReview) {
        setWrongList(prev => [...prev, q]);
        const nv = vidasRestantes - 1; setVidasRestantes(nv); sfxVidaPerdida();
        mostrarAviso(`❤️ ${nv} vida${nv !== 1 ? "s" : ""} restante${nv !== 1 ? "s" : ""}!`);
        if (nv <= 0) { setTimeout(onSemVidas, 1200); return; }
      }
    }
    setFeedback({ certa, explicacao: (q as any).explicacao ?? "" });
  }

  function avancarProximo() {
    resetQuestao();
    if (isReview) {
      if (reviewIdx + 1 >= reviewList.length) {
        sfxCapituloCompleto();
        onConcluir(acertos, xpGanho, talentosGanho);
      } else { setReviewIdx(i => i + 1); }
      return;
    }
    if (idx + 1 >= questoesPrincipais.length) {
      const erros = wrongList.filter((q2, i, arr) => arr.indexOf(q2) === i);
      if (erros.length > 0) {
        sfxRevisao();
        setReviewList(erros); setReviewIdx(0); setPhase("review-intro");
      } else {
        const bonus = acertos === questoesPrincipais.length ? 50 : 0;
        sfxCapituloCompleto();
        onConcluir(acertos, xpGanho + bonus, talentosGanho + (acertos === questoesPrincipais.length ? TALENTOS_CAPITULO_COMPLETO : 0));
      }
    } else { setIdx(i => i + 1); }
  }

  function proximo() {
    if (!isReview && (idx + 1) % 5 === 0 && idx + 1 < questoesPrincipais.length) {
      const msg = MSGS_MOTIVACIONAIS[Math.floor(Math.random() * MSGS_MOTIVACIONAIS.length)];
      setMsgMotivacional(msg.texto);
      setMsgMotivacionalRef(msg.ref);
      resetQuestao();
      return;
    }
    avancarProximo();
  }

  const corFeedback = feedback?.certa ? DS.acerto : DS.erro;
  const bordaFeedback = feedback?.certa ? DS.verde : DS.vermelho;
  const podeVerificar = isOrdenar ? ordemToque.length === opcoes.length : selecionada !== null;

  if (phase === "review-intro") return (
    <div style={{ position: "fixed", inset: 0, background: `linear-gradient(145deg, #FFF1F0, #FFE4E1)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", padding: "32px" }}>
      <style>{`@keyframes rl { from{width:0%} to{width:100%} }`}</style>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={DS.error} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.37"/>
        </svg>
      </div>
      <h2 style={{ fontSize: "24px", fontWeight: "800", color: DS.t0, letterSpacing: "-0.02em", textAlign: "center" }}>Revisão de Erros</h2>
      <p style={{ color: DS.t1, fontSize: "15px", textAlign: "center", lineHeight: 1.6 }}>
        Você errou <strong style={{ color: DS.error }}>{reviewList.length}</strong> questão{reviewList.length !== 1 ? "ões" : ""}.<br />
        Vamos revisar para fixar o aprendizado!
      </p>
      <div style={{ width: "60px", height: "6px", borderRadius: "3px", background: DS.border, overflow: "hidden" }}>
        <div style={{ height: "100%", background: DS.error, borderRadius: "3px", animation: "rl 2.5s linear forwards" }} />
      </div>
    </div>
  );

  if (msgMotivacional) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", zIndex: 200 }}>
      <div className="card-verbum" style={{ padding: "32px 28px", maxWidth: "380px", width: "100%", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: DS.blueTint, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={DS.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </div>
        <p style={{ fontFamily: "var(--font-verse)", fontSize: "18px", color: DS.t0, lineHeight: 1.7, fontStyle: "italic", marginBottom: "12px" }}>
          {msgMotivacional}
        </p>
        <p style={{ fontSize: "13px", color: DS.blue, fontWeight: "700", marginBottom: "24px" }}>{msgMotivacionalRef}</p>
        <button
          onClick={() => { setMsgMotivacional(null); setMsgMotivacionalRef(null); avancarProximo(); }}
          className="btn-primary"
          style={{ width: "100%", padding: "14px", fontSize: "14px" }}
        >
          Continuar →
        </button>
      </div>
    </div>
  );

  if (!q) return null;

  function renderEnunciado() {
    if (q.tipo === "quem_disse") {
      return (
        <div style={{ marginBottom: "16px" }}>
          <div className="card-verbum" style={{ padding: "20px 22px", position: "relative", borderLeft: `4px solid ${DS.blue}` }}>
            <span style={{ position: "absolute", top: "10px", left: "14px", fontSize: "40px", color: DS.blue, opacity: 0.2, lineHeight: 1, fontFamily: "Georgia" }}>"</span>
            <p style={{ fontSize: "17px", color: DS.t0, lineHeight: 1.7, fontStyle: "italic", textAlign: "center", padding: "14px 10px 4px", fontFamily: "var(--font-verse)" }}>{sub((q as any).frase, perfil.nome)}</p>
            <span style={{ position: "absolute", bottom: "10px", right: "14px", fontSize: "40px", color: DS.blue, opacity: 0.2, lineHeight: 1, fontFamily: "Georgia" }}>"</span>
          </div>
          <p style={{ textAlign: "center", fontSize: "12px", color: DS.t2, marginTop: "8px" }}>Quem pronunciou estas palavras?</p>
        </div>
      );
    }
    if (q.tipo === "completar_versiculo") {
      const partes = sub((q as any).versiculo, perfil.nome).split("___");
      const palavraSel = selecionada !== null ? opcoes[selecionada] : null;
      return (
        <div className="card-verbum" style={{ padding: "18px 20px", marginBottom: "16px", borderLeft: `4px solid ${DS.blue}` }}>
          <p style={{ fontSize: "11px", color: DS.blue, fontWeight: 700, marginBottom: "10px", letterSpacing: "0.05em" }}>{(q as any).referencia}</p>
          <p style={{ fontSize: "16px", color: DS.t0, lineHeight: 1.8, fontStyle: "italic", fontFamily: "var(--font-verse)" }}>
            {partes[0]}
            <span style={{ display: "inline-block", minWidth: "80px", textAlign: "center", borderBottom: `2px solid ${confirmada ? (selecionada === correta ? DS.success : DS.error) : DS.blue}`, padding: "0 8px", fontStyle: "normal", fontWeight: "700", color: confirmada ? (selecionada === correta ? DS.success : DS.error) : DS.blue }}>
              {palavraSel ?? "___"}
            </span>
            {partes[1] ?? ""}
          </p>
        </div>
      );
    }
    if (q.tipo === "personagem_misterio") {
      const pistas = (q as any).pistas as string[];
      return (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
            {pistas.slice(0, pistaIdx).map((pista: string, i: number) => (
              <div key={i} className="card-verbum" style={{ padding: "12px 16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0, background: DS.blue, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700" }}>{i + 1}</span>
                <p style={{ fontSize: "14px", color: DS.t1, lineHeight: 1.5, fontStyle: "italic", flex: 1, fontFamily: "var(--font-verse)" }}>{sub(pista, perfil.nome)}</p>
              </div>
            ))}
          </div>
          {!confirmada && pistaIdx < pistas.length && (
            <button onClick={() => setPistaIdx(p => p + 1)} className="btn-outline" style={{ width: "100%", padding: "10px", fontSize: "13px", borderStyle: "dashed" }}>
              🔍 Ver próxima pista ({pistas.length - pistaIdx} restante{pistas.length - pistaIdx !== 1 ? "s" : ""})
            </button>
          )}
        </div>
      );
    }
    if (q.tipo === "ordenar_eventos") {
      return (
        <div style={{ marginBottom: "16px" }}>
          <div className="card-verbum" style={{ padding: "12px 16px", marginBottom: "12px" }}>
            <p style={{ fontSize: "14px", color: DS.t1, lineHeight: 1.5, fontStyle: "italic", fontFamily: "var(--font-verse)" }}>{sub((q as any).enunciado, perfil.nome)}</p>
          </div>
          <p style={{ fontSize: "11px", color: DS.t2, marginBottom: "8px", textAlign: "center" }}>Toque na ordem correta (do 1º ao último):</p>
        </div>
      );
    }
    return (
      <div className="card-verbum" style={{ padding: "16px 20px", marginBottom: "16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <SvgPersonagem tipo={perfil.personagem_tipo} cor={perfil.personagem_cor} size={56} />
        <p style={{ fontSize: "15px", color: DS.t1, lineHeight: 1.6, fontStyle: "italic", flex: 1, fontFamily: "var(--font-verse)" }}>{getEnunciado(q, perfil.nome)}</p>
      </div>
    );
  }

  function renderOpcoes() {
    if (q.tipo === "fato_fake" || q.tipo === "verdade_mito") {
      const labels = q.tipo === "fato_fake"
        ? [{ emoji: "✅", texto: "É FATO!" }, { emoji: "❌", texto: "É FAKE!" }]
        : [{ emoji: "✅", texto: "VERDADE!" }, { emoji: "🚫", texto: "É MITO!" }];
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          {labels.map((label, i) => {
            let bg = DS.white, borda = DS.border, cor = DS.t0;
            if (confirmada) {
              if (i === correta) { bg = "#ECFDF5"; borda = DS.success; cor = DS.success; }
              else if (i === selecionada) { bg = "#FFF1F0"; borda = DS.error; cor = DS.error; }
              else { bg = DS.white; borda = DS.border; cor = DS.t2; }
            } else if (i === selecionada) {
              bg = DS.blueTint; borda = DS.blue; cor = DS.blue;
            }
            return (
              <button key={i} onClick={() => !confirmada && setSelecionada(i)} style={{ padding: "20px 10px", borderRadius: "12px", cursor: confirmada ? "default" : "pointer", border: `2px solid ${borda}`, background: bg, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", transition: "all 0.15s", boxShadow: i === selecionada && !confirmada ? DS.shBlue : DS.shSm }}>
                <span style={{ fontSize: "32px", lineHeight: 1 }}>{label.emoji}</span>
                <span style={{ fontSize: "13px", fontWeight: "700", color: cor, letterSpacing: "0.01em" }}>{label.texto}</span>
              </button>
            );
          })}
        </div>
      );
    }
    if (q.tipo === "completar_versiculo") {
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px", justifyContent: "center" }}>
          {opcoes.map((op, i) => {
            let bg = DS.white, borda = DS.border, cor = DS.t0;
            if (confirmada) { if (i === correta) { bg = "#ECFDF5"; borda = DS.success; cor = DS.success; } else if (i === selecionada) { bg = "#FFF1F0"; borda = DS.error; cor = DS.error; } }
            else if (i === selecionada) { bg = DS.blueTint; borda = DS.blue; cor = DS.blue; }
            return (
              <button key={i} onClick={() => !confirmada && setSelecionada(i)} style={{ padding: "10px 22px", borderRadius: "24px", cursor: confirmada ? "default" : "pointer", border: `2px solid ${borda}`, background: bg, color: cor, fontSize: "15px", fontWeight: "700", transition: "all 0.15s", boxShadow: i === selecionada && !confirmada ? DS.shBlue : DS.shSm }}>
                {confirmada && i === correta ? "✓ " : confirmada && i === selecionada && i !== correta ? "✗ " : ""}{op}
              </button>
            );
          })}
        </div>
      );
    }
    if (isOrdenar) {
      const ordemCorreta = (q as any).ordemCorreta as number[];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {opcoes.map((ev, i) => {
            const pos = ordemToque.indexOf(i); const tocado = pos !== -1;
            let bg = DS.white, borda = DS.border, cor = DS.t0, badge = tocado ? String(pos + 1) : "·", badgeBg = tocado ? DS.blue : DS.t3;
            if (confirmada && tocado) { const ok = ordemCorreta[pos] === i; if (ok) { bg = "#ECFDF5"; borda = DS.success; cor = DS.success; badgeBg = DS.success; badge = "✓"; } else { bg = "#FFF1F0"; borda = DS.error; cor = DS.error; badgeBg = DS.error; badge = "✗"; } }
            else if (tocado) { bg = DS.blueTint; borda = DS.blue; }
            return (
              <button key={i} onClick={() => { if (confirmada) return; tocado ? setOrdemToque(p => p.filter(x => x !== i)) : setOrdemToque(p => [...p, i]); }} style={{ padding: "12px 16px", borderRadius: "var(--r-md)", cursor: confirmada ? "default" : "pointer", display: "flex", alignItems: "center", gap: "12px", textAlign: "left", border: `1.5px solid ${borda}`, background: bg, fontSize: "14px", color: cor, transition: "all 0.15s", width: "100%", boxShadow: tocado && !confirmada ? DS.shBlue : DS.shSm }}>
                <span style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: badgeBg, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700" }}>{badge}</span>
                <span style={{ flex: 1 }}>{ev}</span>
              </button>
            );
          })}
          {!confirmada && ordemToque.length > 0 && ordemToque.length < opcoes.length && (
            <p style={{ fontSize: "11px", color: DS.t2, textAlign: "center", marginTop: "4px" }}>{ordemToque.length}/{opcoes.length} — toque para ordenar todos</p>
          )}
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        {opcoes.map((op, i) => {
          let bg = DS.white, borda = DS.border, cor = DS.t0, badgeBg = DS.t3;
          if (confirmada) {
            if (i === correta) { bg = "#ECFDF5"; borda = DS.success; cor = DS.success; badgeBg = DS.success; }
            else if (i === selecionada) { bg = "#FFF1F0"; borda = DS.error; cor = DS.error; badgeBg = DS.error; }
          } else if (i === selecionada) { bg = DS.blueTint; borda = DS.blue; cor = DS.blue; badgeBg = DS.blue; }
          return (
            <button key={i} style={{ padding: "13px 16px", borderRadius: "var(--r-md)", cursor: confirmada ? "default" : "pointer", display: "flex", alignItems: "center", gap: "12px", textAlign: "left", border: `1.5px solid ${borda}`, background: bg, fontSize: "15px", color: cor, transition: "all 0.15s", width: "100%", boxShadow: i === selecionada && !confirmada ? DS.shBlue : DS.shSm }} onClick={() => !confirmada && setSelecionada(i)}>
              <span style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: badgeBg, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700" }}>
                {confirmada && i === correta ? "✓" : confirmada && i === selecionada && i !== correta ? "✗" : String.fromCharCode(65 + i)}
              </span>
              <span style={{ flex: 1 }}>{op}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: DS.bg }}>
      <style>{`@keyframes fi { from{opacity:0;transform:translateX(-50%) translateY(-8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }`}</style>
      {aviso && (
        <div style={{ position: "absolute", top: "68px", left: "50%", transform: "translateX(-50%)", background: DS.error, color: "white", padding: "10px 20px", borderRadius: "20px", fontSize: "13px", fontWeight: 700, zIndex: 100, boxShadow: "0 4px 12px rgba(240,68,56,0.3)", animation: "fi 0.2s ease", whiteSpace: "nowrap" }}>{aviso}</div>
      )}
      {/* Header */}
      <div className="status-bar" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button onClick={() => onConcluir(acertos, xpGanho, talentosGanho)} style={{ background: "none", border: "none", color: DS.t2, fontSize: "18px", cursor: "pointer", lineHeight: 1, padding: "2px" }}>✕</button>
        <div className="xp-track" style={{ flex: 1 }}>
          <div className="xp-fill" style={{ width: `${progressoPct}%`, background: isReview ? `linear-gradient(90deg, ${DS.error}, #f97316)` : undefined }} />
        </div>
        <span style={{ fontSize: "11px", fontWeight: 800, color: isReview ? DS.error : DS.blue, whiteSpace: "nowrap" }}>
          {questaoAtual + 1}/{questoes.length}
        </span>
        {/* Lives display */}
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          {Array.from({ length: VIDAS_MAX }, (_, i) => (
            <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < vidasRestantes ? "#be123c" : "#E5E7EB"} stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span className={isReview ? "badge badge-gray" : "badge badge-blue"} style={{ fontSize: "10px" }}>
            {isReview ? "↺ REVISÃO" : capitulo.titulo.toUpperCase()}
          </span>
          {xpGanho > 0 && <span style={{ fontSize: "11px", fontWeight: 700, color: DS.blue }}>+{xpGanho} Maná</span>}
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: "800", color: DS.t0, marginBottom: "16px", lineHeight: 1.3, letterSpacing: "-0.02em" }}>{getTitulo(q)}</h2>
        {renderEnunciado()}
        {feedback && (
          <div style={{
            background: feedback.certa ? "#ECFDF5" : "#FFF1F0",
            border: `2px solid ${feedback.certa ? DS.success : DS.error}`,
            borderLeft: `5px solid ${feedback.certa ? DS.success : DS.error}`,
            borderRadius: "12px",
            padding: "14px 16px",
            marginBottom: "14px",
          }}>
            <p style={{ fontSize: "14px", fontWeight: "700", color: feedback.certa ? DS.success : DS.error, marginBottom: "6px" }}>
              {feedback.certa ? "✓ Correto!" : "✗ Resposta errada"}
            </p>
            {!feedback.certa && opcoes[correta] && (
              <div style={{ background: "#ECFDF5", border: `1px solid ${DS.success}`, borderRadius: "8px", padding: "8px 12px", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", color: DS.success, fontWeight: "700" }}>RESPOSTA CORRETA</span>
                <p style={{ fontSize: "13px", color: DS.success, fontWeight: "600", marginTop: "2px" }}>{opcoes[correta]}</p>
              </div>
            )}
            {feedback.explicacao ? (
              <p style={{ fontSize: "12px", color: DS.t1, lineHeight: 1.6, borderTop: `1px solid ${feedback.certa ? DS.success : DS.error}30`, paddingTop: "8px", marginTop: "4px" }}>
                {feedback.explicacao}
              </p>
            ) : !feedback.certa && (
              <p style={{ fontSize: "12px", color: DS.t1, lineHeight: 1.6, fontStyle: "italic" }}>
                Não desanime — essa questão aparecerá novamente na revisão!
              </p>
            )}
          </div>
        )}
        {renderOpcoes()}
      </div>

      <div style={{ padding: "12px 20px", background: "rgba(249,250,251,0.95)", borderTop: `1px solid ${DS.borderLt}` }}>
        {!confirmada ? (
          <button onClick={() => { sfxClick(); confirmar(); }} disabled={!podeVerificar} className="btn-primary" style={{ width: "100%", padding: "14px", fontSize: "14px", opacity: podeVerificar ? 1 : 0.5 }}>Verificar</button>
        ) : (
          <button onClick={() => { sfxClick(); proximo(); }} className={feedback?.certa ? "btn-primary" : "btn-teal"} style={{ width: "100%", padding: "14px", fontSize: "14px" }}>
            {isReview ? (reviewIdx + 1 >= reviewList.length ? "Finalizar ✦" : "Próxima →") : (idx + 1 >= questoesPrincipais.length ? (wrongList.length > 0 ? "Revisar Erros 🔄" : "Ver Resultado ✦") : "Continuar →")}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Tela RESULTADO ────────────────────────────────────────────────
function TelaResultado({
  capitulo, acertos, total, xpGanho, talentosGanho, novasPecas, streakDias,
  onReiniciar, onVoltar,
}: {
  capitulo: Capitulo; acertos: number; total: number;
  xpGanho: number; talentosGanho: number;
  novasPecas: string[]; streakDias?: number;
  onReiniciar: () => void; onVoltar: () => void;
}) {
  const pct = Math.round((acertos / total) * 100);
  const perfeito = acertos === total;
  const [step, setStep] = useState<"pontos" | "ofensiva" | "arca" | "fim">("pontos");
  const arcaBonus = talentosGanho + 15;

  if (step === "pontos") return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
      <main style={{ width: "100%", maxWidth: "420px" }}>
        <div className="card-verbum" style={{ padding: "28px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "52px", marginBottom: "8px" }}>{perfeito ? "🏆" : pct >= 70 ? "⭐" : "📖"}</div>
          <h2 style={{ fontSize: "22px", fontWeight: "800", color: DS.t0, marginBottom: "4px", letterSpacing: "-0.02em" }}>
            {perfeito ? "Perfeito!" : pct >= 70 ? "Muito bem!" : "Continue praticando"}
          </h2>
          <p style={{ color: DS.t2, fontSize: "13px", marginBottom: "20px" }}>{capitulo.titulo}</p>

          <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: perfeito ? DS.warn : DS.t0 }}>{pct}%</div>
              <div style={{ fontSize: "11px", color: DS.t2 }}>{acertos}/{total} certas</div>
            </div>
            <div style={{ width: "1px", background: DS.border }} />
            <div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: DS.blue }}>+{xpGanho}</div>
              <div style={{ fontSize: "11px", color: DS.t2 }}>Maná</div>
            </div>
            <div style={{ width: "1px", background: DS.border }} />
            <div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: DS.warn }}>+{talentosGanho}</div>
              <div style={{ fontSize: "11px", color: DS.t2 }}>Talentos</div>
            </div>
          </div>

          {novasPecas.length > 0 && (
            <div style={{ background: DS.blueTint, border: `1.5px solid ${DS.blueLt}`, borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: DS.blue, marginBottom: "8px" }}>✦ ARMADURA DESBLOQUEADA ✦</p>
              {novasPecas.map(id => {
                const peca = PECAS_ARMADURA.find(p => p.id === id)!;
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
                    <span style={{ fontSize: "20px" }}>{peca.icone}</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: DS.t0 }}>{peca.nome}</div>
                      <div style={{ fontSize: "11px", color: DS.success }}>{peca.bonus}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={() => setStep("ofensiva")} className="btn-primary"
            style={{ width: "100%", padding: "13px", fontSize: "14px" }}>
            Ver Progresso →
          </button>
        </div>
      </main>
    </div>
  );

  if (step === "ofensiva") return (
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px", background: `linear-gradient(150deg, #38BDF8 0%, #1A7FFF 45%, #0062E0 100%)` }}>
      <main style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>🔥</div>
        <h2 style={{ fontSize: "28px", fontWeight: "800", color: "white", marginBottom: "8px", letterSpacing: "-0.02em" }}>
          {streakDias ?? 1} {(streakDias ?? 1) === 1 ? "dia" : "dias"} seguidos!
        </h2>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "15px", lineHeight: 1.6, marginBottom: "32px", fontFamily: "var(--font-verse)", fontStyle: "italic" }}>
          Continue assim! Cada dia dedicado fortalece sua fé e sabedoria.
        </p>
        <button onClick={() => setStep("arca")} style={{
          width: "100%", maxWidth: "360px", padding: "14px", fontSize: "14px", fontWeight: 700,
          background: "white", color: DS.blue, border: "none", borderRadius: "var(--r-md)",
          cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
        }}>
          Abrir Arca →
        </button>
      </main>
    </div>
  );

  if (step === "arca") return (
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px", background: "var(--bg)" }}>
      <main style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
        <div style={{ animation: "missao-float 2.4s ease-in-out infinite", marginBottom: "20px", fontSize: "72px" }}>🎁</div>
        <h2 style={{ fontSize: "24px", fontWeight: "800", color: DS.t0, marginBottom: "8px", letterSpacing: "-0.02em" }}>
          Arca Recompensa!
        </h2>
        <p style={{ color: DS.t2, fontSize: "14px", marginBottom: "8px" }}>Recompensa acumulada:</p>
        <p style={{ fontSize: "36px", fontWeight: "800", color: DS.warn, marginBottom: "28px" }}>
          +{arcaBonus} talentos
        </p>
        <button onClick={() => setStep("fim")} className="btn-primary" style={{
          width: "100%", maxWidth: "360px", padding: "15px", fontSize: "15px",
        }}>
          Abrir Arca
        </button>
      </main>
    </div>
  );

  // step === "fim"
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px", background: "var(--bg)" }}>
      <main style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
        <div style={{ fontSize: "56px", marginBottom: "8px" }}>🎉</div>
        <div style={{ fontSize: "48px", fontWeight: "800", color: DS.warn, marginBottom: "4px" }}>+{arcaBonus}</div>
        <div style={{ fontSize: "18px", fontWeight: "600", color: DS.t1, marginBottom: "32px" }}>talentos ganhos!</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "360px", margin: "0 auto" }}>
          <button onClick={onReiniciar} className="btn-primary"
            style={{ width: "100%", padding: "14px", fontSize: "14px" }}>
            Repetir
          </button>
          <button onClick={onVoltar} className="btn-outline"
            style={{ width: "100%", padding: "12px", fontSize: "13px" }}>
            Continuar
          </button>
        </div>
      </main>
    </div>
  );
}

// ── Tela TRILHAS ──────────────────────────────────────────────────
function TelaTrilhas({ onEscolher, onVoltar }: { onEscolher: (t: Trilha) => void; onVoltar: () => void }) {
  const opcoes = [
    {
      trilha: "VT" as Trilha,
      titulo: "Velho Testamento",
      sub: "Gênesis ao Malaquias — 9 capítulos",
      grad: "linear-gradient(135deg, #0062E0, #1A7FFF)",
      shadow: "0 8px 20px -4px rgba(26,127,255,0.35)",
    },
    {
      trilha: "NT" as Trilha,
      titulo: "Novo Testamento",
      sub: "Mateus ao Apocalipse — 9 capítulos",
      grad: "linear-gradient(135deg, #0D9488, #14B8A6)",
      shadow: "0 8px 20px -4px rgba(20,184,166,0.35)",
    },
    {
      trilha: "JESUS" as Trilha,
      titulo: "Jornada de Jesus",
      sub: "Do nascimento à ressurreição — 7 capítulos",
      grad: "linear-gradient(135deg, #7C3AED, #8B5CF6)",
      shadow: "0 8px 20px -4px rgba(139,92,246,0.35)",
    },
  ];
  return (
    <div className="tela-scroll">
      <main style={{ width: "100%", maxWidth: "450px", padding: "0 0 80px" }}>
        <div className="status-bar" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={onVoltar} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text-2)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span style={{ fontSize: "17px", fontWeight: "800", color: DS.t0, letterSpacing: "-0.02em" }}>Escolher Trilha</span>
        </div>
        <div style={{ padding: "20px 16px 0" }}>
          {opcoes.map(o => (
            <button key={o.trilha} onClick={() => { sfxClick(); onEscolher(o.trilha); }}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "0", marginBottom: "14px" }}>
              <div style={{
                background: o.grad, borderRadius: "28px", padding: "20px 22px",
                textAlign: "left", boxShadow: o.shadow, transition: "transform 0.15s",
                display: "flex", alignItems: "center", gap: "16px", position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
                <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "white", marginBottom: "4px", letterSpacing: "-0.02em" }}>{o.titulo}</div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>{o.sub}</div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

// ── Tela RANKING ──────────────────────────────────────────────────
function TelaRanking({ perfil, onVoltar }: { perfil: Perfil; onVoltar: () => void }) {
  const [jogadores, setJogadores] = useState<PerfilRanking[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarRanking(50).then(lista => {
      setJogadores(lista);
      setCarregando(false);
    });
  }, []);

  const posicao = jogadores.findIndex(j => j.id === perfil.id) + 1;

  const medalha = (pos: number) =>
    pos === 1 ? `linear-gradient(145deg, #ffd700, #b8860b)`
    : pos === 2 ? `linear-gradient(145deg, #c0c0c0, #808080)`
    : pos === 3 ? `linear-gradient(145deg, #cd7f32, #8b4513)`
    : `linear-gradient(145deg, ${DS.border}, ${DS.t3})`;

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <div className="status-bar" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={onVoltar} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text-2)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize: "17px", fontWeight: "800", color: DS.t0, letterSpacing: "-0.02em" }}>
          Ranking
        </span>
        <span style={{ marginLeft: "auto" }}>
          <span className="badge badge-gray">{carregando ? "Carregando..." : `${jogadores.length} jogadores`}</span>
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 80px" }}>
        {/* Posição do usuário */}
        <div className="card-verbum" style={{ padding: "16px 20px", marginBottom: "20px", textAlign: "center", border: `1.5px solid ${DS.blueLt}`, boxShadow: DS.shBlue }}>
          <SvgPersonagem tipo={perfil.personagem_tipo} cor={perfil.personagem_cor} size={64} />
          <div style={{ fontSize: "16px", fontWeight: "700", color: DS.t0, marginTop: "8px" }}>{perfil.nome}</div>
          <div style={{ fontSize: "12px", color: DS.t2, marginTop: "4px" }}>
            {!carregando && posicao > 0 ? `${posicao}º lugar` : carregando ? "Calculando posição..." : "Faça um quiz para entrar no ranking!"}
          </div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: DS.blue, marginTop: "6px" }}>{perfil.xp.toLocaleString()} Maná</div>
        </div>

        {carregando ? (
          <div style={{ textAlign: "center", padding: "40px", color: DS.t2, fontSize: "13px", fontStyle: "italic" }}>
            Carregando ranking...
          </div>
        ) : jogadores.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: DS.t2, fontSize: "13px", fontStyle: "italic" }}>
            Nenhum jogador ainda. Seja o primeiro a concluir um capítulo!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {jogadores.map((j, idx) => {
              const pos = idx + 1;
              const ehVoce = j.id === perfil.id;
              return (
                <div key={j.id} className="card-verbum" style={{
                  padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px",
                  border: ehVoce ? `1.5px solid ${DS.blue}` : undefined,
                  background: ehVoce ? DS.blueTint : undefined,
                }}>
                  <div style={{
                    width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
                    background: medalha(pos),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: pos <= 3 ? "14px" : "12px", fontWeight: "700", color: "white",
                  }}>
                    {pos}
                  </div>
                  <SvgPersonagem tipo={j.personagem_tipo as TipoPersonagem} cor={j.personagem_cor} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: DS.t0 }}>{j.nome}</div>
                    <div style={{ fontSize: "12px", color: DS.blue, marginTop: "2px" }}>{j.xp.toLocaleString()} Maná</div>
                  </div>
                  {j.sequencia > 0 && (
                    <span style={{ fontSize: "11px", color: "#ea580c", fontWeight: 700 }}>🔥 {j.sequencia}</span>
                  )}
                  {ehVoce && <span className="badge badge-blue">Você</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tela PLANOS ───────────────────────────────────────────────────
function TelaPlanos({ onVoltar }: { onVoltar: () => void }) {
  const [plano, setPlano] = useState<"anual" | "mensal">("anual");
  const [avisado, setAvisado] = useState(false);

  const features = [
    { icon: "♥", text: "Vidas ilimitadas — jogue sem parar" },
    { icon: "✗", text: "Sem anúncios" },
    { icon: "✦", text: "+50% Maná em todos os quiz" },
    { icon: "⚜", text: "Badge exclusivo no Ranking" },
    { icon: "📖", text: "Acesso antecipado a novos conteúdos" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "linear-gradient(160deg, #F5F3FF, #EDE9FE)" }}>
      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center" }}>
        <button onClick={onVoltar} style={{ background: "none", border: "none", color: DS.t1, fontSize: "20px", cursor: "pointer", padding: "4px 8px", display: "flex", alignItems: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 80px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", paddingBottom: "28px" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, #A78BFA, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: DS.shPurp }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <h1 style={{ fontFamily: "var(--font-ui)", fontSize: "24px", fontWeight: "800", color: DS.lavDk, marginBottom: "6px" }}>
            Discípulo Premium
          </h1>
          <p style={{ color: DS.t2, fontSize: "14px" }}>Sua jornada bíblica sem limites</p>
        </div>

        {/* Planos */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          {/* Anual */}
          <button onClick={() => setPlano("anual")} style={{
            flex: 1, padding: "16px 10px", borderRadius: "16px", cursor: "pointer", textAlign: "center",
            border: plano === "anual" ? `2px solid ${DS.lavDk}` : `2px solid ${DS.border}`,
            background: plano === "anual" ? "linear-gradient(145deg, rgba(124,58,237,0.10), rgba(124,58,237,0.04))" : DS.white,
            position: "relative", overflow: "hidden",
            boxShadow: plano === "anual" ? DS.shPurp : DS.shSm,
          }}>
            {plano === "anual" && (
              <div style={{ position: "absolute", top: 0, right: 0, background: DS.lavDk, color: DS.white, fontSize: "9px", fontWeight: "700", padding: "3px 8px", borderRadius: "0 14px 0 8px" }}>
                MELHOR VALOR
              </div>
            )}
            <div style={{ fontSize: "10px", fontWeight: "700", color: DS.lav, marginBottom: "6px", letterSpacing: "1.5px" }}>ANUAL</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: DS.lavDk }}>R$ 89,90</div>
            <div style={{ fontSize: "11px", color: DS.t2, marginTop: "2px" }}>por ano</div>
            <div style={{ fontSize: "11px", color: DS.t2, marginTop: "1px" }}>≈ R$ 7,49/mês</div>
            <div style={{ fontSize: "10px", color: DS.success, marginTop: "6px", fontWeight: "700" }}>50% de desconto</div>
          </button>

          {/* Mensal */}
          <button onClick={() => setPlano("mensal")} style={{
            flex: 1, padding: "16px 10px", borderRadius: "16px", cursor: "pointer", textAlign: "center",
            border: plano === "mensal" ? `2px solid ${DS.lavDk}` : `2px solid ${DS.border}`,
            background: plano === "mensal" ? "linear-gradient(145deg, rgba(124,58,237,0.10), rgba(124,58,237,0.04))" : DS.white,
            boxShadow: plano === "mensal" ? DS.shPurp : DS.shSm,
          }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: DS.lav, marginBottom: "6px", letterSpacing: "1.5px" }}>MENSAL</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: DS.lavDk }}>R$ 14,90</div>
            <div style={{ fontSize: "11px", color: DS.t2, marginTop: "2px" }}>por mês</div>
          </button>
        </div>

        {/* CTA */}
        {avisado ? (
          <div style={{ background: "rgba(124,58,237,0.07)", border: `1px solid rgba(124,58,237,0.2)`, borderRadius: "14px", padding: "16px", marginBottom: "16px", textAlign: "center" }}>
            <p style={{ fontSize: "14px", fontWeight: "700", color: DS.lavDk, marginBottom: "4px" }}>Em breve!</p>
            <p style={{ fontSize: "12px", color: DS.t2, lineHeight: 1.6 }}>Os pagamentos serão ativados em breve. Obrigado pelo interesse!</p>
          </div>
        ) : (
          <button onClick={() => setAvisado(true)}
            style={{ width: "100%", padding: "16px", fontSize: "15px", fontWeight: "700", marginBottom: "16px", borderRadius: "14px", border: "none", cursor: "pointer", background: "linear-gradient(135deg, #A78BFA, #7C3AED)", color: DS.white, boxShadow: DS.shPurp, transition: "transform 0.15s" }}>
            Começar Premium ✦
          </button>
        )}

        {/* Features */}
        <div style={{ background: DS.white, borderRadius: "16px", padding: "16px", marginBottom: "14px", boxShadow: DS.shSm }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: DS.lav, letterSpacing: "1.5px", marginBottom: "12px", textAlign: "center" }}>O QUE ESTÁ INCLUÍDO</div>
          {features.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "10px 0", borderBottom: i < features.length - 1 ? `1px solid ${DS.borderLt}` : "none" }}>
              <span style={{ fontSize: "15px", width: "22px", textAlign: "center", color: DS.lavDk }}>{f.icon}</span>
              <span style={{ fontSize: "13px", color: DS.t1, lineHeight: 1.4 }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Plano gratuito */}
        <div style={{ background: DS.borderLt, borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" }}>
          <p style={{ fontSize: "10px", fontWeight: "700", color: DS.t3, marginBottom: "8px", letterSpacing: "1px" }}>PLANO GRATUITO INCLUI</p>
          <p style={{ fontSize: "12px", color: DS.t2, lineHeight: 1.7 }}>
            Acesso a todos os quizzes · 5 vidas (recarga 30 min) · Ranking público · Anúncios ativos
          </p>
        </div>

        <p style={{ textAlign: "center", fontSize: "11px", color: DS.t3 }}>Cancele quando quiser</p>
      </div>
    </div>
  );
}

// ── Tela SEM VIDAS ─────────────────────────────────────────────────
function TelaSemVidas({ minutosProxima, onVoltar, onPremium }: {
  minutosProxima: number;
  onVoltar: () => void;
  onPremium: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#FFF1F2", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px 90px" }}>
      <div className="card-verbum" style={{ width: "100%", maxWidth: "340px", padding: "32px 24px", textAlign: "center" }}>
        {/* Heart icon */}
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "24px" }}>
          {[0,1,2,3,4].map(i => (
            <svg key={i} width="24" height="24" viewBox="0 0 24 24" fill={DS.error} opacity={0.25} stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          ))}
        </div>

        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill={DS.error} stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </div>

        <h2 style={{ fontSize: "20px", fontWeight: "800", color: DS.t0, marginBottom: "8px" }}>
          Suas vidas acabaram
        </h2>
        <p style={{ fontSize: "13px", color: DS.t2, fontStyle: "italic", marginBottom: "28px", lineHeight: 1.7 }}>
          &ldquo;Esperai no Senhor, tende bom ânimo e Ele fortalecerá o vosso coração.&rdquo;
          <br /><span style={{ fontSize: "11px", fontStyle: "normal", color: DS.t3 }}>— Salmos 27:14</span>
        </p>

        {/* Opção esperar */}
        <button onClick={onVoltar} className="btn-outline" style={{
          width: "100%", padding: "14px 20px", marginBottom: "12px",
          display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px",
        }}>
          <span>⏱ Esperar recarga gratuita</span>
          <span style={{ color: DS.t2, fontWeight: "400" }}>{minutosProxima} min</span>
        </button>

        {/* Upsell Premium */}
        <button onClick={onPremium} style={{
          width: "100%", padding: "16px 20px", borderRadius: "14px", marginBottom: "20px",
          background: "linear-gradient(135deg, #A78BFA, #7C3AED)",
          border: "none", cursor: "pointer", textAlign: "left",
          boxShadow: DS.shPurp,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span style={{ fontSize: "14px", fontWeight: "700", color: DS.white }}>Discípulo Premium</span>
          </div>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", margin: 0, paddingLeft: "28px", lineHeight: 1.5 }}>
            Vidas ilimitadas · Sem anúncios · A partir de R$ 7,49/mês
          </p>
        </button>

        <button onClick={onVoltar} style={{ background: "none", border: "none", color: DS.t3, fontSize: "13px", cursor: "pointer", padding: "8px" }}>
          ← Voltar ao Mapa
        </button>
      </div>
    </div>
  );
}

// ── Tela ADMIN ────────────────────────────────────────────────────
function TelaAdmin({ perfil, onVoltar }: { perfil: Perfil; onVoltar: () => void }) {
  const [usuarios, setUsuarios] = useState<PerfilAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [resettando, setResettando] = useState<string | null>(null);
  const [confirmarId, setConfirmarId] = useState<string | null>(null);
  const [confirmarTodos, setConfirmarTodos] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    carregarTodosPerfis().then(lista => { setUsuarios(lista); setCarregando(false); });
  }, []);

  async function executarReset(userId: string) {
    const nome = usuarios.find(u => u.id === userId)?.nome ?? "usuário";
    setConfirmarId(null);
    setResettando(userId);
    await resetarPerfilAdmin(userId);
    await deletarProgressoAdmin(userId);
    setMensagem(`✓ ${nome} resetado com sucesso`);
    setResettando(null);
    carregarTodosPerfis().then(setUsuarios);
    setTimeout(() => setMensagem(null), 4000);
  }

  async function executarResetTodos() {
    setConfirmarTodos(false);
    setCarregando(true);
    for (const u of usuarios) {
      await resetarPerfilAdmin(u.id);
      await deletarProgressoAdmin(u.id);
    }
    setMensagem(`✓ ${usuarios.length} usuários resetados`);
    setCarregando(false);
    carregarTodosPerfis().then(setUsuarios);
    setTimeout(() => setMensagem(null), 4000);
  }

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: DS.bg }}>
      <div className="status-bar" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={onVoltar} style={{ background: "none", border: "none", color: DS.t1, cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span style={{ fontSize: "16px", fontWeight: "700", color: DS.t0 }}>⚙ Painel Admin</span>
        <span style={{ marginLeft: "auto", fontSize: "12px", color: DS.t3 }}>
          {carregando ? "Carregando..." : `${usuarios.length} usuários`}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 80px" }}>
        {mensagem && (
          <div style={{ background: "#ECFDF5", color: DS.success, border: `1px solid #86EFAC`, padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontSize: "13px", fontWeight: "600" }}>
            {mensagem}
          </div>
        )}

        {!carregando && usuarios.length <= 1 && (
          <div className="card-verbum" style={{ padding: "14px 16px", marginBottom: "16px", borderLeft: `4px solid ${DS.warn}` }}>
            <p style={{ fontSize: "11px", fontWeight: "700", color: DS.warn, marginBottom: "6px" }}>⚠ MIGRAÇÃO SQL NECESSÁRIA</p>
            <p style={{ fontSize: "12px", color: DS.t1, lineHeight: 1.6 }}>
              Para ver e gerenciar todos os usuários, execute o arquivo <strong>supabase-admin-migration.sql</strong> no painel SQL do Supabase.
            </p>
          </div>
        )}

        {!confirmarTodos ? (
          <button onClick={() => setConfirmarTodos(true)}
            style={{ width: "100%", padding: "13px", fontSize: "13px", fontWeight: "700", marginBottom: "16px", borderRadius: "12px", border: `1.5px solid ${DS.error}`, background: DS.white, color: DS.error, cursor: "pointer" }}>
            Resetar Todos os Usuários
          </button>
        ) : (
          <div className="card-verbum" style={{ padding: "16px", marginBottom: "16px", borderLeft: `4px solid ${DS.error}` }}>
            <p style={{ fontSize: "13px", fontWeight: "600", color: DS.error, marginBottom: "12px" }}>
              ⚠ Isso vai resetar {usuarios.length} usuário(s). Confirmar?
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setConfirmarTodos(false)} className="btn-outline" style={{ flex: 1, padding: "10px", fontSize: "12px" }}>Cancelar</button>
              <button onClick={executarResetTodos} style={{ flex: 2, padding: "10px", fontSize: "12px", fontWeight: "700", borderRadius: "12px", border: "none", background: DS.error, color: DS.white, cursor: "pointer" }}>Confirmar Reset Geral</button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {carregando ? (
            <div style={{ textAlign: "center", padding: "40px", color: DS.t3, fontStyle: "italic" }}>Carregando usuários...</div>
          ) : usuarios.map(u => {
            const dataReg = new Date(u.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
            const ehAdminUser = ADMIN_EMAILS.includes(u.email);
            return (
              <div key={u.id} className="card-verbum" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: DS.t0 }}>{u.nome}</span>
                      {ehAdminUser && <span className="badge badge-purple">ADMIN</span>}
                    </div>
                    <div style={{ fontSize: "11px", color: DS.t3, marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                  </div>
                  {confirmarId === u.id ? (
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button onClick={() => setConfirmarId(null)} className="btn-outline" style={{ padding: "5px 10px", fontSize: "10px" }}>✕</button>
                      <button onClick={() => executarReset(u.id)} disabled={resettando === u.id} style={{ padding: "5px 10px", fontSize: "10px", fontWeight: "700", borderRadius: "8px", border: "none", background: DS.error, color: DS.white, cursor: "pointer" }}>
                        {resettando === u.id ? "..." : "Confirmar"}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmarId(u.id)} className="btn-outline" style={{ padding: "5px 12px", fontSize: "11px", flexShrink: 0 }}>
                      Resetar
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", fontSize: "11px", color: DS.t2 }}>
                  <span>⭐ {u.xp.toLocaleString()} Maná</span>
                  <span>💰 {u.talentos}</span>
                  <span>🔥 {u.sequencia}d</span>
                  <span style={{ marginLeft: "auto", color: DS.t3 }}>Desde {dataReg}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Tela de configuração (dev sem .env.local) ─────────────────────
function TelaSetup() {
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: "24px" }}>
      <div className="card-verbum" style={{ padding: "28px 24px", maxWidth: "420px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>⚙️</div>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: DS.t0 }}>Configurar Backend</h2>
          <p style={{ color: DS.t2, fontSize: "13px", marginTop: "6px" }}>Crie o arquivo <code style={{ background: DS.borderLt, padding: "2px 6px", borderRadius: "4px" }}>.env.local</code> na raiz do projeto</p>
        </div>
        <div style={{ background: DS.t0, borderRadius: "10px", padding: "16px", fontFamily: "monospace", fontSize: "12px", color: "#a5f3fc", marginBottom: "16px", lineHeight: 1.8 }}>
          <div style={{ color: DS.t3, marginBottom: "4px" }}># .env.local</div>
          <div>NEXT_PUBLIC_SUPABASE_URL=<span style={{ color: DS.sky }}>https://xxx.supabase.co</span></div>
          <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=<span style={{ color: DS.sky }}>sua_chave_aqui</span></div>
        </div>
        <ol style={{ fontSize: "13px", color: DS.t1, paddingLeft: "20px", lineHeight: 2 }}>
          <li>Acesse <strong>supabase.com</strong> e crie um projeto gratuito</li>
          <li>Vá em <strong>Settings → API</strong> e copie URL + anon key</li>
          <li>Cole no <code>.env.local</code> e execute o <strong>supabase-schema.sql</strong></li>
          <li>Reinicie o servidor com <code>npm run dev</code></li>
        </ol>
      </div>
    </div>
  );
}

// ── App principal ─────────────────────────────────────────────────
export default function App() {
  if (!supabaseConfigured) return <TelaSetup />;
  const [tela, setTela] = useState<Tela>("login");
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [vidasAtivas, setVidasAtivas] = useState(VIDAS_MAX);
  const [trilha, setTrilha] = useState<Trilha>("VT");
  const [capitulo, setCapitulo] = useState<Capitulo | null>(null);
  const [progressoIds, setProgressoIds] = useState<Set<string>>(new Set());
  const [progressoEtapas, setProgressoEtapas] = useState<Record<string, number>>({});
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [missoesCompletas, setMissoesCompletas] = useState<MissaoConcluida[]>([]);
  const [resultadoState, setResultadoState] = useState({ acertos: 0, total: 0, xp: 0, talentos: 0, novasPecas: [] as string[] });

  const atualizarVidas = useCallback((p: Perfil) => {
    setVidasAtivas(calcularVidasAtuais(p));
  }, []);

  // Carrega progresso de etapas do localStorage
  useEffect(() => {
    try {
      const salvo = localStorage.getItem("gq_etapas");
      if (salvo) setProgressoEtapas(JSON.parse(salvo));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem("gq_missoes");
      if (salvo) setMissoesCompletas(JSON.parse(salvo));
    } catch { /* ignore */ }
  }, []);

  // Checa sessão ao montar
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const u = data.session.user;
        const p = await garantirPerfil(u.id, u.user_metadata?.nome ?? u.email?.split("@")[0] ?? "Peregrino", u.email ?? "");
        if (p) {
          const updates = await registrarLoginDiario(p);
          const perfilAtual = { ...p, ...updates };
          setPerfil(perfilAtual);
          atualizarVidas(perfilAtual);
          // carrega progresso
          const prog = await carregarProgresso(p.id);
          setProgressoIds(new Set(prog.filter(r => r.completo).map(r => `${r.trilha}_${r.capitulo_id}`)));
          const novo = localStorage.getItem("gq_novo_usuario") === "1";
          setTela(novo ? "criar_personagem" : "home");
        } else {
          setTela("login");
        }
      } else {
        setTela("login");
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") { setPerfil(null); setTela("login"); }
    });
    return () => sub.subscription.unsubscribe();
  }, [atualizarVidas]);

  // Desbloquear AudioContext no primeiro gesto (iOS exige ser síncrono)
  useEffect(() => {
    const unlock = () => { try { sfxClick(); } catch {} };
    document.addEventListener("touchstart", unlock, { once: true, passive: true });
    document.addEventListener("click", unlock, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
    };
  }, []);

  // Recarrega vidas a cada minuto
  useEffect(() => {
    if (!perfil) return;
    const t = setInterval(() => atualizarVidas(perfil), 60000);
    return () => clearInterval(t);
  }, [perfil, atualizarVidas]);

  async function handleLogin() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const u = data.session.user;
    const p = await garantirPerfil(u.id, u.user_metadata?.nome ?? u.email?.split("@")[0] ?? "Peregrino", u.email ?? "");
    if (p) {
      const updates = await registrarLoginDiario(p);
      const perfilAtual = { ...p, ...updates };
      setPerfil(perfilAtual);
      atualizarVidas(perfilAtual);
      const prog = await carregarProgresso(p.id);
      setProgressoIds(new Set(prog.filter(r => r.completo).map(r => `${r.trilha}_${r.capitulo_id}`)));
      const novoUsuario = localStorage.getItem("gq_novo_usuario") === "1";
      setTela(novoUsuario ? "criar_personagem" : "home");
    }
  }

  async function handleConcluirQuiz(acertos: number, xpGanho: number, talentosGanho: number) {
    if (!perfil || !capitulo) return;
    const chave = `${trilha}_${capitulo.id}`;

    // Atualiza progresso de etapas se o capítulo tiver etapas
    if (capitulo.etapas && capitulo.etapas.length > 0) {
      const novaContagem = Math.min(etapaAtual + 1, capitulo.etapas.length);
      const novoProgresso = { ...progressoEtapas, [chave]: novaContagem };
      setProgressoEtapas(novoProgresso);
      try { localStorage.setItem("gq_etapas", JSON.stringify(novoProgresso)); } catch { /* ignore */ }

      // Marca capítulo completo apenas quando todas as etapas forem concluídas
      if (novaContagem >= capitulo.etapas.length) {
        await salvarProgresso(perfil.id, trilha, String(capitulo.id), acertos, true);
        setProgressoIds(prev => new Set([...prev, chave]));
      }
    } else {
      await salvarProgresso(perfil.id, trilha, String(capitulo.id), acertos, true);
      setProgressoIds(prev => new Set([...prev, chave]));
    }

    // Atualiza XP e talentos
    const novoXp = perfil.xp + xpGanho;
    const novosTalentos = perfil.talentos + talentosGanho;

    // Verifica armadura
    const contagens = { VT: 0, NT: 0, JESUS: 0 };
    progressoIds.forEach(id => {
      const partes = id.split("_");
      const t = partes[0] as "VT" | "NT" | "JESUS";
      contagens[t] = (contagens[t] || 0) + 1;
    });
    const novoCapituloCompleto = !progressoIds.has(chave) && (
      !capitulo.etapas || (etapaAtual + 1) >= (capitulo.etapas.length ?? 0)
    );
    if (novoCapituloCompleto) contagens[trilha]++;

    const perfilTemp = { ...perfil, xp: novoXp, talentos: novosTalentos };
    const novaArmadura = verificarArmaduraDesbloqueios(perfilTemp, contagens);
    const novasPecas = (Object.keys(novaArmadura) as (keyof typeof novaArmadura)[])
      .filter(k => novaArmadura[k] && !perfil.armadura[k]);

    await atualizarPerfil(perfil.id, {
      xp: novoXp,
      talentos: novosTalentos,
      armadura: novaArmadura,
      vidas: vidasAtivas,
    });

    const perfilAtualizado = { ...perfilTemp, armadura: novaArmadura };
    setPerfil(perfilAtualizado);

    const totalQuestoes = (capitulo.etapas && capitulo.etapas[etapaAtual]) ? capitulo.etapas[etapaAtual].length : capitulo.perguntas.length;
    setResultadoState({ acertos, total: totalQuestoes, xp: xpGanho, talentos: talentosGanho, novasPecas });
    setTela("resultado");
  }

  async function handleConcluirMissao(mc: MissaoConcluida, xpGanho: number, talentosGanho: number) {
    if (!perfil) return;
    const novo = [...missoesCompletas, mc];
    setMissoesCompletas(novo);
    try { localStorage.setItem("gq_missoes", JSON.stringify(novo)); } catch {}
    const novoXp = perfil.xp + xpGanho;
    const novosTalentos = perfil.talentos + talentosGanho;
    await atualizarPerfil(perfil.id, { xp: novoXp, talentos: novosTalentos });
    setPerfil(p => p ? { ...p, xp: novoXp, talentos: novosTalentos } : p);
  }

  async function handleSemVidas() {
    if (!perfil) return;
    const agora = new Date().toISOString();
    await atualizarPerfil(perfil.id, { vidas: 0, vidas_ultima_recarga: agora });
    const perfilAtualizado = { ...perfil, vidas: 0, vidas_ultima_recarga: agora };
    setPerfil(perfilAtualizado);
    setVidasAtivas(0);
    setTela("sem_vidas");
  }

  async function handleSair() {
    await supabase.auth.signOut();
  }

  // ── Roteamento ─────────────────────────────────────────────────
  if (tela === "login") return (
    <TelaLogin
      onLogin={handleLogin}
      onCadastro={() => setTela("cadastro")}
    />
  );

  if (tela === "cadastro") return (
    <TelaCadastro
      onCadastrado={handleLogin}
      onVoltar={() => setTela("login")}
    />
  );

  if (tela === "criar_personagem" && perfil) return (
    <TelaCriarPersonagem
      userId={perfil.id}
      onConcluir={(tipo, cor) => {
        setPerfil(p => p ? { ...p, personagem_tipo: tipo, personagem_cor: cor } : p);
        setTela("home");
      }}
    />
  );

  if (!perfil) return null;

  const missaoHojeObj = getMissaoHoje();
  const hoje = new Date().toISOString().split("T")[0];
  const missaoConcluidaHoje = missoesCompletas.some(mc => mc.missaoId === missaoHojeObj.id && mc.data === hoje);

  const mostrarNav = tela !== "jogo" && tela !== "resultado";

  let conteudo: React.ReactNode = null;
  if (tela === "home") conteudo = (
    <TelaHome
      perfil={perfil}
      vidas={vidasAtivas}
      onEscolher={t => { setTrilha(t); setTela("mapa"); }}
      onArmadura={() => setTela("armadura")}
      onPersonagem={() => setTela("criar_personagem")}
      onRanking={() => setTela("ranking")}
      onTrilhas={() => setTela("trilhas")}
      onMissoes={() => setTela("missoes")}
      onSair={handleSair}
      missaoConcluidaHoje={missaoConcluidaHoje}
      onAdmin={ADMIN_EMAILS.includes(perfil.email) ? () => setTela("admin") : undefined}
      onPlanos={() => setTela("planos")}
    />
  );
  else if (tela === "armadura") conteudo = (
    <TelaArmadura perfil={perfil} onVoltar={() => setTela("home")} />
  );
  else if (tela === "trilhas") conteudo = (
    <TelaTrilhas
      onEscolher={t => { setTrilha(t); setTela("mapa"); }}
      onVoltar={() => setTela("home")}
    />
  );
  else if (tela === "ranking") conteudo = (
    <TelaRanking perfil={perfil} onVoltar={() => setTela("home")} />
  );
  else if (tela === "admin" && ADMIN_EMAILS.includes(perfil.email)) conteudo = (
    <TelaAdmin perfil={perfil} onVoltar={() => setTela("home")} />
  );
  else if (tela === "planos") conteudo = (
    <TelaPlanos onVoltar={() => setTela("home")} />
  );
  else if (tela === "sem_vidas") conteudo = (
    <TelaSemVidas
      minutosProxima={minutosProxVida(perfil)}
      onVoltar={() => setTela("mapa")}
      onPremium={() => setTela("planos")}
    />
  );
  else if (tela === "missoes") conteudo = (
    <TelaMissoes
      perfil={perfil}
      missoesCompletas={missoesCompletas}
      onConcluir={(mc, xp, talentos) => { handleConcluirMissao(mc, xp, talentos); }}
      onVoltar={() => setTela("home")}
    />
  );
  else if (tela === "mapa") conteudo = (
    <TelaMapa
      trilha={trilha} perfil={perfil} vidas={vidasAtivas}
      progressoCompleto={progressoIds}
      progressoEtapas={progressoEtapas}
      onCapitulo={(cap) => {
        if (vidasAtivas <= 0) { setTela("sem_vidas"); return; }
        setCapitulo(cap);
        if (cap.etapas && cap.etapas.length > 0) {
          setTela("etapas");
        } else {
          setEtapaAtual(0);
          setTela("jogo");
        }
      }}
      onVoltar={() => setTela("home")}
    />
  );
  else if (tela === "etapas" && capitulo) conteudo = (
    <TelaEtapas
      capitulo={capitulo}
      trilha={trilha}
      progressoEtapas={progressoEtapas[`${trilha}_${capitulo.id}`] ?? 0}
      onEtapa={(idx) => { if (vidasAtivas <= 0) { setTela("sem_vidas"); return; } setEtapaAtual(idx); setTela("jogo"); }}
      onVoltar={() => setTela("mapa")}
    />
  );
  else if (tela === "jogo" && capitulo) conteudo = (
    <TelaQuiz
      capitulo={capitulo} trilha={trilha} perfil={perfil} vidas={vidasAtivas}
      questoes={capitulo.etapas ? capitulo.etapas[etapaAtual] : undefined}
      onConcluir={handleConcluirQuiz}
      onSemVidas={handleSemVidas}
    />
  );
  else if (tela === "resultado") conteudo = (
    <TelaResultado
      capitulo={capitulo!}
      acertos={resultadoState.acertos}
      total={resultadoState.total}
      xpGanho={resultadoState.xp}
      streakDias={perfil.sequencia}
      talentosGanho={resultadoState.talentos}
      novasPecas={resultadoState.novasPecas}
      onReiniciar={() => capitulo?.etapas ? setTela("etapas") : setTela("jogo")}
      onVoltar={() => setTela("mapa")}
    />
  );

  return (
    <>
      {conteudo}
      {mostrarNav && (
        <BarraNavGlobal
          tela={tela}
          onHome={() => setTela("home")}
          onMissoes={() => setTela("missoes")}
          onPlanos={() => setTela("planos")}
          onRanking={() => setTela("ranking")}
          onArmadura={() => setTela("armadura")}
          missaoConcluidaHoje={missaoConcluidaHoje}
        />
      )}
    </>
  );
}
