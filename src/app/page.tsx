"use client";
import { useState } from "react";
import type { Questao, Capitulo } from "@/types";
import { velhoTestamento } from "@/data/velho-testamento";
import { novoTestamento } from "@/data/novo-testamento";
import { jornadaJesus } from "@/data/jornada-jesus";

const DS = {
  bg:            "#e8dfc8",
  bgCard:        "#f5edd8",
  borda:         "#c8b48a",
  titulo:        "#2c1505",
  corpo:         "#4a2e0e",
  dourado:       "#b8860b",
  douradoClaro:  "#d4a017",
  douradoSombra: "#7a5800",
  vermelho:      "#7a1515",
  vermelhoEsc:   "#4a0a0a",
  verde:         "#1a4a1a",
  acerto:        "#c8e6c0",
  erro:          "#f0c8c8",
  off:           "#9a8060",
};

type Tela = "home" | "mapa" | "jogo" | "resultado";
type Trilha = "VT" | "NT" | "JESUS";

function sub(texto: string, nome: string) {
  return texto.replace(/\{nome\}/g, nome);
}

// ── Avatares ─────────────────────────────────────────────────────────────────
function AvatarPersonagem({ tipo }: { tipo: string }) {
  const cfg: Record<string, { bg: string; skin: string; hair: string }> = {
    jesus:  { bg: "#d4e8d0", skin: "#f2b97a", hair: "#5c3010" },
    joao:   { bg: "#c8ddf0", skin: "#f2b97a", hair: "#2c3a40" },
    moises: { bg: "#f0dcc0", skin: "#f2b97a", hair: "#3a2010" },
    davi:   { bg: "#dcc8e8", skin: "#f2b97a", hair: "#3a1060" },
  };
  const c = cfg[tipo] ?? cfg.jesus;
  return (
    <svg width="88" height="88" viewBox="0 0 100 100">
      {/* fundo círculo com borda dourada */}
      <circle cx="50" cy="50" r="49" fill={DS.douradoSombra} />
      <circle cx="50" cy="50" r="46" fill={c.bg} />
      {/* sombra corpo */}
      <ellipse cx="50" cy="86" rx="24" ry="12" fill={c.hair} opacity="0.5" />
      {/* roupa */}
      <ellipse cx="50" cy="80" rx="22" ry="18" fill="#e8dcc0" />
      <ellipse cx="50" cy="80" rx="14" ry="16" fill="#d4c89a" />
      {/* pescoço */}
      <rect x="44" y="62" width="12" height="10" rx="3" fill={c.skin} />
      {/* cabeça */}
      <circle cx="50" cy="48" r="20" fill={c.skin} />
      {/* cabelo */}
      <ellipse cx="50" cy="32" rx="21" ry="10" fill={c.hair} />
      <ellipse cx="32" cy="48" rx="6" ry="12" fill={c.hair} />
      <ellipse cx="68" cy="48" rx="6" ry="12" fill={c.hair} />
      {/* olhos brancos */}
      <ellipse cx="43" cy="47" rx="4" ry="4.5" fill="white" />
      <ellipse cx="57" cy="47" rx="4" ry="4.5" fill="white" />
      {/* íris */}
      <circle cx="43.5" cy="47.5" r="2.5" fill="#3a200a" />
      <circle cx="57.5" cy="47.5" r="2.5" fill="#3a200a" />
      {/* brilho olho */}
      <circle cx="44.5" cy="46.5" r="1" fill="white" />
      <circle cx="58.5" cy="46.5" r="1" fill="white" />
      {/* sobrancelhas */}
      <path d="M39 42 Q43 40 47 42" stroke={c.hair} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M53 42 Q57 40 61 42" stroke={c.hair} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* nariz */}
      <path d="M49 50 Q50 54 51 50" stroke="#c07848" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* sorriso */}
      <path d="M44 57 Q50 62 56 57" stroke="#a06030" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* barba (para personagens adultos) */}
      <ellipse cx="50" cy="64" rx="10" ry="5" fill={c.hair} opacity="0.35" />
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

