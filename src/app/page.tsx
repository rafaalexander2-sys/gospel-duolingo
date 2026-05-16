"use client";
import { useState } from "react";
import type { Questao, Capitulo } from "@/types";
import { velhoTestamento } from "@/data/velho-testamento";
import { novoTestamento } from "@/data/novo-testamento";
import { jornadaJesus } from "@/data/jornada-jesus";

const DS = {
  bgPrincipal:   "#f0ead6",
  bgCard:        "#faf6ec",
  bgCardBorder:  "#e0d5b8",
  textTitulo:    "#3d2008",
  textCorpo:     "#5c3a1e",
  dourado:       "#c9a227",
  douradoSombra: "#9a7a10",
  vermelho:      "#8b1a1a",
  verdeAcerto:   "#2d6a2d",
  verdeSombra:   "#1a4a1a",
  fundoAcerto:   "#d4edda",
  fundoErro:     "#f8d7da",
  cinzaOff:      "#b8a98a",
};

type Tela = "home" | "mapa" | "jogo" | "resultado";
type Trilha = "VT" | "NT" | "JESUS";

function substituirNome(texto: string, nome: string) {
  return texto.replace(/\{nome\}/g, nome);
}

function AvatarPersonagem({ tipo }: { tipo: string }) {
  const configs: Record<string, { bg: string; rosto: string; detalhe: string }> = {
    jesus:  { bg: "#c8e6c9", rosto: "#f9c784", detalhe: "#6d4c41" },
    joao:   { bg: "#bbdefb", rosto: "#f9c784", detalhe: "#37474f" },
    moises: { bg: "#ffe0b2", rosto: "#f9c784", detalhe: "#4e342e" },
    davi:   { bg: "#e1bee7", rosto: "#f9c784", detalhe: "#4a148c" },
  };
  const c = configs[tipo] ?? configs.jesus;
  return (
    <svg width="90" height="90" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill={c.bg} />
      <ellipse cx="50" cy="82" rx="22" ry="16" fill={c.detalhe} opacity="0.7" />
      <circle cx="50" cy="44" r="22" fill={c.rosto} />
      <ellipse cx="50" cy="26" rx="22" ry="10" fill={c.detalhe} />
      <circle cx="43" cy="43" r="3" fill="#fff" />
      <circle cx="57" cy="43" r="3" fill="#fff" />
      <circle cx="44" cy="43" r="1.5" fill="#333" />
      <circle cx="58" cy="43" r="1.5" fill="#333" />
      <path d="M 43 52 Q 50 58 57 52" stroke="#a0522d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function MascoteFlutuante() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="30" r="28" fill={DS.dourado} />
      <circle cx="30" cy="26" r="14" fill="#f9c784" />
      <circle cx="24" cy="24" r="2.5" fill="#fff" />
      <circle cx="36" cy="24" r="2.5" fill="#fff" />
      <circle cx="25" cy="24" r="1.2" fill="#333" />
      <circle cx="37" cy="24" r="1.2" fill="#333" />
      <path d="M 23 32 Q 30 38 37 32" stroke="#a0522d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <ellipse cx="30" cy="48" rx="14" ry="9" fill={DS.douradoSombra} />
    </svg>
  );
}

function getEnunciado(q: Questao, nome: string): string {
  const sub = (t: string) => substituirNome(t, nome);
  switch (q.tipo) {
    case "fato_fake":      return sub(q.afirmacao);
    case "multipla_escolha": return sub(q.enunciado);
    case "completar_versiculo": return sub(q.versiculo) + `\n— ${q.referencia}`;
    case "quem_disse":     return `"${sub(q.frase)}"`;
    case "onde_aconteceu": return sub(q.evento);
    case "qual_numero":    return sub(q.enunciado);
    case "qual_livro":     return sub(q.enunciado);
    case "personagem_misterio":
      return sub(q.pistas.slice(0, 2).join("\n\n"));
    case "verdade_mito":   return sub(q.mito);
    case "ordenar_eventos": return sub(q.enunciado);
    default: return "";
  }
}

