"use client";
import { useState } from "react";

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

function AvatarPersonagem({ tipo }: { tipo: string }) {
  const configs: Record<string, { bg: string; rosto: string; detalhe: string }> = {
    jesus:  { bg: "#c8e6c9", rosto: "#f9c784", detalhe: "#6d4c41" },
    joao:   { bg: "#bbdefb", rosto: "#f9c784", detalhe: "#37474f" },
    moises: { bg: "#ffe0b2", rosto: "#f9c784", detalhe: "#4e342e" },
    davi:   { bg: "#e1bee7", rosto: "#f9c784", detalhe: "#4a148c" },
  };
  const c = configs[tipo] ?? configs.jesus;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
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

const biblioteca = [
  {
    id: 1,
    titulo: "A Criação",
    icone: "📖",
    perguntas: [
      { personagem: "jesus", fala: "No princípio, Deus criou os céus e a terra?", fato: true },
    ],
  },
  {
    id: 2,
    titulo: "O Dilúvio",
    icone: "⛵",
    perguntas: [
      { personagem: "joao", fala: "Noé levou 7 pares de animais limpos?", fato: true },
    ],
  },
  {
    id: 3,
    titulo: "Os Mandamentos",
    icone: "📜",
    perguntas: [
      { personagem: "moises", fala: "Moisés recebeu as tábuas no Sinai?", fato: true },
    ],
  },
  {
    id: 4,
    titulo: "O Reinado",
    icone: "👑",
    perguntas: [
      { personagem: "davi", fala: "Davi era um pastor de ovelhas?", fato: true },
    ],
  },
];

export default function GospelQuest() {
  const [tela, setTela] = useState<"mapa" | "jogo">("mapa");
  const [nivelAtivo, setNivelAtivo] = useState(0);
  const [perguntaIdx, setPerguntaIdx] = useState(0);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [respondido, setRespondido] = useState(false);
  const [status, setStatus] = useState<"acerto" | "erro" | null>(null);

  const nivel = biblioteca[nivelAtivo];
  const pergunta = nivel?.perguntas[perguntaIdx];

  if (tela === "mapa") {
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
            0%   { transform: translateY(0px); }
            50%  { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
          @keyframes shimmer {
            0%   { opacity: 0.7; }
            50%  { opacity: 1; }
            100% { opacity: 0.7; }
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
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px" }}>🔥</div>
              <div style={{ fontWeight: "700", color: DS.vermelho, fontSize: "13px",
                fontFamily: "var(--font-cinzel), serif" }}>7</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "22px", lineHeight: 1 }}>✝️</div>
              <div style={{ fontWeight: "700", color: DS.dourado, fontSize: "13px",
                fontFamily: "var(--font-cinzel), serif" }}>460</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px" }}>❤️</div>
              <div style={{ fontWeight: "700", color: DS.vermelho, fontSize: "13px",
                fontFamily: "var(--font-cinzel), serif" }}>11</div>
            </div>
          </div>

          {/* Título da trilha */}
          <div style={{ textAlign: "center", padding: "24px 20px 0",
            fontFamily: "var(--font-cinzel), serif" }}>
            <div style={{ fontSize: "11px", letterSpacing: "3px", color: DS.cinzaOff,
              textTransform: "uppercase" }}>Velho Testamento</div>
            <div style={{ fontSize: "22px", fontWeight: "700", color: DS.textTitulo,
              marginTop: "4px" }}>A Jornada Sagrada</div>
          </div>

          {/* Mapa */}
          <div style={{
            padding: "40px 20px 150px",
            display: "flex", flexDirection: "column", alignItems: "center",
            position: "relative",
          }}>
            <svg style={{ position: "absolute", top: 100, width: "100%", height: "1000px", zIndex: 0 }}>
              <path
                d="M 225 0 C 350 150, 100 300, 225 450 C 350 600, 100 750, 225 900"
                fill="transparent"
                stroke={DS.bgCardBorder}
                strokeWidth="18"
                strokeLinecap="round"
              />
              <path
                d="M 225 0 C 350 150, 100 300, 225 450 C 350 600, 100 750, 225 900"
                fill="transparent"
                stroke={DS.bgCard}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="1 28"
              />
            </svg>

            {biblioteca.map((f, i) => {
              const lateral = i % 2 === 0 ? "0" : i % 4 === 1 ? "70px" : "-70px";
              const ativo = i === nivelAtivo;
              const bloqueado = i > nivelAtivo;

              return (
                <div key={f.id} style={{
                  marginBottom: "80px",
                  position: "relative",
                  transform: `translateX(${lateral})`,
                  zIndex: 1,
                }}>
                  {ativo && (
                    <div style={{
                      position: "absolute", top: "-75px", left: "50%",
                      transform: "translateX(-50%)",
                      animation: "float 2s ease-in-out infinite",
                      textAlign: "center",
                    }}>
                      <div style={{
                        backgroundColor: DS.bgCard,
                        padding: "4px 12px",
                        borderRadius: "20px",
                        border: `2px solid ${DS.dourado}`,
                        fontSize: "11px", fontWeight: "700",
                        marginBottom: "6px",
                        color: DS.dourado,
                        fontFamily: "var(--font-cinzel), serif",
                        letterSpacing: "1px",
                        whiteSpace: "nowrap",
                      }}>
                        INICIAR
                      </div>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <MascoteFlutuante />
                      </div>
                    </div>
                  )}

                  {/* Label do capítulo */}
                  <div style={{
                    position: "absolute", bottom: "-28px", left: "50%",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                    fontSize: "12px", fontWeight: "600",
                    fontFamily: "var(--font-cinzel), serif",
                    color: ativo ? DS.textTitulo : DS.cinzaOff,
                  }}>
                    {f.titulo}
                  </div>

                  <button
                    onClick={() => {
                      if (bloqueado) return;
                      setNivelAtivo(i);
                      setPerguntaIdx(0);
                      setSelecionado(null);
                      setRespondido(false);
                      setStatus(null);
                      setTela("jogo");
                    }}
                    style={{
                      width: "88px", height: "88px",
                      borderRadius: "50%",
                      backgroundColor: ativo ? DS.dourado : DS.bgCard,
                      border: `3px solid ${ativo ? DS.douradoSombra : DS.bgCardBorder}`,
                      boxShadow: `0 7px 0 ${ativo ? DS.douradoSombra : DS.bgCardBorder}`,
                      cursor: bloqueado ? "default" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "transform 0.1s",
                    }}
                  >
                    {bloqueado
                      ? <span style={{ fontSize: "28px", opacity: 0.4 }}>🔒</span>
                      : <span style={{ fontSize: "36px",
                          filter: ativo ? "none" : "grayscale(60%) opacity(0.7)" }}>
                          {f.icone}
                        </span>
                    }
                  </button>
                </div>
              );
            })}
          </div>

          {/* Nav inferior */}
          <nav style={{
            position: "fixed", bottom: 0,
            width: "100%", maxWidth: "450px",
            height: "76px",
            backgroundColor: DS.bgCard,
            borderTop: `2px solid ${DS.bgCardBorder}`,
            display: "flex", justifyContent: "space-around", alignItems: "center",
            zIndex: 100,
          }}>
            {[
              { icon: "🏠", label: "Início", ativo: true },
              { icon: "🏆", label: "Conquistas", ativo: false },
              { icon: "👤", label: "Perfil", ativo: false },
              { icon: "⚙️", label: "Config", ativo: false },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: "center", opacity: item.ativo ? 1 : 0.35 }}>
                <div style={{ fontSize: "22px" }}>{item.icon}</div>
                <div style={{ fontSize: "10px", fontFamily: "var(--font-cinzel), serif",
                  color: DS.textCorpo, letterSpacing: "0.5px" }}>{item.label}</div>
              </div>
            ))}
          </nav>
        </main>
      </div>
    );
  }

  // --- TELA DO QUIZ ---
  return (
    <div style={{
      position: "fixed", inset: 0,
      backgroundColor: DS.bgPrincipal,
      display: "flex", justifyContent: "center",
      fontFamily: "var(--font-garamond), Georgia, serif",
    }}>
      <main style={{ width: "100%", maxWidth: "450px", display: "flex", flexDirection: "column" }}>

        {/* Header quiz */}
        <header style={{
          padding: "44px 20px 12px",
          display: "flex", alignItems: "center", gap: "15px",
          backgroundColor: DS.bgCard,
          borderBottom: `2px solid ${DS.bgCardBorder}`,
        }}>
          <span onClick={() => setTela("mapa")} style={{
            cursor: "pointer", fontSize: "20px",
            fontWeight: "bold", color: DS.cinzaOff,
          }}>✕</span>
          <div style={{
            flex: 1, height: "12px",
            backgroundColor: DS.bgCardBorder,
            borderRadius: "10px", overflow: "hidden",
          }}>
            <div style={{
              width: `${((perguntaIdx + 1) / nivel.perguntas.length) * 100}%`,
              height: "100%",
              backgroundColor: DS.dourado,
              borderRadius: "10px",
              transition: "width 0.4s ease",
            }} />
          </div>
          <span style={{ color: DS.dourado, fontWeight: "700",
            fontFamily: "var(--font-cinzel), serif", fontSize: "13px" }}>
            ✦ 15
          </span>
        </header>

        {/* Conteúdo */}
        <div style={{ flex: 1, padding: "28px 22px", overflowY: "auto" }}>
          <h1 style={{
            fontSize: "22px", fontWeight: "700",
            color: DS.textTitulo,
            fontFamily: "var(--font-cinzel), serif",
            lineHeight: 1.3,
          }}>
            Qual destes é Fato?
          </h1>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginTop: "32px" }}>
            <AvatarPersonagem tipo={pergunta.personagem} />
            <div style={{
              border: `2px solid ${DS.bgCardBorder}`,
              borderRadius: "16px",
              padding: "14px 16px",
              flex: 1,
              backgroundColor: DS.bgCard,
              position: "relative",
            }}>
              <div style={{
                position: "absolute", left: "-10px", top: "22px",
                width: "16px", height: "16px",
                backgroundColor: DS.bgCard,
                borderLeft: `2px solid ${DS.bgCardBorder}`,
                borderBottom: `2px solid ${DS.bgCardBorder}`,
                transform: "rotate(45deg)",
              }} />
              <p style={{ margin: 0, fontWeight: "500", fontSize: "16px",
                color: DS.textCorpo, lineHeight: 1.5 }}>
                "{pergunta.fala}"
              </p>
            </div>
          </div>

          <div style={{ marginTop: "36px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { id: 1, label: "Sim, isso é Fato!", icone: "✦" },
              { id: 2, label: "Não, isso é Falso!", icone: "✗" },
            ].map((opcao) => (
              <button
                key={opcao.id}
                onClick={() => !respondido && setSelecionado(opcao.id)}
                style={{
                  padding: "18px 20px",
                  borderRadius: "14px",
                  border: `2px solid`,
                  borderColor: selecionado === opcao.id ? DS.dourado : DS.bgCardBorder,
                  backgroundColor: selecionado === opcao.id ? "#fef3c7" : DS.bgCard,
                  fontWeight: "600",
                  fontSize: "16px",
                  textAlign: "left",
                  color: DS.textCorpo,
                  cursor: respondido ? "default" : "pointer",
                  fontFamily: "var(--font-garamond), serif",
                  display: "flex", alignItems: "center", gap: "12px",
                  boxShadow: `0 4px 0 ${selecionado === opcao.id ? DS.douradoSombra : DS.bgCardBorder}`,
                  transition: "all 0.15s",
                }}
              >
                <span style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  backgroundColor: selecionado === opcao.id ? DS.dourado : DS.bgCardBorder,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: selecionado === opcao.id ? "white" : DS.cinzaOff,
                  fontSize: "14px", fontWeight: "700", flexShrink: 0,
                }}>
                  {opcao.icone}
                </span>
                {opcao.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer style={{
          padding: "18px 22px 28px",
          borderTop: `2px solid ${DS.bgCardBorder}`,
          backgroundColor: status === "acerto" ? DS.fundoAcerto
            : status === "erro" ? DS.fundoErro
            : DS.bgCard,
          transition: "background-color 0.3s",
        }}>
          {respondido && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <span style={{ fontSize: "26px" }}>{status === "acerto" ? "✅" : "❌"}</span>
              <div>
                <p style={{
                  margin: 0, fontWeight: "700", fontSize: "17px",
                  color: status === "acerto" ? DS.verdeAcerto : DS.vermelho,
                  fontFamily: "var(--font-cinzel), serif",
                }}>
                  {status === "acerto" ? "Excelente!" : "Incorreto!"}
                </p>
                {status === "erro" && (
                  <p style={{ margin: "4px 0 0", fontSize: "14px", color: DS.textCorpo }}>
                    {pergunta.fato ? "A afirmação é verdadeira." : "A afirmação é falsa."}
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={respondido
              ? () => {
                  if (perguntaIdx < nivel.perguntas.length - 1) {
                    setPerguntaIdx(perguntaIdx + 1);
                  } else {
                    setTela("mapa");
                  }
                  setRespondido(false);
                  setStatus(null);
                  setSelecionado(null);
                }
              : () => {
                  if (!selecionado) return;
                  setRespondido(true);
                  setStatus(
                    (selecionado === 1 && pergunta.fato) || (selecionado === 2 && !pergunta.fato)
                      ? "acerto" : "erro"
                  );
                }
            }
            disabled={!selecionado && !respondido}
            style={{
              width: "100%", padding: "18px",
              borderRadius: "14px",
              backgroundColor: !selecionado && !respondido
                ? DS.bgCardBorder
                : status === "erro"
                ? DS.vermelho
                : DS.dourado,
              color: !selecionado && !respondido ? DS.cinzaOff : "white",
              fontWeight: "700",
              fontSize: "15px",
              letterSpacing: "2px",
              border: "none",
              cursor: !selecionado && !respondido ? "default" : "pointer",
              fontFamily: "var(--font-cinzel), serif",
              boxShadow: !selecionado && !respondido
                ? "none"
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
