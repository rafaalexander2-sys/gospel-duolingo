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
} from "@/lib/gameEngine";
import {
  sfxAcerto, sfxErro, sfxCapituloCompleto, sfxUnlock,
  sfxClick, sfxRevisao, sfxVidaPerdida, startBgm, stopBgm,
  toggleBgm, isBgmAtivo,
} from "@/lib/sounds";

// ── Design tokens ─────────────────────────────────────────────────
const DS = {
  bg: "#e8dfc8", bgCard: "#f5edd8", borda: "#c8b48a",
  titulo: "#2c1505", corpo: "#4a2e0e",
  dourado: "#b8860b", douradoClaro: "#d4a017", douradoSombra: "#7a5800",
  vermelho: "#7a1515", vermelhoEsc: "#4a0a0a",
  verde: "#1a4a1a", acerto: "#c8e6c0", erro: "#f0c8c8", off: "#9a8060",
};

type Tela = "login" | "cadastro" | "criar_personagem" | "home" | "mapa" | "jogo" | "resultado" | "armadura";
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
  const skin = "#d4844a";
  const sash = "#6a3008";
  const sandal = "#7a3808";

  const configs: Record<TipoPersonagem, {
    hairColor: string; hasBeard: boolean; hasVeil: boolean;
    hairWavy: boolean; accessory: React.ReactNode; bg: string;
  }> = {
    peregrino: {
      hairColor: "#3c2010", hasBeard: false, hasVeil: false, hairWavy: true, bg: "#d4e8d0",
      accessory: <line x1="70" y1="32" x2="70" y2="94" stroke={sash} strokeWidth="4" strokeLinecap="round" />,
    },
    profeta: {
      hairColor: "#2a1408", hasBeard: true, hasVeil: false, hairWavy: true, bg: "#f0dcc0",
      accessory: (
        <g>
          <rect x="5" y="60" width="11" height="16" rx="2" fill="#e8dcc0" stroke="#8a6030" strokeWidth="1.2" />
          <line x1="5" y1="64" x2="16" y2="64" stroke="#8a6030" strokeWidth="0.8" />
          <line x1="5" y1="68" x2="16" y2="68" stroke="#8a6030" strokeWidth="0.8" />
          <line x1="5" y1="72" x2="16" y2="72" stroke="#8a6030" strokeWidth="0.8" />
        </g>
      ),
    },
    guerreiro: {
      hairColor: "#1c0e08", hasBeard: false, hasVeil: false, hairWavy: false, bg: "#dce0f0",
      accessory: (
        <g>
          <rect x="66" y="40" width="5" height="34" rx="1.5" fill="#b0b8cc" />
          <rect x="62" y="48" width="13" height="4" rx="1.5" fill="#c8b040" />
          <rect x="65" y="37" width="7" height="6" rx="2" fill="#c8b040" />
        </g>
      ),
    },
    sabia: {
      hairColor: "#2a1040", hasBeard: false, hasVeil: true, hairWavy: false, bg: "#e8d4f0",
      accessory: (
        <g>
          <rect x="61" y="57" width="14" height="18" rx="2" fill="#d4c090" stroke="#8a6820" strokeWidth="1.2" />
          <line x1="64" y1="57" x2="64" y2="75" stroke="#8a6820" strokeWidth="1" />
          <line x1="64" y1="61" x2="75" y2="61" stroke="#8a6820" strokeWidth="0.8" />
          <line x1="64" y1="65" x2="75" y2="65" stroke="#8a6820" strokeWidth="0.8" />
          <line x1="64" y1="69" x2="75" y2="69" stroke="#8a6820" strokeWidth="0.8" />
        </g>
      ),
    },
  };
  const { hairColor, hasBeard, hasVeil, hairWavy, accessory, bg } = configs[tipo];

  return (
    <svg width={size} height={Math.round(size * 1.2)} viewBox="0 0 80 96">
      {/* bg circle */}
      <circle cx="40" cy="44" r="38" fill={bg} opacity="0.7" />

      {/* ── ROBE ──────────────────────────── */}
      <path d="M22 40 Q12 66 10 94 L70 94 Q68 66 58 40 Z" fill={cor} />
      <path d="M33 40 Q29 62 28 94 L52 94 Q51 62 47 40 Z" fill={cor} opacity="0.55" />
      <path d="M38 40 Q37 62 36 94 L44 94 Q43 62 42 40 Z" fill="white" opacity="0.13" />
      {/* Sash */}
      <path d="M18 56 Q40 61 62 56 L60 64 Q40 69 20 64 Z" fill={sash} />
      <circle cx="40" cy="60" r="4" fill={sash} />
      <circle cx="40" cy="60" r="2.5" fill="#8a4010" />

      {/* ── ARMS ──────────────────────────── */}
      <path d="M22 46 Q8 60 6 76" stroke={cor} strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M22 46 Q8 60 6 76" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M58 46 Q72 60 74 76" stroke={cor} strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M58 46 Q72 60 74 76" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
      <ellipse cx="6" cy="78" rx="5.5" ry="4.5" fill={skin} />
      <ellipse cx="74" cy="78" rx="5.5" ry="4.5" fill={skin} />

      {/* ── NECK ──────────────────────────── */}
      <rect x="36" y="36" width="8" height="8" rx="3" fill={skin} />

      {/* ── SANDALS ───────────────────────── */}
      <ellipse cx="27" cy="93" rx="11" ry="5" fill={sandal} />
      <ellipse cx="53" cy="93" rx="11" ry="5" fill={sandal} />
      <path d="M20 91 Q27 87 34 91" stroke={sandal} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M46 91 Q53 87 60 91" stroke={sandal} strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* ── HAIR (atrás da cabeça) ─────────── */}
      {hasVeil ? (
        <>
          <ellipse cx="40" cy="12" rx="20" ry="13" fill={hairColor} />
          <path d="M20 18 Q16 30 18 44" stroke={hairColor} strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.9" />
          <path d="M60 18 Q64 30 62 44" stroke={hairColor} strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.9" />
        </>
      ) : (
        <>
          <ellipse cx="40" cy="8" rx="18" ry="10" fill={hairColor} />
          {hairWavy ? (
            <>
              <path d="M22 20 C 18 28, 22 34, 18 42 C 16 46, 18 50, 20 52" stroke={hairColor} strokeWidth="8" strokeLinecap="round" fill="none" />
              <path d="M58 20 C 62 28, 58 34, 62 42 C 64 46, 62 50, 60 52" stroke={hairColor} strokeWidth="8" strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              <ellipse cx="22" cy="22" rx="4" ry="9" fill={hairColor} />
              <ellipse cx="58" cy="22" rx="4" ry="9" fill={hairColor} />
            </>
          )}
        </>
      )}

      {/* ── FACE ──────────────────────────── */}
      <ellipse cx="40" cy="22" rx="17" ry="18" fill={skin} />
      {/* Bochechas */}
      <ellipse cx="26" cy="30" rx="4.5" ry="3" fill="#e06040" opacity="0.22" />
      <ellipse cx="54" cy="30" rx="4.5" ry="3" fill="#e06040" opacity="0.22" />
      {/* Sobrancelhas */}
      <path d="M26 14 Q31 12 36 14" stroke={hairColor} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M44 14 Q49 12 54 14" stroke={hairColor} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Olhos */}
      <ellipse cx="32" cy="21" rx="5.5" ry="6" fill="white" />
      <ellipse cx="48" cy="21" rx="5.5" ry="6" fill="white" />
      <circle cx="32.5" cy="21.5" r="3.5" fill="#3a200a" />
      <circle cx="48.5" cy="21.5" r="3.5" fill="#3a200a" />
      <circle cx="32.5" cy="21.5" r="2" fill="#1a0a04" />
      <circle cx="48.5" cy="21.5" r="2" fill="#1a0a04" />
      <circle cx="33.8" cy="19.8" r="1.4" fill="white" />
      <circle cx="49.8" cy="19.8" r="1.4" fill="white" />
      {/* Nariz */}
      <path d="M37 28 Q40 33 43 28" stroke="#b06840" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Sorriso */}
      <path d="M31 34 Q40 41 49 34" stroke="#904820" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Barba */}
      {hasBeard && (
        <path d="M24 32 Q28 44 40 46 Q52 44 56 32 Q50 39 40 41 Q30 39 24 32 Z" fill={hairColor} opacity="0.72" />
      )}
      {/* Véu */}
      {hasVeil && (
        <path d="M20 18 Q40 10 60 18 L56 36 Q40 30 24 36 Z" fill={hairColor} opacity="0.82" />
      )}

      {/* Acessório */}
      {accessory}
    </svg>
  );
}