// ── Helpers de questão ───────────────────────────────────────────────────────
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
    fato_fake: "Fato ou Fake?",
    verdade_mito: "Verdade ou Mito?",
    multipla_escolha: "Escolha a certa",
    completar_versiculo: "Complete o versículo",
    quem_disse: "Quem disse isso?",
    onde_aconteceu: "Onde aconteceu?",
    qual_numero: "Qual é o número?",
    qual_livro: "Em qual livro?",
    personagem_misterio: "Quem sou eu?",
    ordenar_eventos: "Ordene os eventos",
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

// ── Tela HOME ────────────────────────────────────────────────────────────────
function TelaHome({ onEscolher }: { onEscolher: (t: Trilha) => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <style>{`
        @keyframes pulse-glow {
          0%,100% { text-shadow: 0 0 20px rgba(212,160,23,0.4), 0 2px 4px rgba(0,0,0,0.6); }
          50%      { text-shadow: 0 0 40px rgba(212,160,23,0.8), 0 2px 4px rgba(0,0,0,0.6); }
        }
        .titulo-hero { animation: pulse-glow 3s ease-in-out infinite; }
        .btn-medieval:active { transform: translateY(3px) !important; box-shadow: none !important; }
      `}</style>

      <main style={{ width: "100%", maxWidth: "450px", padding: "28px 20px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "80px", height: "80px", margin: "0 auto 16px",
            borderRadius: "50%",
            background: `linear-gradient(145deg, ${DS.douradoClaro}, ${DS.douradoSombra})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 0 ${DS.vermelhoEsc}, 0 8px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,220,100,0.4)`,
            fontSize: "36px",
          }}>✝</div>

          <h1 className="titulo-hero" style={{
            fontFamily: "var(--font-cinzel), serif",
            fontSize: "32px", fontWeight: "900",
            color: DS.douradoClaro, margin: "0 0 6px",
            letterSpacing: "3px",
          }}>GOSPEL QUEST</h1>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", margin: "10px 0" }}>
            <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, transparent, ${DS.dourado})` }} />
            <span style={{ color: DS.dourado, fontSize: "12px" }}>✦</span>
            <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${DS.dourado}, transparent)` }} />
          </div>

          <p style={{ color: DS.off, fontSize: "14px", fontStyle: "italic", letterSpacing: "1px" }}>
            Uma jornada épica pela Palavra de Deus
          </p>
        </div>

        {/* Card A Bíblia */}
        <div className="card-pergaminho" style={{ marginBottom: "16px", padding: "20px 20px 24px" }}>
          <div style={{ marginBottom: "14px" }}>
            <h2 style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: "16px", color: DS.titulo, margin: "0 0 6px",
              letterSpacing: "1px",
            }}>📖 A Bíblia</h2>
            <div style={{ height: "1px", background: `linear-gradient(90deg, ${DS.dourado}, transparent)`, marginBottom: "10px" }} />
            <p style={{ fontSize: "13px", color: DS.corpo, margin: 0, lineHeight: 1.6 }}>
              Explore o Velho e o Novo Testamento com quizzes sobre todos os livros sagrados.
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => onEscolher("VT")}
              className="btn-medieval btn-dourado"
              style={{ flex: 1, padding: "14px 8px", fontSize: "12px" }}
            >
              Velho Test.
            </button>
            <button
              onClick={() => onEscolher("NT")}
              className="btn-medieval btn-escuro"
              style={{ flex: 1, padding: "14px 8px", fontSize: "12px" }}
            >
              Novo Test.
            </button>
          </div>
        </div>

        {/* Card Jornada de Jesus */}
        <button
          onClick={() => onEscolher("JESUS")}
          className="btn-medieval btn-vermelho"
          style={{
            width: "100%", padding: "20px",
            textAlign: "left", display: "block",
            borderRadius: "6px",
          }}
        >
          <div style={{ fontSize: "18px", marginBottom: "6px" }}>✝️ Jornada de Jesus</div>
          <div style={{ height: "1px", background: "rgba(255,200,200,0.3)", marginBottom: "8px" }} />
          <p style={{ margin: 0, fontSize: "13px", color: "#f5d0d0", lineHeight: 1.6, fontFamily: "var(--font-garamond), serif", fontWeight: "400", textTransform: "none", letterSpacing: "0" }}>
            Caminhe ao lado de Jesus — do nascimento à ressurreição. Uma narrativa única.
          </p>
        </button>
      </main>
    </div>
  );
}