function getTitulo(q: Questao): string {
  switch (q.tipo) {
    case "fato_fake":      return "Isso é Fato ou Fake?";
    case "multipla_escolca":
    case "multipla_escolha": return "Escolha a resposta certa";
    case "completar_versiculo": return "Complete o versículo";
    case "quem_disse":     return "Quem disse isso?";
    case "onde_aconteceu": return "Onde aconteceu?";
    case "qual_numero":    return "Qual é o número certo?";
    case "qual_livro":     return "Em qual livro?";
    case "personagem_misterio": return "Quem sou eu?";
    case "verdade_mito":   return "Verdade ou Mito?";
    case "ordenar_eventos": return "Ordene os eventos";
    default: return "Responda a pergunta";
  }
}

function getOpcoes(q: Questao): string[] {
  switch (q.tipo) {
    case "fato_fake":      return ["✦  Sim, é Fato!", "✗  Não, é Fake!"];
    case "verdade_mito":   return ["✦  É Verdade!", "✗  É Mito!"];
    case "multipla_escolha": return q.opcoes;
    case "completar_versiculo": return q.opcoes;
    case "quem_disse":     return q.opcoes;
    case "onde_aconteceu": return q.opcoes;
    case "qual_numero":    return q.opcoes;
    case "qual_livro":     return q.opcoes;
    case "personagem_misterio": return q.opcoes;
    case "ordenar_eventos": return q.eventos;
    default: return [];
  }
}

function getRespostaCorreta(q: Questao): number {
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
    case "ordenar_eventos": return q.ordemCorreta[0]; // simplificado
    default: return 0;
  }
}

// ─── TELA HOME ───────────────────────────────────────────────────────────────
function TelaHome({ onEscolher }: { onEscolher: (t: Trilha) => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      backgroundColor: DS.bgPrincipal,
      display: "flex", justifyContent: "center", alignItems: "center",
      fontFamily: "var(--font-garamond), Georgia, serif",
    }}>
      <main style={{ width: "100%", maxWidth: "450px", padding: "32px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>✝️</div>
          <h1 style={{
            fontFamily: "var(--font-cinzel), serif",
            fontSize: "28px", fontWeight: "900",
            color: DS.textTitulo, margin: 0,
            lineHeight: 1.2,
          }}>Gospel Quest</h1>
          <p style={{ color: DS.cinzaOff, fontSize: "15px", marginTop: "8px" }}>
            Uma jornada épica pela Palavra de Deus
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Bíblia */}
          <div style={{
            backgroundColor: DS.bgCard,
            border: `2px solid ${DS.bgCardBorder}`,
            borderRadius: "20px",
            padding: "20px",
          }}>
            <h2 style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: "16px", color: DS.textTitulo, margin: "0 0 8px",
            }}>📖 A Bíblia</h2>
            <p style={{ fontSize: "14px", color: DS.textCorpo, margin: "0 0 16px" }}>
              Explore o Velho e o Novo Testamento com quizzes sobre todos os livros sagrados.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => onEscolher("VT")} style={{
                flex: 1, padding: "14px 8px",
                borderRadius: "12px",
                backgroundColor: DS.dourado,
                color: "white", fontWeight: "700",
                border: "none", cursor: "pointer",
                fontFamily: "var(--font-cinzel), serif",
                fontSize: "12px", letterSpacing: "1px",
                boxShadow: `0 4px 0 ${DS.douradoSombra}`,
              }}>
                VELHO TEST.
              </button>
              <button onClick={() => onEscolher("NT")} style={{
                flex: 1, padding: "14px 8px",
                borderRadius: "12px",
                backgroundColor: DS.textTitulo,
                color: "white", fontWeight: "700",
                border: "none", cursor: "pointer",
                fontFamily: "var(--font-cinzel), serif",
                fontSize: "12px", letterSpacing: "1px",
                boxShadow: `0 4px 0 #1a0a00`,
              }}>
                NOVO TEST.
              </button>
            </div>
          </div>

          {/* Jornada de Jesus */}
          <button onClick={() => onEscolher("JESUS")} style={{
            backgroundColor: DS.vermelho,
            border: `2px solid #6b1212`,
            borderRadius: "20px",
            padding: "20px",
            cursor: "pointer",
            textAlign: "left",
            boxShadow: `0 5px 0 #4a0a0a`,
          }}>
            <h2 style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: "16px", color: "white", margin: "0 0 6px",
            }}>✝️ Jornada de Jesus</h2>
            <p style={{ fontSize: "14px", color: "#f5c6c6", margin: 0 }}>
              Caminhe ao lado de Jesus — do nascimento à ressurreição. Uma narrativa única.
            </p>
          </button>
        </div>
      </main>
    </div>
  );
}