function MascoteFlutuante() {
  return (
    <svg width="62" height="62" viewBox="0 0 60 60">
      <circle cx="30" cy="30" r="29" fill={DS.douradoSombra} />
      <circle cx="30" cy="30" r="26" fill={DS.douradoClaro} />
      <circle cx="30" cy="27" r="13" fill="#f2b97a" />
      <ellipse cx="30" cy="47" rx="13" ry="9" fill={DS.douradoSombra} />
      <ellipse cx="23" cy="25" rx="3" ry="3.5" fill="white" />
      <ellipse cx="37" cy="25" rx="3" ry="3.5" fill="white" />
      <circle cx="23.5" cy="25.5" r="1.8" fill="#2c1505" />
      <circle cx="37.5" cy="25.5" r="1.8" fill="#2c1505" />
      <circle cx="24.2" cy="24.8" r="0.8" fill="white" />
      <circle cx="38.2" cy="24.8" r="0.8" fill="white" />
      <path d="M25 32 Q30 37 35 32" stroke="#a06030" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <ellipse cx="30" cy="16" rx="14" ry="7" fill={DS.douradoSombra} opacity="0.6" />
    </svg>
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
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
      <main style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <MascoteFlutuante />
          <h1 style={{ fontFamily: "var(--font-cinzel)", fontSize: "28px", fontWeight: "900", color: DS.douradoClaro, marginTop: "12px", letterSpacing: "3px" }}>
            DISCYPULO
          </h1>
          <p style={{ color: DS.off, fontStyle: "italic", fontSize: "14px" }}>Uma jornada épica pela Palavra de Deus</p>
        </div>

        <div className="card-pergaminho" style={{ padding: "28px 24px" }}>
          <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "16px", color: DS.titulo, marginBottom: "20px", textAlign: "center" }}>
            Entrar na Jornada
          </h2>

          {erro && (
            <div style={{ background: DS.erro, border: `1px solid ${DS.vermelho}`, borderRadius: "6px", padding: "10px 12px", marginBottom: "14px", color: DS.vermelhoEsc, fontSize: "13px" }}>
              {erro}
            </div>
          )}

          <label style={{ display: "block", fontSize: "12px", fontFamily: "var(--font-cinzel)", color: DS.titulo, marginBottom: "6px", letterSpacing: "1px" }}>EMAIL</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            style={{ width: "100%", padding: "10px 14px", marginBottom: "14px", borderRadius: "6px", border: `1.5px solid ${DS.borda}`, background: "#fdf6e8", color: DS.titulo, fontFamily: "var(--font-garamond)", fontSize: "15px", outline: "none" }}
          />

          <label style={{ display: "block", fontSize: "12px", fontFamily: "var(--font-cinzel)", color: DS.titulo, marginBottom: "6px", letterSpacing: "1px" }}>SENHA</label>
          <input
            type="password" value={senha} onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === "Enter" && entrar()}
            placeholder="••••••••"
            style={{ width: "100%", padding: "10px 14px", marginBottom: "20px", borderRadius: "6px", border: `1.5px solid ${DS.borda}`, background: "#fdf6e8", color: DS.titulo, fontFamily: "var(--font-garamond)", fontSize: "15px", outline: "none" }}
          />

          <button
            onClick={entrar} disabled={carregando}
            className="btn-medieval btn-dourado"
            style={{ width: "100%", padding: "13px", fontSize: "14px", marginBottom: "12px" }}
          >
            {carregando ? "Entrando..." : "⚔️ Entrar"}
          </button>

          <button
            onClick={onCadastro}
            className="btn-medieval btn-escuro"
            style={{ width: "100%", padding: "11px", fontSize: "13px" }}
          >
            Criar conta — é grátis
          </button>
        </div>

        <SlotAnuncio altura={60} label="banner" />
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
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
      <main style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h1 style={{ fontFamily: "var(--font-cinzel)", fontSize: "24px", fontWeight: "900", color: DS.douradoClaro, letterSpacing: "2px" }}>
            Criar Conta
          </h1>
        </div>

        <div className="card-pergaminho" style={{ padding: "28px 24px" }}>
          {erro && (
            <div style={{ background: DS.erro, border: `1px solid ${DS.vermelho}`, borderRadius: "6px", padding: "10px 12px", marginBottom: "14px", color: DS.vermelhoEsc, fontSize: "13px" }}>
              {erro}
            </div>
          )}

          {(["NOME DO PEREGRINO", "EMAIL", "SENHA"] as const).map((label, i) => (
            <div key={label}>
              <label style={{ display: "block", fontSize: "12px", fontFamily: "var(--font-cinzel)", color: DS.titulo, marginBottom: "6px", letterSpacing: "1px" }}>{label}</label>
              <input
                type={i === 2 ? "password" : i === 1 ? "email" : "text"}
                value={[nome, email, senha][i]}
                onChange={e => [setNome, setEmail, setSenha][i](e.target.value)}
                placeholder={["Seu nome na jornada", "seu@email.com", "Mínimo 6 caracteres"][i]}
                style={{ width: "100%", padding: "10px 14px", marginBottom: "14px", borderRadius: "6px", border: `1.5px solid ${DS.borda}`, background: "#fdf6e8", color: DS.titulo, fontFamily: "var(--font-garamond)", fontSize: "15px", outline: "none" }}
              />
            </div>
          ))}

          <button onClick={cadastrar} disabled={carregando} className="btn-medieval btn-dourado"
            style={{ width: "100%", padding: "13px", fontSize: "14px", marginBottom: "12px" }}>
            {carregando ? "Criando conta..." : "✝ Iniciar Jornada"}
          </button>
          <button onClick={onVoltar} className="btn-medieval btn-escuro"
            style={{ width: "100%", padding: "11px", fontSize: "13px" }}>
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
    <div style={{ position: "fixed", inset: 0, overflowY: "auto", display: "flex", justifyContent: "center", padding: "20px" }}>
      <main style={{ width: "100%", maxWidth: "450px", paddingBottom: "40px" }}>
        <div style={{ textAlign: "center", margin: "20px 0 24px" }}>
          <h1 style={{ fontFamily: "var(--font-cinzel)", fontSize: "22px", fontWeight: "900", color: DS.douradoClaro, letterSpacing: "2px" }}>
            Escolha seu Personagem
          </h1>
          <p style={{ color: DS.off, fontSize: "13px", fontStyle: "italic" }}>Você pode trocar depois</p>
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
                padding: "12px 10px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
                border: `2px solid ${tipoSel === a.id ? DS.douradoClaro : DS.borda}`,
                background: tipoSel === a.id ? "linear-gradient(145deg,#fdf6e3,#f0e4c0)" : "#fdf6e8",
                boxShadow: tipoSel === a.id ? `0 0 12px rgba(212,160,20,0.4)` : "none",
                transition: "all 0.15s",
              }}>
              <div style={{ marginBottom: "4px" }}>
                <SvgPersonagem tipo={a.id} cor={corSel} size={44} />
              </div>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "11px", fontWeight: "700", color: DS.titulo }}>{a.nome}</div>
              <div style={{ fontSize: "11px", color: DS.off, marginTop: "2px", lineHeight: 1.3 }}>{a.desc}</div>
            </button>
          ))}
        </div>

        {/* Cor da roupa */}
        <div className="card-pergaminho" style={{ padding: "16px 20px", marginBottom: "20px" }}>
          <p style={{ fontFamily: "var(--font-cinzel)", fontSize: "12px", color: DS.titulo, marginBottom: "12px", letterSpacing: "1px" }}>COR DA ROUPA</p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {CORES_ROUPA.map(c => (
              <button key={c.id} onClick={() => setCorSel(c.hex)}
                title={c.nome}
                style={{
                  width: "36px", height: "36px", borderRadius: "50%", background: c.hex, cursor: "pointer",
                  border: `3px solid ${corSel === c.hex ? DS.douradoClaro : "transparent"}`,
                  boxShadow: corSel === c.hex ? `0 0 10px rgba(212,160,20,0.6)` : "0 1px 3px rgba(0,0,0,0.3)",
                  transition: "all 0.15s",
                }} />
            ))}
          </div>
        </div>

        <button onClick={confirmar} disabled={carregando} className="btn-medieval btn-dourado"
          style={{ width: "100%", padding: "15px", fontSize: "15px" }}>
          {carregando ? "Salvando..." : "✝ Começar a Jornada"}
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
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: DS.bg }}>
      {/* Header */}
      <div className="banner-faixa" style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: "12px", zIndex: 10 }}>
        <button onClick={onVoltar} style={{ background: "none", border: "none", color: DS.douradoClaro, fontSize: "20px", cursor: "pointer", padding: "4px 8px" }}>←</button>
        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "16px", color: DS.douradoClaro, fontWeight: "700", letterSpacing: "1px" }}>
          Armadura de Deus
        </span>
        <span style={{ marginLeft: "auto", fontSize: "12px", color: DS.off }}>Ef 6:11</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {/* Personagem + stats */}
        <div className="card-pergaminho" style={{ padding: "20px", marginBottom: "16px", textAlign: "center" }}>
          <SvgPersonagem tipo={perfil.personagem_tipo} cor={perfil.personagem_cor} size={90} />
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "18px", fontWeight: "700", color: DS.titulo, marginTop: "8px" }}>{perfil.nome}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "12px" }}>
            {[
              { icon: "⚡", val: perfil.xp.toLocaleString(), label: "XP" },
              { icon: "🪙", val: perfil.talentos, label: "Talentos" },
              { icon: "🔥", val: perfil.sequencia, label: "Dias" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "18px" }}>{s.icon}</div>
                <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "14px", fontWeight: "700", color: DS.titulo }}>{s.val}</div>
                <div style={{ fontSize: "11px", color: DS.off }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "14px" }}>
            <div style={{ fontSize: "12px", color: DS.off, marginBottom: "6px" }}>{totalPecas}/6 peças</div>
            <div className="barra-progress-track" style={{ height: "10px" }}>
              <div className="barra-progress-fill" style={{ width: `${(totalPecas / 6) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Versículo */}
        <div style={{ textAlign: "center", padding: "12px 20px", marginBottom: "16px" }}>
          <p style={{ fontStyle: "italic", color: DS.corpo, fontSize: "13px", lineHeight: 1.6 }}>
            "Revesti-vos de toda a armadura de Deus, para que possais estar firmes contra as ciladas do diabo."
          </p>
          <span style={{ fontSize: "12px", color: DS.dourado }}>— Efésios 6:11</span>
        </div>

        {/* Peças */}
        {PECAS_ARMADURA.map(peca => {
          const desbloqueada = !!pecasUnlocked[peca.id];
          return (
            <div key={peca.id} className="card-pergaminho" style={{
              padding: "14px 16px", marginBottom: "10px", display: "flex", gap: "14px", alignItems: "flex-start",
              opacity: desbloqueada ? 1 : 0.6,
              filter: desbloqueada ? "none" : "grayscale(0.6)",
            }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "50%", flexShrink: 0,
                background: desbloqueada
                  ? `linear-gradient(145deg, ${DS.douradoClaro}, ${DS.douradoSombra})`
                  : "linear-gradient(145deg, #9a8060, #6a5040)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "22px",
                boxShadow: desbloqueada ? `0 0 14px rgba(212,160,20,0.5)` : "none",
              }}>
                {desbloqueada ? peca.icone : "🔒"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "13px", fontWeight: "700", color: DS.titulo }}>{peca.nome}</span>
                  <span style={{ fontSize: "11px", color: DS.dourado }}>{peca.referencia}</span>
                </div>
                <p style={{ fontSize: "12px", color: DS.corpo, marginTop: "4px", lineHeight: 1.4 }}>{peca.descricao}</p>
                <p style={{ fontSize: "11px", color: desbloqueada ? DS.verde : DS.off, marginTop: "4px", fontWeight: "600" }}>
                  {desbloqueada ? `✓ ${peca.bonus}` : `🔒 ${peca.condicao}`}
                </p>
              </div>
            </div>
          );
        })}

        <SlotAnuncio altura={90} label="banner" />
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
        background: ativo ? "rgba(212,160,20,0.2)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${ativo ? DS.douradoClaro : DS.off}`,
        borderRadius: "50%", width: "26px", height: "26px",
        cursor: "pointer", fontSize: "13px", display: "flex",
        alignItems: "center", justifyContent: "center",
        color: ativo ? DS.douradoClaro : DS.off,
        transition: "all 0.2s",
      }}
    >{ativo ? "🎵" : "🔇"}</button>
  );
}