// ── Tela MAPA ────────────────────────────────────────────────────────────────
function TelaMapa({
  capitulos, trilha, nivelDesbloqueado, onIniciar, onVoltar,
}: {
  capitulos: Capitulo[]; trilha: Trilha; nivelDesbloqueado: number;
  onIniciar: (i: number) => void; onVoltar: () => void;
}) {
  const cfgs: Record<Trilha, { nome: string; cor: string; sombra: string }> = {
    VT:    { nome: "Velho Testamento", cor: DS.douradoClaro, sombra: DS.douradoSombra },
    NT:    { nome: "Novo Testamento",  cor: "#d0c0f8",       sombra: "#6040a0" },
    JESUS: { nome: "Jornada de Jesus", cor: "#f08080",       sombra: DS.vermelhoEsc },
  };
  const cfg = cfgs[trilha];

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", overflowY: "auto" }}>
      <style>{`
        @keyframes float {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50%      { transform: translateX(-50%) translateY(-10px); }
        }
      `}</style>
      <main style={{ width: "100%", maxWidth: "450px", position: "relative", paddingBottom: "100px" }}>

        {/* Header banner */}
        <div className="banner-faixa" style={{
          position: "sticky", top: 0, zIndex: 100,
          padding: "14px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={onVoltar} style={{
            background: "none", border: "none", cursor: "pointer",
            color: DS.dourado, fontSize: "22px", lineHeight: 1, padding: "4px",
          }}>←</button>

          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "var(--font-cinzel), serif", fontSize: "13px",
              fontWeight: "700", color: cfg.cor, letterSpacing: "2px",
            }}>{cfg.nome}</div>
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            {[{ i: "🔥", v: "7", c: "#f08060" }, { i: "❤️", v: "5", c: "#f06060" }].map(x => (
              <div key={x.i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "16px", lineHeight: 1 }}>{x.i}</div>
                <div style={{ fontFamily: "var(--font-cinzel), serif", fontSize: "11px", color: x.c, fontWeight: "700" }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mapa */}
        <div style={{ padding: "40px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
          <svg style={{ position: "absolute", top: 60, width: "100%", height: `${capitulos.length * 165}px`, zIndex: 0, pointerEvents: "none" }}>
            <path
              d="M 225 0 C 350 130, 100 260, 225 390 C 350 520, 100 650, 225 780 C 350 910, 100 1040, 225 1170 C 350 1300, 100 1430, 225 1560"
              fill="none"
              stroke="rgba(120,80,20,0.25)"
              strokeWidth="20"
              strokeLinecap="round"
            />
            <path
              d="M 225 0 C 350 130, 100 260, 225 390 C 350 520, 100 650, 225 780 C 350 910, 100 1040, 225 1170 C 350 1300, 100 1430, 225 1560"
              fill="none"
              stroke="rgba(180,120,30,0.15)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="4 24"
            />
          </svg>

          {capitulos.map((cap, i) => {
            const lateral = i % 4 === 0 ? "0" : i % 4 === 1 ? "72px" : i % 4 === 2 ? "0" : "-72px";
            const ativo = i === nivelDesbloqueado;
            const bloqueado = i > nivelDesbloqueado;
            const concluido = i < nivelDesbloqueado;

            return (
              <div key={cap.id} style={{ marginBottom: "82px", position: "relative", transform: `translateX(${lateral})`, zIndex: 1 }}>

                {ativo && (
                  <div style={{ position: "absolute", top: "-78px", left: "50%", animation: "float 2s ease-in-out infinite", textAlign: "center" }}>
                    <div style={{
                      background: `linear-gradient(180deg, ${DS.douradoClaro}, ${DS.douradoSombra})`,
                      padding: "4px 14px", borderRadius: "20px",
                      fontSize: "10px", fontWeight: "700",
                      marginBottom: "6px", color: "#fff8e0",
                      fontFamily: "var(--font-cinzel), serif",
                      letterSpacing: "2px",
                      boxShadow: `0 3px 0 ${DS.vermelhoEsc}, 0 4px 10px rgba(0,0,0,0.4)`,
                      border: `1px solid ${DS.douradoClaro}`,
                    }}>INICIAR</div>
                    <div style={{ display: "flex", justifyContent: "center" }}><MascoteFlutuante /></div>
                  </div>
                )}

                {/* Nome do capítulo */}
                <div style={{
                  position: "absolute", bottom: "-26px", left: "50%",
                  transform: "translateX(-50%)", whiteSpace: "nowrap",
                  fontSize: "11px", fontWeight: "600",
                  fontFamily: "var(--font-cinzel), serif",
                  color: ativo ? DS.douradoClaro : DS.off,
                  textShadow: ativo ? `0 0 12px rgba(200,150,20,0.6)` : "none",
                }}>
                  {cap.titulo}
                </div>

                {/* Botão capítulo */}
                <button
                  onClick={() => !bloqueado && onIniciar(i)}
                  style={{
                    width: "90px", height: "90px", borderRadius: "50%",
                    cursor: bloqueado ? "default" : "pointer",
                    border: `3px solid ${concluido ? "#2a6a2a" : ativo ? DS.douradoClaro : DS.borda}`,
                    background: concluido
                      ? "linear-gradient(145deg, #3a8a3a, #1a4a1a)"
                      : ativo
                      ? `linear-gradient(145deg, ${DS.douradoClaro}, ${DS.douradoSombra})`
                      : `linear-gradient(145deg, ${DS.bgCard}, #d8c898)`,
                    boxShadow: concluido
                      ? "0 6px 0 #0a2a0a, 0 8px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(100,200,100,0.3)"
                      : ativo
                      ? `0 6px 0 ${DS.douradoSombra}, 0 8px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,220,100,0.5)`
                      : "0 6px 0 #8a7040, 0 8px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,240,200,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "transform 0.1s",
                  }}
                  onMouseDown={e => { if (!bloqueado) (e.currentTarget as HTMLElement).style.transform = "translateY(3px)"; }}
                  onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
                >
                  {bloqueado
                    ? <span style={{ fontSize: "26px", opacity: 0.3 }}>🔒</span>
                    : concluido
                    ? <span style={{ fontSize: "28px" }}>⭐</span>
                    : <span style={{ fontSize: "36px" }}>{cap.icone}</span>
                  }
                </button>
              </div>
            );
          })}
        </div>

        {/* Nav */}
        <nav className="banner-faixa" style={{
          position: "fixed", bottom: 0, width: "100%", maxWidth: "450px",
          height: "72px", display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 100,
        }}>
          {[{ i: "🏠", l: "Início", a: true }, { i: "🏆", l: "Glória", a: false }, { i: "👤", l: "Perfil", a: false }, { i: "⚙️", l: "Config", a: false }].map(x => (
            <div key={x.l} style={{ textAlign: "center", opacity: x.a ? 1 : 0.3 }}>
              <div style={{ fontSize: "20px" }}>{x.i}</div>
              <div style={{ fontSize: "10px", fontFamily: "var(--font-cinzel), serif", color: DS.dourado, letterSpacing: "0.5px" }}>{x.l}</div>
            </div>
          ))}
        </nav>
      </main>
    </div>
  );
}

// ── Tela QUIZ ────────────────────────────────────────────────────────────────
function TelaQuiz({
  capitulo, perguntaIdx, nomeJogador,
  selecionado, respondido, status,
  onSelecionar, onResponder, onContinuar, onSair,
}: {
  capitulo: Capitulo; perguntaIdx: number; nomeJogador: string;
  selecionado: number | null; respondido: boolean; status: "acerto" | "erro" | null;
  onSelecionar: (i: number) => void; onResponder: () => void;
  onContinuar: () => void; onSair: () => void;
}) {
  const q = capitulo.perguntas[perguntaIdx];
  const opcoes = getOpcoes(q);
  const correta = getCorreta(q);
  const progresso = ((perguntaIdx + 1) / capitulo.perguntas.length) * 100;

  function bgOpcao(i: number) {
    if (!respondido) return selecionado === i
      ? `linear-gradient(145deg, #fff8d0, #f0e090)`
      : `linear-gradient(145deg, ${DS.bgCard}, #e8d8a8)`;
    if (i === correta) return `linear-gradient(145deg, #d0f0d0, #a0d8a0)`;
    if (i === selecionado) return `linear-gradient(145deg, #f8d0d0, #e8a0a0)`;
    return `linear-gradient(145deg, ${DS.bgCard}, #e8d8a8)`;
  }
  function bordaOpcao(i: number) {
    if (!respondido) return selecionado === i ? DS.douradoClaro : DS.borda;
    if (i === correta) return DS.verde;
    if (i === selecionado) return DS.vermelho;
    return DS.borda;
  }
  const letras = ["A", "B", "C", "D"];

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center" }}>
      <main style={{ width: "100%", maxWidth: "450px", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <header className="banner-faixa" style={{ padding: "44px 18px 14px", display: "flex", alignItems: "center", gap: "14px" }}>
          <span onClick={onSair} style={{ cursor: "pointer", fontSize: "18px", color: DS.off }}>✕</span>

          <div className="barra-progress-track" style={{ flex: 1 }}>
            <div className="barra-progress-fill" style={{ width: `${progresso}%` }} />
          </div>

          <span style={{ color: DS.douradoClaro, fontFamily: "var(--font-cinzel), serif", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>
            ✦ {perguntaIdx + 1}/{capitulo.perguntas.length}
          </span>
        </header>

        {/* Conteúdo */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>

          {/* Tag capítulo */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: `linear-gradient(180deg, ${DS.douradoClaro}, ${DS.douradoSombra})`,
            borderRadius: "4px", padding: "3px 12px",
            fontSize: "10px", fontWeight: "700", color: "#fff8e0",
            fontFamily: "var(--font-cinzel), serif", letterSpacing: "2px",
            marginBottom: "10px",
            boxShadow: `0 2px 0 ${DS.vermelhoEsc}, 0 3px 6px rgba(0,0,0,0.3)`,
          }}>
            {capitulo.icone} {capitulo.titulo.toUpperCase()}
          </div>

          {/* Título da pergunta */}
          <h1 style={{
            fontFamily: "var(--font-cinzel), serif", fontSize: "19px",
            fontWeight: "700", color: DS.titulo, margin: "0 0 16px",
            lineHeight: 1.3,
            textShadow: "0 1px 2px rgba(255,255,255,0.5)",
          }}>{getTitulo(q)}</h1>

          {/* Personagem + balão */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "20px" }}>
            <div style={{
              flexShrink: 0,
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
            }}>
              <AvatarPersonagem tipo={q.personagem} />
            </div>

            <div className="card-pergaminho" style={{ flex: 1, padding: "12px 14px" }}>
              <p style={{
                margin: 0, fontSize: "14px", color: DS.corpo,
                lineHeight: 1.7, whiteSpace: "pre-line", fontStyle: "italic",
              }}>
                {getEnunciado(q, "Viajante")}
              </p>
            </div>
          </div>

          {/* Opções */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {opcoes.map((opcao, i) => (
              <button
                key={i}
                onClick={() => !respondido && onSelecionar(i)}
                style={{
                  padding: "14px 16px",
                  borderRadius: "6px",
                  border: `2px solid ${bordaOpcao(i)}`,
                  background: bgOpcao(i),
                  cursor: respondido ? "default" : "pointer",
                  display: "flex", alignItems: "center", gap: "12px",
                  boxShadow: respondido
                    ? "none"
                    : selecionado === i
                    ? `0 3px 0 ${DS.douradoSombra}, inset 0 1px 0 rgba(255,220,100,0.4)`
                    : `0 3px 0 #8a7040, inset 0 1px 0 rgba(255,240,200,0.3)`,
                  transition: "all 0.15s",
                  textAlign: "left",
                }}
              >
                <span style={{
                  width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-cinzel), serif", fontWeight: "700", fontSize: "12px",
                  background: respondido && i === correta
                    ? `linear-gradient(145deg, #2a8a2a, #1a4a1a)`
                    : respondido && i === selecionado && i !== correta
                    ? `linear-gradient(145deg, #9a2020, #5a0e0e)`
                    : selecionado === i
                    ? `linear-gradient(145deg, ${DS.douradoClaro}, ${DS.douradoSombra})`
                    : `linear-gradient(145deg, #c8b070, #9a8040)`,
                  color: selecionado === i || (respondido && (i === correta || i === selecionado)) ? "white" : DS.off,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}>
                  {letras[i]}
                </span>
                <span style={{
                  fontSize: "14px", fontWeight: "600", color: DS.corpo,
                  fontFamily: "var(--font-garamond), serif",
                }}>
                  {opcao}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer style={{
          padding: "14px 18px 28px",
          borderTop: `2px solid ${DS.borda}`,
          background: status === "acerto"
            ? "linear-gradient(180deg, #d8f0d0, #c0e0b0)"
            : status === "erro"
            ? "linear-gradient(180deg, #f8d8d8, #f0c0c0)"
            : `linear-gradient(180deg, ${DS.bgCard}, #e8d8a8)`,
          transition: "background 0.3s",
        }}>
          {respondido && (
            <div style={{ display: "flex", gap: "12px", marginBottom: "12px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "22px", flexShrink: 0 }}>{status === "acerto" ? "✅" : "❌"}</span>
              <div>
                <p style={{
                  margin: "0 0 3px", fontWeight: "700", fontSize: "15px",
                  fontFamily: "var(--font-cinzel), serif",
                  color: status === "acerto" ? DS.verde : DS.vermelho,
                }}>
                  {status === "acerto" ? "Excelente!" : "Incorreto!"}
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: DS.corpo, lineHeight: 1.5 }}>
                  {q.explicacao}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={respondido ? onContinuar : onResponder}
            disabled={selecionado === null && !respondido}
            className="btn-medieval"
            style={{
              width: "100%", padding: "16px",
              fontSize: "13px", letterSpacing: "2px",
              background: selecionado === null && !respondido
                ? `linear-gradient(180deg, #b0a080, #908060)`
                : status === "erro"
                ? `linear-gradient(180deg, #9a2020, ${DS.vermelho}, #5a0e0e)`
                : `linear-gradient(180deg, ${DS.douradoClaro}, ${DS.dourado}, ${DS.douradoSombra})`,
              color: selecionado === null && !respondido ? "#c8b880" : "#fff8e0",
              boxShadow: selecionado === null && !respondido ? "none"
                : status === "erro"
                ? `0 5px 0 ${DS.vermelhoEsc}, 0 6px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,160,160,0.3)`
                : `0 5px 0 ${DS.douradoSombra}, 0 6px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,220,100,0.4)`,
              borderRadius: "6px",
              border: `1px solid ${selecionado === null && !respondido ? "#706040" : status === "erro" ? DS.vermelhoEsc : DS.douradoSombra}`,
              textShadow: "0 1px 2px rgba(0,0,0,0.5)",
              cursor: selecionado === null && !respondido ? "default" : "pointer",
            }}
          >
            {respondido ? "CONTINUAR →" : "VERIFICAR"}
          </button>
        </footer>
      </main>
    </div>
  );
}

// ── Tela RESULTADO ────────────────────────────────────────────────────────────
function TelaResultado({ acertos, total, onContinuar, onRefazer }: {
  acertos: number; total: number; onContinuar: () => void; onRefazer: () => void;
}) {
  const pct = Math.round((acertos / total) * 100);
  const [trofeu, msg] = pct === 100 ? ["🏆", "Perfeito!"] : pct >= 70 ? ["⭐", "Muito bem!"] : pct >= 50 ? ["📖", "Bom esforço!"] : ["🙏", "Continue!"];

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <main style={{ width: "100%", maxWidth: "450px", padding: "28px 24px", textAlign: "center" }}>

        <div className="card-pergaminho" style={{ padding: "32px 24px", marginBottom: "20px" }}>
          <div style={{ fontSize: "56px", marginBottom: "12px" }}>{trofeu}</div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", marginBottom: "12px" }}>
            <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, transparent, ${DS.dourado})` }} />
            <span style={{ fontFamily: "var(--font-cinzel), serif", fontSize: "22px", fontWeight: "900", color: DS.titulo }}>{msg}</span>
            <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${DS.dourado}, transparent)` }} />
          </div>

          <p style={{ color: DS.corpo, fontSize: "15px", margin: "0 0 20px" }}>
            Você acertou <strong style={{ color: DS.titulo }}>{acertos}</strong> de <strong style={{ color: DS.titulo }}>{total}</strong> perguntas
          </p>

          {/* Barra resultado */}
          <div className="barra-progress-track" style={{ marginBottom: "4px" }}>
            <div className="barra-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ fontFamily: "var(--font-cinzel), serif", fontSize: "13px", color: DS.dourado, fontWeight: "700" }}>{pct}%</div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={onRefazer} className="btn-medieval btn-escuro" style={{ flex: 1, padding: "16px", fontSize: "12px" }}>
            Refazer
          </button>
          <button onClick={onContinuar} className="btn-medieval btn-dourado" style={{ flex: 2, padding: "16px", fontSize: "12px" }}>
            Próximo ✦
          </button>
        </div>
      </main>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function GospelQuest() {
  const [tela, setTela] = useState<Tela>("home");
  const [trilha, setTrilha] = useState<Trilha>("VT");
  const [nivelAtivo, setNivelAtivo] = useState(0);
  const [desbloqueados, setDesbloqueados] = useState<Record<Trilha, number>>({ VT: 0, NT: 0, JESUS: 0 });
  const [perguntaIdx, setPerguntaIdx] = useState(0);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [respondido, setRespondido] = useState(false);
  const [status, setStatus] = useState<"acerto" | "erro" | null>(null);
  const [acertos, setAcertos] = useState(0);

  const caps: Record<Trilha, Capitulo[]> = { VT: velhoTestamento, NT: novoTestamento, JESUS: jornadaJesus };
  const capitulo = caps[trilha][nivelAtivo];

  function iniciarNivel(idx: number) {
    setNivelAtivo(idx); setPerguntaIdx(0);
    setSelecionado(null); setRespondido(false);
    setStatus(null); setAcertos(0); setTela("jogo");
  }

  function responder() {
    if (selecionado === null) return;
    const acertou = selecionado === getCorreta(capitulo.perguntas[perguntaIdx]);
    setRespondido(true); setStatus(acertou ? "acerto" : "erro");
    if (acertou) setAcertos(a => a + 1);
  }

  function continuar() {
    if (perguntaIdx < capitulo.perguntas.length - 1) {
      setPerguntaIdx(p => p + 1);
      setSelecionado(null); setRespondido(false); setStatus(null);
    } else {
      setTela("resultado");
    }
  }

  function avancar() {
    const prox = nivelAtivo + 1;
    setDesbloqueados(p => ({ ...p, [trilha]: Math.max(p[trilha], prox) }));
    if (prox < caps[trilha].length) iniciarNivel(prox);
    else setTela("mapa");
  }

  if (tela === "home")      return <TelaHome onEscolher={t => { setTrilha(t); setTela("mapa"); }} />;
  if (tela === "mapa")      return <TelaMapa capitulos={caps[trilha]} trilha={trilha} nivelDesbloqueado={desbloqueados[trilha]} onIniciar={iniciarNivel} onVoltar={() => setTela("home")} />;
  if (tela === "jogo")      return <TelaQuiz capitulo={capitulo} perguntaIdx={perguntaIdx} nomeJogador="Viajante" selecionado={selecionado} respondido={respondido} status={status} onSelecionar={setSelecionado} onResponder={responder} onContinuar={continuar} onSair={() => setTela("mapa")} />;
  return <TelaResultado acertos={acertos} total={capitulo.perguntas.length} onContinuar={avancar} onRefazer={() => iniciarNivel(nivelAtivo)} />;
}