// ─── TELA MAPA ────────────────────────────────────────────────────────────────
function TelaMapa({
  capitulos,
  trilha,
  nivelDesbloqueado,
  onIniciar,
  onVoltar,
}: {
  capitulos: Capitulo[];
  trilha: Trilha;
  nivelDesbloqueado: number;
  onIniciar: (idx: number) => void;
  onVoltar: () => void;
}) {
  const labels: Record<Trilha, { titulo: string; sub: string; cor: string }> = {
    VT: { titulo: "Velho Testamento", sub: "A Jornada Sagrada", cor: DS.dourado },
    NT: { titulo: "Novo Testamento",  sub: "A Boa Nova", cor: DS.textTitulo },
    JESUS: { titulo: "Jornada de Jesus", sub: "Caminhe ao lado dele", cor: DS.vermelho },
  };
  const cfg = labels[trilha];

  return (
    <div style={{
      position: "fixed", inset: 0,
      backgroundColor: DS.bgPrincipal,
      display: "flex", justifyContent: "center",
      overflowY: "auto",
      fontFamily: "var(--font-garamond), Georgia, serif",
    }}>
      <style>{`
        @keyframes float {
          0%   { transform: translateX(-50%) translateY(0px); }
          50%  { transform: translateX(-50%) translateY(-10px); }
          100% { transform: translateX(-50%) translateY(0px); }
        }
      `}</style>

      <main style={{ width: "100%", maxWidth: "450px", position: "relative" }}>
        {/* Header */}
        <div style={{
          position: "sticky", top: 0,
          backgroundColor: DS.bgCard,
          padding: "14px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: `2px solid ${DS.bgCardBorder}`,
          zIndex: 100,
        }}>
          <button onClick={onVoltar} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "20px", color: DS.cinzaOff, padding: "4px",
          }}>←</button>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: "13px", fontWeight: "700",
              color: cfg.cor,
            }}>{cfg.titulo}</div>
            <div style={{ fontSize: "11px", color: DS.cinzaOff }}>{cfg.sub}</div>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "16px" }}>🔥</div>
              <div style={{ fontFamily: "var(--font-cinzel), serif", fontSize: "11px", color: DS.vermelho }}>7</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "16px" }}>❤️</div>
              <div style={{ fontFamily: "var(--font-cinzel), serif", fontSize: "11px", color: DS.vermelho }}>5</div>
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div style={{
          padding: "40px 20px 150px",
          display: "flex", flexDirection: "column", alignItems: "center",
          position: "relative",
        }}>
          <svg style={{ position: "absolute", top: 60, width: "100%", height: `${capitulos.length * 160}px`, zIndex: 0 }}>
            <path
              d={`M 225 0 ${capitulos.map((_, i) => {
                const y = i * 160;
                const next = (i + 1) * 160;
                const x = i % 2 === 0 ? 155 : 295;
                return `C ${225 + (i%2===0?120:-120)} ${y+80}, ${x} ${next-80}, ${x} ${next}`;
              }).join(" ")}`}
              fill="transparent" stroke={DS.bgCardBorder} strokeWidth="18" strokeLinecap="round"
            />
          </svg>

          {capitulos.map((cap, i) => {
            const lateral = i % 2 === 0 ? "0" : i % 4 === 1 ? "70px" : "-70px";
            const ativo = i === nivelDesbloqueado;
            const bloqueado = i > nivelDesbloqueado;
            const concluido = i < nivelDesbloqueado;

            return (
              <div key={cap.id} style={{
                marginBottom: "80px",
                position: "relative",
                transform: `translateX(${lateral})`,
                zIndex: 1,
              }}>
                {ativo && (
                  <div style={{
                    position: "absolute", top: "-75px", left: "50%",
                    animation: "float 2s ease-in-out infinite",
                    textAlign: "center",
                  }}>
                    <div style={{
                      backgroundColor: DS.bgCard,
                      padding: "4px 12px", borderRadius: "20px",
                      border: `2px solid ${cfg.cor}`,
                      fontSize: "11px", fontWeight: "700",
                      marginBottom: "6px", color: cfg.cor,
                      fontFamily: "var(--font-cinzel), serif",
                      letterSpacing: "1px", whiteSpace: "nowrap",
                    }}>INICIAR</div>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <MascoteFlutuante />
                    </div>
                  </div>
                )}

                <div style={{
                  position: "absolute", bottom: "-28px", left: "50%",
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap", fontSize: "11px", fontWeight: "600",
                  fontFamily: "var(--font-cinzel), serif",
                  color: ativo ? DS.textTitulo : DS.cinzaOff,
                  textAlign: "center", width: "140px",
                }}>
                  {cap.titulo}
                </div>

                <button
                  onClick={() => !bloqueado && onIniciar(i)}
                  style={{
                    width: "88px", height: "88px", borderRadius: "50%",
                    backgroundColor: concluido ? "#e8f5e9" : ativo ? cfg.cor : DS.bgCard,
                    border: `3px solid ${concluido ? DS.verdeAcerto : ativo ? DS.douradoSombra : DS.bgCardBorder}`,
                    boxShadow: `0 7px 0 ${concluido ? DS.verdeSombra : ativo ? DS.douradoSombra : DS.bgCardBorder}`,
                    cursor: bloqueado ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {bloqueado
                    ? <span style={{ fontSize: "28px", opacity: 0.35 }}>🔒</span>
                    : concluido
                    ? <span style={{ fontSize: "32px" }}>✅</span>
                    : <span style={{ fontSize: "36px" }}>{cap.icone}</span>
                  }
                </button>
              </div>
            );
          })}
        </div>

        {/* Nav */}
        <nav style={{
          position: "fixed", bottom: 0,
          width: "100%", maxWidth: "450px", height: "76px",
          backgroundColor: DS.bgCard,
          borderTop: `2px solid ${DS.bgCardBorder}`,
          display: "flex", justifyContent: "space-around", alignItems: "center",
          zIndex: 100,
        }}>
          {[
            { icon: "🏠", label: "Início" },
            { icon: "🏆", label: "Conquistas" },
            { icon: "👤", label: "Perfil" },
            { icon: "⚙️", label: "Config" },
          ].map((item, idx) => (
            <div key={item.label} style={{ textAlign: "center", opacity: idx === 0 ? 1 : 0.35 }}>
              <div style={{ fontSize: "22px" }}>{item.icon}</div>
              <div style={{ fontSize: "10px", fontFamily: "var(--font-cinzel), serif", color: DS.textCorpo }}>
                {item.label}
              </div>
            </div>
          ))}
        </nav>
      </main>
    </div>
  );
}