// ── Tela HOME ─────────────────────────────────────────────────────
function TelaHome({
  perfil, vidas, onEscolher, onArmadura, onPersonagem, onSair,
}: {
  perfil: Perfil; vidas: number;
  onEscolher: (t: Trilha) => void;
  onArmadura: () => void;
  onPersonagem: () => void;
  onSair: () => void;
}) {
  const pecasTotal = Object.values(perfil.armadura).filter(Boolean).length;

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <style>{`
        @keyframes pulse-glow {
          0%,100% { text-shadow: 0 0 20px rgba(212,160,23,0.4), 0 2px 4px rgba(0,0,0,0.6); }
          50%      { text-shadow: 0 0 40px rgba(212,160,23,0.8), 0 2px 4px rgba(0,0,0,0.6); }
        }
        .titulo-hero { animation: pulse-glow 3s ease-in-out infinite; }
      `}</style>

      <main style={{ width: "100%", maxWidth: "450px", padding: "24px 20px" }}>
        {/* Header */}
        <div className="banner-faixa" style={{ borderRadius: "8px 8px 0 0", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0" }}>
          <button onClick={onPersonagem} title="Personalizar personagem"
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <SvgPersonagem tipo={perfil.personagem_tipo} cor={perfil.personagem_cor} size={32} />
            <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "12px", color: DS.douradoClaro, maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{perfil.nome}</span>
          </button>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#f0d898" }}>🔥 {perfil.sequencia}</span>
            <span style={{ fontSize: "13px", color: "#f0a0a0" }}>{"❤️".repeat(vidas)}{"🖤".repeat(VIDAS_MAX - vidas)}</span>
            <span style={{ fontSize: "13px", color: DS.douradoClaro }}>🪙 {perfil.talentos}</span>
            <BotaoBgm />
          </div>
        </div>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
          <div style={{
            width: "76px", height: "76px", margin: "0 auto 14px", borderRadius: "50%",
            background: `linear-gradient(145deg, ${DS.douradoClaro}, ${DS.douradoSombra})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 20px rgba(212,160,20,0.5), 0 4px 12px rgba(0,0,0,0.4)`,
            fontSize: "34px",
          }}>✝</div>
          <h1 className="titulo-hero" style={{ fontFamily: "var(--font-cinzel)", fontSize: "30px", fontWeight: "900", color: DS.douradoClaro, margin: "0 0 4px", letterSpacing: "3px" }}>
            DISCYPULO
          </h1>
          <p style={{ color: DS.off, fontStyle: "italic", fontSize: "13px" }}>Uma jornada épica pela Palavra de Deus</p>

          {/* Mini armadura */}
          {pecasTotal > 0 && (
            <button onClick={onArmadura} style={{ background: "none", border: "none", cursor: "pointer", marginTop: "8px" }}>
              <span style={{ fontSize: "11px", color: DS.dourado }}>
                {PECAS_ARMADURA.filter(p => perfil.armadura[p.id]).map(p => p.icone).join(" ")} — {pecasTotal}/6 peças
              </span>
            </button>
          )}
        </div>

        {/* Personagem card */}
        <button onClick={onPersonagem} style={{
          width: "100%", background: "none", border: "none", cursor: "pointer", padding: "0", marginBottom: "12px",
        }}>
          <div className="card-pergaminho" style={{
            padding: "12px 16px", display: "flex", alignItems: "center", gap: "14px",
            border: `1.5px solid ${DS.douradoClaro}`, boxShadow: `0 0 10px rgba(212,160,20,0.2)`,
          }}>
            <SvgPersonagem tipo={perfil.personagem_tipo} cor={perfil.personagem_cor} size={56} />
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "14px", fontWeight: "700", color: DS.titulo }}>{perfil.nome}</div>
              <div style={{ fontSize: "11px", color: DS.off, marginTop: "2px" }}>
                {ARQUETIPOS.find(a => a.id === perfil.personagem_tipo)?.nome ?? perfil.personagem_tipo}
              </div>
            </div>
            <span style={{ fontSize: "12px", color: DS.dourado, fontFamily: "var(--font-cinzel)" }}>✏️ Editar</span>
          </div>
        </button>

        <div className="divisor-ornamentado"><span>✦</span></div>

        {/* Bíblia */}
        <div className="card-pergaminho" style={{ padding: "16px 20px", marginBottom: "12px" }}>
          <p style={{ fontFamily: "var(--font-cinzel)", fontSize: "13px", color: DS.titulo, marginBottom: "10px" }}>📖 A Bíblia</p>
          <p style={{ fontSize: "13px", color: DS.corpo, marginBottom: "14px", lineHeight: 1.5 }}>
            Explore o Velho e o Novo Testamento com quizzes sobre todos os livros sagrados.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => onEscolher("VT")} className="btn-medieval btn-dourado"
              style={{ flex: 1, padding: "12px 8px", fontSize: "13px" }}>
              Velho Test.
            </button>
            <button onClick={() => onEscolher("NT")} className="btn-medieval btn-escuro"
              style={{ flex: 1, padding: "12px 8px", fontSize: "13px" }}>
              Novo Test.
            </button>
          </div>
        </div>

        {/* Jornada */}
        <div style={{
          background: `linear-gradient(145deg, ${DS.vermelhoEsc}, ${DS.vermelho})`,
          border: `1.5px solid rgba(200,80,80,0.4)`, borderRadius: "8px",
          padding: "16px 20px", marginBottom: "12px",
          boxShadow: `0 0 16px rgba(120,20,20,0.4), 0 2px 8px rgba(0,0,0,0.4)`,
        }}>
          <p style={{ fontFamily: "var(--font-cinzel)", fontSize: "13px", color: "#ffcccc", marginBottom: "6px" }}>✝ Jornada de Jesus</p>
          <p style={{ fontSize: "12px", color: "#ffaaaa", marginBottom: "12px", lineHeight: 1.5 }}>
            Caminhe ao lado de Jesus — do nascimento à ressurreição. Uma narrativa única.
          </p>
          <button onClick={() => onEscolher("JESUS")} className="btn-medieval btn-vermelho"
            style={{ width: "100%", padding: "12px", fontSize: "13px" }}>
            Iniciar Jornada
          </button>
        </div>

        {/* XP bar */}
        <div style={{ padding: "0 4px", marginBottom: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: DS.off, marginBottom: "4px" }}>
            <span>⚡ {perfil.xp.toLocaleString()} XP</span>
            <span>Nv. {Math.floor(perfil.xp / 500) + 1}</span>
          </div>
          <div className="barra-progress-track">
            <div className="barra-progress-fill" style={{ width: `${(perfil.xp % 500) / 5}%` }} />
          </div>
        </div>

        <SlotAnuncio altura={70} label="banner" />

        {/* Nav */}
        <div className="banner-faixa" style={{ borderRadius: "0 0 8px 8px", padding: "8px 0", display: "flex", justifyContent: "space-around" }}>
          {[
            { icon: "🏠", label: "Início", action: () => {} },
            { icon: "🛡️", label: "Armadura", action: onArmadura },
            { icon: "🧙", label: "Personagem", action: onPersonagem },
            { icon: "↩️", label: "Sair", action: onSair },
          ].map(nav => (
            <button key={nav.label} onClick={nav.action}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "4px 10px" }}>
              <span style={{ fontSize: "18px" }}>{nav.icon}</span>
              <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "9px", color: DS.off }}>{nav.label}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

// ── Tela MAPA ─────────────────────────────────────────────────────
function TelaMapa({
  trilha, perfil, vidas, progressoCompleto,
  onCapitulo, onVoltar,
}: {
  trilha: Trilha; perfil: Perfil; vidas: number;
  progressoCompleto: Set<string>;
  onCapitulo: (c: Capitulo, idx: number) => void;
  onVoltar: () => void;
}) {
  const capitulos: Capitulo[] = trilha === "VT" ? velhoTestamento : trilha === "NT" ? novoTestamento : jornadaJesus;
  const titulo = trilha === "VT" ? "Velho Testamento" : trilha === "NT" ? "Novo Testamento" : "Jornada de Jesus";

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: DS.bg }}>
      {/* Header */}
      <div className="banner-faixa" style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px", zIndex: 10 }}>
        <button onClick={onVoltar} style={{ background: "none", border: "none", color: DS.douradoClaro, fontSize: "20px", cursor: "pointer", padding: "4px 8px" }}>←</button>
        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "16px", color: DS.douradoClaro, fontWeight: "700" }}>{titulo}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "12px" }}>
          <span style={{ fontSize: "13px", color: "#f0a0a0" }}>{"❤️".repeat(vidas)}</span>
          <span style={{ fontSize: "13px", color: DS.douradoClaro }}>🪙 {perfil.talentos}</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 40px", position: "relative" }}>
        {/* Personagem */}
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <SvgPersonagem tipo={perfil.personagem_tipo} cor={perfil.personagem_cor} size={72} />
        </div>

        {/* Caminho */}
        <div style={{ position: "relative", paddingBottom: "20px" }}>
          {/* Linha do caminho */}
          <div style={{
            position: "absolute", left: "50%", top: "10px", bottom: "10px",
            width: "6px", marginLeft: "-3px",
            background: `linear-gradient(180deg, ${DS.douradoSombra} 0%, ${DS.borda} 100%)`,
            borderRadius: "3px", opacity: 0.4,
            backgroundImage: "repeating-linear-gradient(180deg, transparent 0, transparent 8px, rgba(255,255,255,0.15) 8px, rgba(255,255,255,0.15) 10px)",
          }} />

          {capitulos.map((cap, idx) => {
            const chave = `${trilha}_${cap.id}`;
            const completo = progressoCompleto.has(chave);
            const bloqueado = idx > 0 && !progressoCompleto.has(`${trilha}_${capitulos[idx - 1].id}`);
            const lado = idx % 2 === 0 ? "left" : "right";

            return (
              <div key={cap.id} style={{
                display: "flex",
                flexDirection: lado === "left" ? "row" : "row-reverse",
                alignItems: "center", gap: "12px",
                marginBottom: "24px", position: "relative",
              }}>
                {/* Info */}
                <div style={{ flex: 1, textAlign: lado === "left" ? "right" : "left", opacity: bloqueado ? 0.5 : 1 }}>
                  <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "12px", color: DS.titulo, fontWeight: "700" }}>{cap.titulo}</div>
                  {completo && <div style={{ fontSize: "10px", color: DS.verde }}>✓ Completo</div>}
                </div>

                {/* Botão capítulo */}
                <button
                  disabled={bloqueado}
                  onClick={() => !bloqueado && onCapitulo(cap, idx)}
                  style={{
                    width: "64px", height: "64px", borderRadius: "50%", flexShrink: 0,
                    background: completo
                      ? `linear-gradient(145deg, ${DS.douradoClaro}, ${DS.douradoSombra})`
                      : bloqueado
                        ? "linear-gradient(145deg, #8a7a60, #6a5a40)"
                        : `linear-gradient(145deg, #fdf6e3, ${DS.borda})`,
                    border: `2px solid ${completo ? DS.douradoClaro : bloqueado ? DS.off : DS.borda}`,
                    boxShadow: completo
                      ? `0 0 16px rgba(212,160,20,0.6), 0 4px 8px rgba(0,0,0,0.3)`
                      : `0 3px 8px rgba(0,0,0,0.25)`,
                    cursor: bloqueado ? "not-allowed" : "pointer",
                    fontSize: "24px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "box-shadow 0.2s",
                  }}>
                  {bloqueado ? "🔒" : completo ? cap.icone : cap.icone}
                </button>

                <div style={{ flex: 1, opacity: bloqueado ? 0.5 : 1 }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Tela QUIZ ─────────────────────────────────────────────────────
function TelaQuiz({
  capitulo, trilha, perfil, vidas,
  onConcluir, onSemVidas,
}: {
  capitulo: Capitulo; trilha: Trilha; perfil: Perfil; vidas: number;
  onConcluir: (acertos: number, xpGanho: number, talentosGanho: number) => void;
  onSemVidas: () => void;
}) {
  const questoesPrincipais = capitulo.perguntas;
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

  function proximo() {
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

  const corFeedback = feedback?.certa ? DS.acerto : DS.erro;
  const bordaFeedback = feedback?.certa ? DS.verde : DS.vermelho;
  const podeVerificar = isOrdenar ? ordemToque.length === opcoes.length : selecionada !== null;

  if (phase === "review-intro") return (
    <div style={{ position: "fixed", inset: 0, background: `linear-gradient(145deg,${DS.vermelhoEsc},#1a0808)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", padding: "32px" }}>
      <style>{`@keyframes rl { from{width:0%} to{width:100%} }`}</style>
      <div style={{ fontSize: "52px" }}>🔄</div>
      <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "24px", color: "#ffdddd", fontWeight: "900", letterSpacing: "2px", textAlign: "center" }}>Revisão de Erros</h2>
      <p style={{ color: "#ffaaaa", fontSize: "15px", textAlign: "center", lineHeight: 1.6 }}>
        Você errou <strong style={{ color: "#ff6666" }}>{reviewList.length}</strong> questão{reviewList.length !== 1 ? "ões" : ""}.<br />
        Vamos revisar para fixar o aprendizado!
      </p>
      <div style={{ width: "60px", height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
        <div style={{ height: "100%", background: "#ff8888", borderRadius: "3px", animation: "rl 2.5s linear forwards" }} />
      </div>
    </div>
  );

  if (!q) return null;

  function renderEnunciado() {
    if (q.tipo === "quem_disse") {
      return (
        <div style={{ marginBottom: "16px" }}>
          <div className="card-pergaminho" style={{ padding: "20px 22px", position: "relative" }}>
            <span style={{ position: "absolute", top: "10px", left: "14px", fontSize: "40px", color: DS.dourado, opacity: 0.3, lineHeight: 1, fontFamily: "Georgia" }}>"</span>
            <p style={{ fontSize: "17px", color: DS.titulo, lineHeight: 1.7, fontStyle: "italic", textAlign: "center", padding: "14px 10px 4px" }}>{sub((q as any).frase, perfil.nome)}</p>
            <span style={{ position: "absolute", bottom: "10px", right: "14px", fontSize: "40px", color: DS.dourado, opacity: 0.3, lineHeight: 1, fontFamily: "Georgia" }}>"</span>
          </div>
          <p style={{ textAlign: "center", fontSize: "12px", color: DS.off, marginTop: "8px" }}>Quem pronunciou estas palavras?</p>
        </div>
      );
    }
    if (q.tipo === "completar_versiculo") {
      const partes = sub((q as any).versiculo, perfil.nome).split("___");
      const palavraSel = selecionada !== null ? opcoes[selecionada] : null;
      return (
        <div className="card-pergaminho" style={{ padding: "18px 20px", marginBottom: "16px" }}>
          <p style={{ fontSize: "11px", color: DS.dourado, fontFamily: "var(--font-cinzel)", marginBottom: "10px", letterSpacing: "1px" }}>{(q as any).referencia}</p>
          <p style={{ fontSize: "16px", color: DS.titulo, lineHeight: 1.8, fontStyle: "italic" }}>
            {partes[0]}
            <span style={{ display: "inline-block", minWidth: "80px", textAlign: "center", borderBottom: `2px solid ${confirmada ? (selecionada === correta ? DS.verde : DS.vermelho) : DS.dourado}`, padding: "0 8px", fontStyle: "normal", fontWeight: "700", color: confirmada ? (selecionada === correta ? DS.verde : DS.vermelho) : DS.douradoClaro }}>
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
              <div key={i} className="card-pergaminho" style={{ padding: "12px 16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0, background: DS.douradoSombra, color: "#fff8e0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-cinzel)", fontSize: "11px", fontWeight: "700" }}>{i + 1}</span>
                <p style={{ fontSize: "14px", color: DS.corpo, lineHeight: 1.5, fontStyle: "italic", flex: 1 }}>{sub(pista, perfil.nome)}</p>
              </div>
            ))}
          </div>
          {!confirmada && pistaIdx < pistas.length && (
            <button onClick={() => setPistaIdx(p => p + 1)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1.5px dashed ${DS.borda}`, background: "transparent", color: DS.off, fontSize: "13px", cursor: "pointer", fontFamily: "var(--font-garamond)" }}>
              🔍 Ver próxima pista ({pistas.length - pistaIdx} restante{pistas.length - pistaIdx !== 1 ? "s" : ""})
            </button>
          )}
        </div>
      );
    }
    if (q.tipo === "ordenar_eventos") {
      return (
        <div style={{ marginBottom: "16px" }}>
          <div className="card-pergaminho" style={{ padding: "12px 16px", marginBottom: "12px" }}>
            <p style={{ fontSize: "14px", color: DS.corpo, lineHeight: 1.5, fontStyle: "italic" }}>{sub((q as any).enunciado, perfil.nome)}</p>
          </div>
          <p style={{ fontSize: "11px", color: DS.off, marginBottom: "8px", textAlign: "center" }}>Toque na ordem correta (do 1º ao último):</p>
        </div>
      );
    }
    return (
      <div className="card-pergaminho" style={{ padding: "16px 20px", marginBottom: "16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <SvgPersonagem tipo={perfil.personagem_tipo} cor={perfil.personagem_cor} size={56} />
        <p style={{ fontSize: "15px", color: DS.corpo, lineHeight: 1.6, fontStyle: "italic", flex: 1 }}>{getEnunciado(q, perfil.nome)}</p>
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
            let bg = i === 0 ? `linear-gradient(145deg,#1a5c1a,#0e3a0e)` : `linear-gradient(145deg,#5c1a1a,#3a0e0e)`;
            let borda = i === 0 ? "#2a8c2a" : "#8c2a2a"; let cor = i === 0 ? "#b0ffb0" : "#ffb0b0";
            if (confirmada) {
              if (i === correta) { bg = `linear-gradient(145deg,#1a5c1a,#0e3a0e)`; borda = DS.verde; cor = "#b0ffb0"; }
              else if (i === selecionada) { bg = `linear-gradient(145deg,#5c1a1a,#3a0e0e)`; borda = DS.vermelho; cor = "#ffb0b0"; }
              else { bg = `linear-gradient(145deg,#3a3020,#2a2010)`; borda = DS.borda; cor = DS.off; }
            } else if (i === selecionada) {
              bg = i === 0 ? `linear-gradient(145deg,#1e7a1e,#155215)` : `linear-gradient(145deg,#7a1e1e,#521515)`;
              borda = i === 0 ? "#5adf5a" : "#df5a5a";
            }
            return (
              <button key={i} onClick={() => !confirmada && setSelecionada(i)} style={{ padding: "20px 10px", borderRadius: "12px", cursor: confirmada ? "default" : "pointer", border: `2px solid ${borda}`, background: bg, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", transition: "all 0.15s", boxShadow: i === selecionada && !confirmada ? `0 0 16px ${borda}88` : "0 3px 8px rgba(0,0,0,0.3)" }}>
                <span style={{ fontSize: "32px", lineHeight: 1 }}>{label.emoji}</span>
                <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "13px", fontWeight: "700", color: cor, letterSpacing: "0.5px" }}>{label.texto}</span>
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
            let bg = DS.bgCard, borda = DS.borda, cor = DS.titulo;
            if (confirmada) { if (i === correta) { bg = DS.acerto; borda = DS.verde; cor = DS.verde; } else if (i === selecionada) { bg = DS.erro; borda = DS.vermelho; cor = DS.vermelho; } }
            else if (i === selecionada) { bg = "linear-gradient(145deg,#fdf6e3,#f0e4c0)"; borda = DS.douradoClaro; cor = DS.douradoSombra; }
            return (
              <button key={i} onClick={() => !confirmada && setSelecionada(i)} style={{ padding: "10px 22px", borderRadius: "24px", cursor: confirmada ? "default" : "pointer", border: `2px solid ${borda}`, background: bg, color: cor, fontFamily: "var(--font-garamond)", fontSize: "15px", fontWeight: "700", transition: "all 0.15s", boxShadow: i === selecionada && !confirmada ? `0 0 12px rgba(212,160,20,0.5)` : "0 2px 4px rgba(0,0,0,0.15)" }}>
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
            let bg = DS.bgCard, borda = DS.borda, cor = DS.titulo, badge = tocado ? String(pos + 1) : "·", badgeBg = tocado ? DS.douradoSombra : DS.off;
            if (confirmada && tocado) { const ok = ordemCorreta[pos] === i; if (ok) { bg = DS.acerto; borda = DS.verde; cor = DS.verde; badgeBg = DS.verde; badge = "✓"; } else { bg = DS.erro; borda = DS.vermelho; cor = DS.vermelho; badgeBg = DS.vermelho; badge = "✗"; } }
            else if (tocado) { bg = "linear-gradient(145deg,#fdf6e3,#f0e4c0)"; borda = DS.douradoClaro; }
            return (
              <button key={i} onClick={() => { if (confirmada) return; tocado ? setOrdemToque(p => p.filter(x => x !== i)) : setOrdemToque(p => [...p, i]); }} style={{ padding: "12px 16px", borderRadius: "8px", cursor: confirmada ? "default" : "pointer", display: "flex", alignItems: "center", gap: "12px", textAlign: "left", border: `1.5px solid ${borda}`, background: bg, fontFamily: "var(--font-garamond)", fontSize: "14px", color: cor, transition: "all 0.15s", width: "100%", boxShadow: tocado && !confirmada ? `0 0 8px rgba(212,160,20,0.3)` : "0 2px 6px rgba(0,0,0,0.1)" }}>
                <span style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: badgeBg, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-cinzel)", fontSize: "13px", fontWeight: "700" }}>{badge}</span>
                <span style={{ flex: 1 }}>{ev}</span>
              </button>
            );
          })}
          {!confirmada && ordemToque.length > 0 && ordemToque.length < opcoes.length && (
            <p style={{ fontSize: "11px", color: DS.off, textAlign: "center", marginTop: "4px" }}>{ordemToque.length}/{opcoes.length} — toque para ordenar todos</p>
          )}
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        {opcoes.map((op, i) => {
          let s: React.CSSProperties = { padding: "13px 16px", borderRadius: "8px", cursor: confirmada ? "default" : "pointer", display: "flex", alignItems: "center", gap: "12px", textAlign: "left", border: `1.5px solid ${DS.borda}`, background: DS.bgCard, fontFamily: "var(--font-garamond)", fontSize: "15px", color: DS.titulo, transition: "all 0.15s", width: "100%", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" };
          if (confirmada) { if (i === correta) s = { ...s, background: DS.acerto, border: `1.5px solid ${DS.verde}`, color: DS.verde }; else if (i === selecionada) s = { ...s, background: DS.erro, border: `1.5px solid ${DS.vermelho}`, color: DS.vermelho }; }
          else if (i === selecionada) { s = { ...s, background: "linear-gradient(145deg,#fdf6e3,#f0e4c0)", border: `1.5px solid ${DS.douradoClaro}`, boxShadow: `0 0 10px rgba(212,160,20,0.3)` }; }
          return (
            <button key={i} style={s} onClick={() => !confirmada && setSelecionada(i)}>
              <span style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: confirmada && i === correta ? DS.verde : confirmada && i === selecionada ? DS.vermelho : selecionada === i ? DS.douradoSombra : DS.off, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-cinzel)", fontSize: "12px", fontWeight: "700" }}>
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
        <div style={{ position: "absolute", top: "68px", left: "50%", transform: "translateX(-50%)", background: DS.vermelhoEsc, color: "#ffcccc", padding: "10px 20px", borderRadius: "20px", fontSize: "13px", fontFamily: "var(--font-cinzel)", zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.4)", animation: "fi 0.2s ease", whiteSpace: "nowrap" }}>{aviso}</div>
      )}
      {/* Header */}
      <div className="banner-faixa" style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
        <button onClick={() => onConcluir(acertos, xpGanho, talentosGanho)} style={{ background: "none", border: "none", color: DS.off, fontSize: "18px", cursor: "pointer", lineHeight: 1 }}>✕</button>
        <div className="barra-progress-track" style={{ flex: 1 }}>
          <div className="barra-progress-fill" style={{ width: `${progressoPct}%`, background: isReview ? "#ff8888" : undefined }} />
        </div>
        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "11px", color: isReview ? "#ff8888" : DS.dourado, whiteSpace: "nowrap" }}>
          {isReview ? "🔄" : "✦"} {questaoAtual + 1}/{questoes.length}
        </span>
        <span style={{ fontSize: "12px", color: "#f0a0a0" }}>{"❤️".repeat(vidasRestantes)}{"🖤".repeat(Math.max(0, VIDAS_MAX - vidasRestantes))}</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ background: isReview ? `linear-gradient(135deg,#7a1515,#4a0a0a)` : `linear-gradient(135deg,${DS.vermelho},${DS.vermelhoEsc})`, color: isReview ? "#ffaaaa" : "#ffcccc", fontSize: "11px", padding: "3px 10px", borderRadius: "12px", fontFamily: "var(--font-cinzel)", letterSpacing: "0.5px" }}>
            {isReview ? "🔄 REVISÃO" : `📖 ${capitulo.titulo.toUpperCase()}`}
          </span>
          {xpGanho > 0 && <span style={{ fontSize: "11px", color: DS.dourado }}>+{xpGanho} XP</span>}
        </div>
        <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "20px", color: DS.titulo, marginBottom: "16px", lineHeight: 1.3 }}>{getTitulo(q)}</h2>
        {renderEnunciado()}
        {feedback && (
          <div style={{ background: corFeedback, border: `1.5px solid ${bordaFeedback}`, borderRadius: "8px", padding: "12px 16px", marginBottom: "14px" }}>
            <p style={{ fontFamily: "var(--font-cinzel)", fontSize: "13px", fontWeight: "700", color: feedback.certa ? DS.verde : DS.vermelho, marginBottom: feedback.explicacao ? "6px" : 0 }}>
              {feedback.certa ? "✓ Correto!" : `✗ Errado!${isReview ? " (Revisão)" : ""}`}
            </p>
            {feedback.explicacao && <p style={{ fontSize: "12px", color: DS.corpo, lineHeight: 1.5 }}>{feedback.explicacao}</p>}
          </div>
        )}
        {renderOpcoes()}
      </div>

      <div className="banner-faixa" style={{ padding: "12px 20px" }}>
        {!confirmada ? (
          <button onClick={confirmar} disabled={!podeVerificar} className="btn-medieval btn-dourado" style={{ width: "100%", padding: "14px", fontSize: "14px", opacity: podeVerificar ? 1 : 0.5 }}>Verificar</button>
        ) : (
          <button onClick={proximo} className="btn-medieval btn-dourado" style={{ width: "100%", padding: "14px", fontSize: "14px" }}>
            {isReview ? (reviewIdx + 1 >= reviewList.length ? "Finalizar ✦" : "Próxima →") : (idx + 1 >= questoesPrincipais.length ? (wrongList.length > 0 ? "Revisar Erros 🔄" : "Ver Resultado ✦") : "Continuar →")}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Tela RESULTADO ────────────────────────────────────────────────
function TelaResultado({
  capitulo, acertos, total, xpGanho, talentosGanho, novasPecas,
  onReiniciar, onVoltar,
}: {
  capitulo: Capitulo; acertos: number; total: number;
  xpGanho: number; talentosGanho: number;
  novasPecas: string[];
  onReiniciar: () => void; onVoltar: () => void;
}) {
  const pct = Math.round((acertos / total) * 100);
  const perfeito = acertos === total;

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
      <style>{`
        @keyframes shine { 0%,100%{opacity:0.6} 50%{opacity:1} }
        .shine { animation: shine 1.5s ease-in-out infinite; }
      `}</style>
      <main style={{ width: "100%", maxWidth: "420px" }}>
        <div className="card-pergaminho" style={{ padding: "28px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "52px", marginBottom: "8px" }}>{perfeito ? "🏆" : pct >= 70 ? "⭐" : "📖"}</div>
          <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "22px", color: DS.titulo, marginBottom: "4px" }}>
            {perfeito ? "Perfeito!" : pct >= 70 ? "Muito bem!" : "Continue praticando"}
          </h2>
          <p style={{ color: DS.off, fontSize: "13px", marginBottom: "20px" }}>{capitulo.titulo}</p>

          {/* Score */}
          <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginBottom: "20px" }}>
            <div>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "28px", fontWeight: "900", color: perfeito ? DS.douradoClaro : DS.titulo }}>{pct}%</div>
              <div style={{ fontSize: "11px", color: DS.off }}>{acertos}/{total} certas</div>
            </div>
            <div style={{ width: "1px", background: DS.borda }} />
            <div>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "24px", color: DS.douradoClaro }}>+{xpGanho}</div>
              <div style={{ fontSize: "11px", color: DS.off }}>XP</div>
            </div>
            <div style={{ width: "1px", background: DS.borda }} />
            <div>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "24px", color: DS.dourado }}>+{talentosGanho}</div>
              <div style={{ fontSize: "11px", color: DS.off }}>🪙 Talentos</div>
            </div>
          </div>

          {/* Peças desbloqueadas */}
          {novasPecas.length > 0 && (
            <div style={{ background: `linear-gradient(145deg, #fdf6e3, #f0e4c0)`, border: `1.5px solid ${DS.douradoClaro}`, borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
              <p className="shine" style={{ fontFamily: "var(--font-cinzel)", fontSize: "12px", color: DS.dourado, marginBottom: "8px" }}>✦ ARMADURA DESBLOQUEADA ✦</p>
              {novasPecas.map(id => {
                const peca = PECAS_ARMADURA.find(p => p.id === id)!;
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
                    <span style={{ fontSize: "20px" }}>{peca.icone}</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "12px", color: DS.titulo }}>{peca.nome}</div>
                      <div style={{ fontSize: "11px", color: DS.verde }}>{peca.bonus}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button onClick={onReiniciar} className="btn-medieval btn-dourado"
              style={{ width: "100%", padding: "13px", fontSize: "14px" }}>
              Tentar Novamente
            </button>
            <button onClick={onVoltar} className="btn-medieval btn-escuro"
              style={{ width: "100%", padding: "11px", fontSize: "13px" }}>
              ← Voltar ao Mapa
            </button>
          </div>
        </div>
        <SlotAnuncio altura={90} label="banner" />
      </main>
    </div>
  );
}

// ── Tela de configuração (dev sem .env.local) ─────────────────────
function TelaSetup() {
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: "24px" }}>
      <div className="card-pergaminho" style={{ padding: "28px 24px", maxWidth: "420px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>⚙️</div>
          <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "18px", color: DS.titulo }}>Configurar Backend</h2>
          <p style={{ color: DS.off, fontSize: "13px", marginTop: "6px" }}>Crie o arquivo <code style={{ background: "#f0e4c0", padding: "2px 6px", borderRadius: "4px" }}>.env.local</code> na raiz do projeto</p>
        </div>
        <div style={{ background: "#1a0a02", borderRadius: "8px", padding: "16px", fontFamily: "monospace", fontSize: "12px", color: "#f0d898", marginBottom: "16px", lineHeight: 1.8 }}>
          <div style={{ color: DS.off, marginBottom: "4px" }}># .env.local</div>
          <div>NEXT_PUBLIC_SUPABASE_URL=<span style={{ color: DS.douradoClaro }}>https://xxx.supabase.co</span></div>
          <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=<span style={{ color: DS.douradoClaro }}>sua_chave_aqui</span></div>
        </div>
        <ol style={{ fontSize: "13px", color: DS.corpo, paddingLeft: "20px", lineHeight: 2 }}>
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
  const [resultadoState, setResultadoState] = useState({ acertos: 0, total: 0, xp: 0, talentos: 0, novasPecas: [] as string[] });

  const atualizarVidas = useCallback((p: Perfil) => {
    setVidasAtivas(calcularVidasAtuais(p));
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
    // Chegar ao fim sem perder todas as vidas = capítulo completo. Quem perde
    // todas as vidas vai para onSemVidas e nunca chama onConcluir.
    const completo = true;

    // Salva progresso
    await salvarProgresso(perfil.id, trilha, String(capitulo.id), acertos, completo);
    if (completo) {
      setProgressoIds(prev => new Set([...prev, `${trilha}_${capitulo.id}`]));
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
    if (completo) contagens[trilha]++;

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

    setResultadoState({ acertos, total: capitulo.perguntas.length, xp: xpGanho, talentos: talentosGanho, novasPecas });
    setTela("resultado");
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

  if (tela === "armadura") return (
    <TelaArmadura perfil={perfil} onVoltar={() => setTela("home")} />
  );

  if (tela === "home") return (
    <TelaHome
      perfil={perfil}
      vidas={vidasAtivas}
      onEscolher={t => { setTrilha(t); setTela("mapa"); }}
      onArmadura={() => setTela("armadura")}
      onPersonagem={() => setTela("criar_personagem")}
      onSair={handleSair}
    />
  );

  if (tela === "mapa") return (
    <TelaMapa
      trilha={trilha} perfil={perfil} vidas={vidasAtivas}
      progressoCompleto={progressoIds}
      onCapitulo={(cap) => { setCapitulo(cap); setTela("jogo"); }}
      onVoltar={() => setTela("home")}
    />
  );

  if (tela === "jogo" && capitulo) return (
    <TelaQuiz
      capitulo={capitulo} trilha={trilha} perfil={perfil} vidas={vidasAtivas}
      onConcluir={handleConcluirQuiz}
      onSemVidas={() => setTela("mapa")}
    />
  );

  if (tela === "resultado") return (
    <TelaResultado
      capitulo={capitulo!}
      acertos={resultadoState.acertos}
      total={resultadoState.total}
      xpGanho={resultadoState.xp}
      talentosGanho={resultadoState.talentos}
      novasPecas={resultadoState.novasPecas}
      onReiniciar={() => setTela("jogo")}
      onVoltar={() => setTela("mapa")}
    />
  );

  return null;
}