// ─── TELA QUIZ ────────────────────────────────────────────────────────────────
function TelaQuiz({
  capitulo,
  perguntaIdx,
  nomeJogador,
  onResponder,
  onContinuar,
  onSair,
  selecionado,
  respondido,
  status,
  onSelecionar,
}: {
  capitulo: Capitulo;
  perguntaIdx: number;
  nomeJogador: string;
  onResponder: () => void;
  onContinuar: () => void;
  onSair: () => void;
  selecionado: number | null;
  respondido: boolean;
  status: "acerto" | "erro" | null;
  onSelecionar: (i: number) => void;
}) {
  const pergunta = capitulo.perguntas[perguntaIdx];
  const opcoes = getOpcoes(pergunta);
  const titulo = getTitulo(pergunta);
  const enunciado = getEnunciado(pergunta, nomeJogador);
  const correta = getRespostaCorreta(pergunta);

  function corBotao(i: number) {
    if (!respondido) return selecionado === i ? "#fef3c7" : DS.bgCard;
    if (i === correta) return DS.fundoAcerto;
    if (i === selecionado && selecionado !== correta) return DS.fundoErro;
    return DS.bgCard;
  }
  function bordaBotao(i: number) {
    if (!respondido) return selecionado === i ? DS.dourado : DS.bgCardBorder;
    if (i === correta) return DS.verdeAcerto;
    if (i === selecionado && selecionado !== correta) return DS.vermelho;
    return DS.bgCardBorder;
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      backgroundColor: DS.bgPrincipal,
      display: "flex", justifyContent: "center",
      fontFamily: "var(--font-garamond), Georgia, serif",
    }}>
      <main style={{ width: "100%", maxWidth: "450px", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <header style={{
          padding: "44px 20px 12px",
          display: "flex", alignItems: "center", gap: "15px",
          backgroundColor: DS.bgCard,
          borderBottom: `2px solid ${DS.bgCardBorder}`,
        }}>
          <span onClick={onSair} style={{ cursor: "pointer", fontSize: "20px", color: DS.cinzaOff }}>✕</span>
          <div style={{
            flex: 1, height: "12px",
            backgroundColor: DS.bgCardBorder, borderRadius: "10px", overflow: "hidden",
          }}>
            <div style={{
              width: `${((perguntaIdx + 1) / capitulo.perguntas.length) * 100}%`,
              height: "100%", backgroundColor: DS.dourado,
              borderRadius: "10px", transition: "width 0.4s ease",
            }} />
          </div>
          <span style={{
            color: DS.dourado, fontWeight: "700",
            fontFamily: "var(--font-cinzel), serif", fontSize: "12px",
          }}>✦ {perguntaIdx + 1}/{capitulo.perguntas.length}</span>
        </header>

        {/* Conteúdo */}
        <div style={{ flex: 1, padding: "20px 22px", overflowY: "auto" }}>
          <div style={{
            display: "inline-block",
            backgroundColor: DS.bgCardBorder,
            borderRadius: "20px", padding: "4px 12px",
            fontSize: "11px", fontWeight: "700",
            color: DS.textCorpo, marginBottom: "12px",
            fontFamily: "var(--font-cinzel), serif",
            letterSpacing: "1px",
          }}>
            {capitulo.titulo.toUpperCase()}
          </div>

          <h1 style={{
            fontSize: "20px", fontWeight: "700",
            color: DS.textTitulo, margin: "0 0 20px",
            fontFamily: "var(--font-cinzel), serif",
            lineHeight: 1.3,
          }}>
            {titulo}
          </h1>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "24px" }}>
            <AvatarPersonagem tipo={pergunta.personagem} />
            <div style={{
              border: `2px solid ${DS.bgCardBorder}`,
              borderRadius: "16px", padding: "14px 16px",
              flex: 1, backgroundColor: DS.bgCard, position: "relative",
            }}>
              <div style={{
                position: "absolute", left: "-10px", top: "22px",
                width: "16px", height: "16px",
                backgroundColor: DS.bgCard,
                borderLeft: `2px solid ${DS.bgCardBorder}`,
                borderBottom: `2px solid ${DS.bgCardBorder}`,
                transform: "rotate(45deg)",
              }} />
              <p style={{
                margin: 0, fontWeight: "500", fontSize: "15px",
                color: DS.textCorpo, lineHeight: 1.6,
                whiteSpace: "pre-line",
              }}>
                {enunciado}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {opcoes.map((opcao, i) => (
              <button
                key={i}
                onClick={() => !respondido && onSelecionar(i)}
                style={{
                  padding: "16px 18px",
                  borderRadius: "14px",
                  border: `2px solid ${bordaBotao(i)}`,
                  backgroundColor: corBotao(i),
                  fontWeight: "600", fontSize: "15px",
                  textAlign: "left", color: DS.textCorpo,
                  cursor: respondido ? "default" : "pointer",
                  fontFamily: "var(--font-garamond), serif",
                  display: "flex", alignItems: "center", gap: "12px",
                  boxShadow: `0 3px 0 ${bordaBotao(i)}`,
                  transition: "all 0.15s",
                }}
              >
                <span style={{
                  width: "30px", height: "30px", borderRadius: "50%",
                  backgroundColor: selecionado === i || (respondido && i === correta)
                    ? bordaBotao(i) : DS.bgCardBorder,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: selecionado === i || (respondido && i === correta) ? "white" : DS.cinzaOff,
                  fontSize: "13px", fontWeight: "700", flexShrink: 0,
                }}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opcao}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer style={{
          padding: "16px 22px 28px",
          borderTop: `2px solid ${DS.bgCardBorder}`,
          backgroundColor: status === "acerto" ? DS.fundoAcerto
            : status === "erro" ? DS.fundoErro : DS.bgCard,
          transition: "background-color 0.3s",
        }}>
          {respondido && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
              <span style={{ fontSize: "24px", flexShrink: 0 }}>{status === "acerto" ? "✅" : "❌"}</span>
              <div>
                <p style={{
                  margin: "0 0 4px", fontWeight: "700", fontSize: "16px",
                  color: status === "acerto" ? DS.verdeAcerto : DS.vermelho,
                  fontFamily: "var(--font-cinzel), serif",
                }}>
                  {status === "acerto" ? "Excelente!" : "Incorreto!"}
                </p>
                <p style={{ margin: 0, fontSize: "13px", color: DS.textCorpo, lineHeight: 1.5 }}>
                  {pergunta.explicacao}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={respondido ? onContinuar : onResponder}
            disabled={selecionado === null && !respondido}
            style={{
              width: "100%", padding: "17px",
              borderRadius: "14px",
              backgroundColor: selecionado === null && !respondido
                ? DS.bgCardBorder
                : status === "erro" ? DS.vermelho : DS.dourado,
              color: selecionado === null && !respondido ? DS.cinzaOff : "white",
              fontWeight: "700", fontSize: "14px",
              letterSpacing: "2px", border: "none",
              cursor: selecionado === null && !respondido ? "default" : "pointer",
              fontFamily: "var(--font-cinzel), serif",
              boxShadow: selecionado === null && !respondido ? "none"
                : `0 5px 0 ${status === "erro" ? "#5a0f0f" : DS.douradoSombra}`,
              transition: "all 0.2s",
            }}
          >
            {respondido ? "CONTINUAR" : "VERIFICAR"}
          </button>
        </footer>
      </main>
    </div>
  );
}

// ─── TELA RESULTADO ───────────────────────────────────────────────────────────
function TelaResultado({
  acertos,
  total,
  onContinuar,
  onRefazer,
}: {
  acertos: number;
  total: number;
  onContinuar: () => void;
  onRefazer: () => void;
}) {
  const pct = Math.round((acertos / total) * 100);
  const msg = pct === 100 ? "Perfeito!" : pct >= 70 ? "Muito bem!" : pct >= 50 ? "Bom esforço!" : "Continue praticando!";

  return (
    <div style={{
      position: "fixed", inset: 0,
      backgroundColor: DS.bgPrincipal,
      display: "flex", justifyContent: "center", alignItems: "center",
      fontFamily: "var(--font-garamond), Georgia, serif",
    }}>
      <main style={{ width: "100%", maxWidth: "450px", padding: "32px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>
          {pct === 100 ? "🏆" : pct >= 70 ? "⭐" : pct >= 50 ? "📖" : "🙏"}
        </div>
        <h1 style={{
          fontFamily: "var(--font-cinzel), serif",
          fontSize: "26px", color: DS.textTitulo, margin: "0 0 8px",
        }}>{msg}</h1>
        <p style={{ color: DS.textCorpo, fontSize: "16px", margin: "0 0 32px" }}>
          Você acertou <strong>{acertos}</strong> de <strong>{total}</strong> perguntas ({pct}%)
        </p>

        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={onRefazer} style={{
            flex: 1, padding: "16px",
            borderRadius: "14px",
            backgroundColor: DS.bgCard,
            border: `2px solid ${DS.bgCardBorder}`,
            color: DS.textCorpo, fontWeight: "700",
            cursor: "pointer",
            fontFamily: "var(--font-cinzel), serif",
            fontSize: "13px", letterSpacing: "1px",
          }}>REFAZER</button>
          <button onClick={onContinuar} style={{
            flex: 2, padding: "16px",
            borderRadius: "14px",
            backgroundColor: DS.dourado,
            border: "none", color: "white",
            fontWeight: "700", cursor: "pointer",
            fontFamily: "var(--font-cinzel), serif",
            fontSize: "13px", letterSpacing: "1px",
            boxShadow: `0 5px 0 ${DS.douradoSombra}`,
          }}>PRÓXIMO CAPÍTULO</button>
        </div>
      </main>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function GospelQuest() {
  const [tela, setTela] = useState<Tela>("home");
  const [trilha, setTrilha] = useState<Trilha>("VT");
  const [nivelAtivo, setNivelAtivo] = useState(0);
  const [niveisDesbloqueados, setNiveisDesbloqueados] = useState<Record<Trilha, number>>({
    VT: 0, NT: 0, JESUS: 0,
  });
  const [perguntaIdx, setPerguntaIdx] = useState(0);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [respondido, setRespondido] = useState(false);
  const [status, setStatus] = useState<"acerto" | "erro" | null>(null);
  const [acertos, setAcertos] = useState(0);
  const nomeJogador = "Viajante"; // virá do sistema de login futuramente

  const capitulos: Record<Trilha, Capitulo[]> = {
    VT: velhoTestamento,
    NT: novoTestamento,
    JESUS: jornadaJesus,
  };

  const caps = capitulos[trilha];
  const capitulo = caps[nivelAtivo];

  function iniciarNivel(idx: number) {
    setNivelAtivo(idx);
    setPerguntaIdx(0);
    setSelecionado(null);
    setRespondido(false);
    setStatus(null);
    setAcertos(0);
    setTela("jogo");
  }

  function responder() {
    if (selecionado === null) return;
    const correta = getRespostaCorreta(capitulo.perguntas[perguntaIdx]);
    const acertou = selecionado === correta;
    setRespondido(true);
    setStatus(acertou ? "acerto" : "erro");
    if (acertou) setAcertos(a => a + 1);
  }

  function continuar() {
    if (perguntaIdx < capitulo.perguntas.length - 1) {
      setPerguntaIdx(p => p + 1);
      setSelecionado(null);
      setRespondido(false);
      setStatus(null);
    } else {
      setTela("resultado");
    }
  }

  function avancarNivel() {
    const proximo = nivelAtivo + 1;
    setNiveisDesbloqueados(prev => ({
      ...prev,
      [trilha]: Math.max(prev[trilha], proximo),
    }));
    if (proximo < caps.length) {
      iniciarNivel(proximo);
    } else {
      setTela("mapa");
    }
  }

  if (tela === "home") {
    return <TelaHome onEscolher={(t) => { setTrilha(t); setTela("mapa"); }} />;
  }

  if (tela === "mapa") {
    return (
      <TelaMapa
        capitulos={caps}
        trilha={trilha}
        nivelDesbloqueado={niveisDesbloqueados[trilha]}
        onIniciar={iniciarNivel}
        onVoltar={() => setTela("home")}
      />
    );
  }

  if (tela === "jogo") {
    return (
      <TelaQuiz
        capitulo={capitulo}
        perguntaIdx={perguntaIdx}
        nomeJogador={nomeJogador}
        selecionado={selecionado}
        respondido={respondido}
        status={status}
        onSelecionar={setSelecionado}
        onResponder={responder}
        onContinuar={continuar}
        onSair={() => setTela("mapa")}
      />
    );
  }

  return (
    <TelaResultado
      acertos={acertos}
      total={capitulo.perguntas.length}
      onContinuar={avancarNivel}
      onRefazer={() => iniciarNivel(nivelAtivo)}
    />
  );
}
