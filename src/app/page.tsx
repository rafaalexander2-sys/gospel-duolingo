"use client";
import { useState } from "react";

const biblioteca = [
  {
    id: 1,
    titulo: "Criação",
    imagem: "/bible.png",
    perguntas: [
      {
        personagem: "/jesus.png",
        fala: "No princípio, Deus criou os céus e a terra?",
        fato: true,
      },
    ],
  },
  {
    id: 2,
    titulo: "A Arca",
    imagem: "/Wooden Ark.png",
    perguntas: [
      {
        personagem: "/joao.png",
        fala: "Noé levou 7 pares de animais limpos?",
        fato: true,
      },
    ],
  },
  {
    id: 3,
    titulo: "Mandamentos",
    imagem: "/Stone Tablets.png",
    perguntas: [
      {
        personagem: "/moises.png",
        fala: "Moisés recebeu as tábuas no Sinai?",
        fato: true,
      },
    ],
  },
  {
    id: 4,
    titulo: "Reinado",
    imagem: "/golden crown.png",
    perguntas: [
      {
        personagem: "/jesus.png",
        fala: "Davi era um pastor de ovelhas?",
        fato: true,
      },
    ],
  },
];

export default function TruerApp() {
  const [tela, setTela] = useState<"mapa" | "jogo">("mapa");
  const [nivelAtivo, setNivelAtivo] = useState(0);
  const [perguntaIdx, setPerguntaIdx] = useState(0);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [respondido, setRespondido] = useState(false);
  const [status, setStatus] = useState<"acerto" | "erro" | null>(null);

  const nivel = biblioteca[nivelAtivo];
  const pergunta = nivel?.perguntas[perguntaIdx];

  // --- COMPONENTE DO MAPA ---
  if (tela === "mapa") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "white",
          display: "flex",
          justifyContent: "center",
          overflowY: "auto",
          fontFamily: "sans-serif",
        }}
      >
        <style>{`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
        `}</style>

        <main
          style={{
            width: "100%",
            maxWidth: "450px",
            backgroundColor: "white",
            position: "relative",
          }}
        >
          {/* Header estilo Duolingo */}
          <div
            style={{
              position: "sticky",
              top: 0,
              backgroundColor: "white",
              padding: "15px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "2px solid #e5e5e5",
              zIndex: 100,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>🔥</span>{" "}
              <span style={{ fontWeight: "bold", color: "#afafaf" }}>7</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>💎</span>{" "}
              <span style={{ fontWeight: "bold", color: "#1cb0f6" }}>460</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>❤️</span>{" "}
              <span style={{ fontWeight: "bold", color: "#ff4b4b" }}>11</span>
            </div>
          </div>

          <div
            style={{
              padding: "40px 20px 150px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
            }}
          >
            {/* Linha do Caminho */}
            <svg
              style={{
                position: "absolute",
                top: 100,
                width: "100%",
                height: "1000px",
                zIndex: 0,
              }}
            >
              <path
                d="M 225 0 C 350 150, 100 300, 225 450 C 350 600, 100 750, 225 900"
                fill="transparent"
                stroke="#e5e5e5"
                strokeWidth="15"
                strokeLinecap="round"
              />
            </svg>

            {biblioteca.map((f, i) => {
              const lateral =
                i % 2 === 0 ? "0" : i % 4 === 1 ? "70px" : "-70px";
              const estaNestaFase = i === nivelAtivo;

              return (
                <div
                  key={f.id}
                  style={{
                    marginBottom: "80px",
                    position: "relative",
                    transform: `translateX(${lateral})`,
                    zIndex: 1,
                  }}
                >
                  {/* Boneco flutuando (A Corujinha do seu app) */}
                  {estaNestaFase && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-70px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        animation: "float 2s ease-in-out infinite",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "white",
                          padding: "5px 12px",
                          borderRadius: "12px",
                          border: "2px solid #e5e5e5",
                          fontSize: "12px",
                          fontWeight: "bold",
                          marginBottom: "5px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        VAMOS LÁ!
                      </div>
                      <img src="/jesus.png" style={{ width: "60px" }} />
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setNivelAtivo(i);
                      setTela("jogo");
                    }}
                    style={{
                      width: "90px",
                      height: "80px",
                      borderRadius: "50%",
                      backgroundColor: estaNestaFase ? "#58cc02" : "white",
                      border: `3px solid ${estaNestaFase ? "#46a302" : "#e5e5e5"}`,
                      boxShadow: `0 8px 0 ${estaNestaFase ? "#46a302" : "#e5e5e5"}`,
                      cursor: "pointer",
                      padding: "15px",
                    }}
                  >
                    <img
                      src={f.imagem}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        filter: estaNestaFase ? "none" : "grayscale(100%)",
                      }}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Menu Inferior */}
          <nav
            style={{
              position: "fixed",
              bottom: 0,
              width: "100%",
              maxWidth: "450px",
              height: "80px",
              backgroundColor: "white",
              borderTop: "2px solid #e5e5e5",
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              zIndex: 100,
            }}
          >
            <span style={{ fontSize: "30px" }}>🏠</span>
            <span style={{ fontSize: "30px", opacity: 0.3 }}>🏆</span>
            <span style={{ fontSize: "30px", opacity: 0.3 }}>👤</span>
            <span style={{ fontSize: "30px", opacity: 0.3 }}>⚙️</span>
          </nav>
        </main>
      </div>
    );
  }

  // --- TELA DO JOGO (QUIZ) ---
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "white",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: "450px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            padding: "40px 20px 10px",
            display: "flex",
            alignItems: "center",
            gap: "15px",
          }}
        >
          <span
            onClick={() => setTela("mapa")}
            style={{
              cursor: "pointer",
              fontSize: "24px",
              fontWeight: "bold",
              color: "#afafaf",
            }}
          >
            ✕
          </span>
          <div
            style={{
              flex: 1,
              height: "14px",
              backgroundColor: "#e5e5e5",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                width: `${((perguntaIdx + 1) / nivel.perguntas.length) * 100}%`,
                height: "100%",
                backgroundColor: "#58cc02",
                borderRadius: "10px",
              }}
            />
          </div>
          <span style={{ color: "#ff8400", fontWeight: "bold" }}>⚡ 15</span>
        </header>

        <div style={{ flex: 1, padding: "25px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#4b4b4b" }}>
            Qual destes é Fato?
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              marginTop: "40px",
            }}
          >
            <img src={pergunta.personagem} style={{ width: "100px" }} />
            <div
              style={{
                border: "2px solid #e5e5e5",
                borderRadius: "15px",
                padding: "15px",
                flex: 1,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "-9px",
                  top: "20px",
                  width: "15px",
                  height: "15px",
                  backgroundColor: "white",
                  borderLeft: "2px solid #e5e5e5",
                  borderBottom: "2px solid #e5e5e5",
                  transform: "rotate(45deg)",
                }}
              />
              <p style={{ margin: 0, fontWeight: "700" }}>"{pergunta.fala}"</p>
            </div>
          </div>

          <div
            style={{
              marginTop: "40px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <button
              onClick={() => !respondido && setSelecionado(1)}
              style={{
                padding: "20px",
                borderRadius: "15px",
                border: "2px solid",
                borderColor: selecionado === 1 ? "#84d8ff" : "#e5e5e5",
                backgroundColor: selecionado === 1 ? "#ddf4ff" : "white",
                fontWeight: "bold",
                textAlign: "left",
              }}
            >
              Sim, isso é Fato!
            </button>
            <button
              onClick={() => !respondido && setSelecionado(2)}
              style={{
                padding: "20px",
                borderRadius: "15px",
                border: "2px solid",
                borderColor: selecionado === 2 ? "#84d8ff" : "#e5e5e5",
                backgroundColor: selecionado === 2 ? "#ddf4ff" : "white",
                fontWeight: "bold",
                textAlign: "left",
              }}
            >
              Não, isso é Fake!
            </button>
          </div>
        </div>

        <footer
          style={{
            padding: "20px",
            borderTop: "2px solid #e5e5e5",
            backgroundColor:
              status === "acerto"
                ? "#d7ffb8"
                : status === "erro"
                  ? "#ffdfe0"
                  : "white",
          }}
        >
          {respondido && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "15px",
              }}
            >
              <span style={{ fontSize: "28px" }}>
                {status === "acerto" ? "✅" : "❌"}
              </span>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontWeight: "800",
                    fontSize: "18px",
                    color: status === "acerto" ? "#46a302" : "#ff4b4b",
                  }}
                >
                  {status === "acerto" ? "Mandou bem!" : "Errado!"}
                </p>
                {status === "erro" && (
                  <p style={{ margin: 0, fontSize: "14px", color: "#ff4b4b" }}>
                    {pergunta.fato
                      ? "A afirmação é verdadeira."
                      : "A afirmação é falsa."}
                  </p>
                )}
              </div>
            </div>
          )}
          <button
            onClick={
              respondido
                ? () => {
                    if (perguntaIdx < nivel.perguntas.length - 1) {
                      setPerguntaIdx(perguntaIdx + 1);
                      setRespondido(false);
                      setStatus(null);
                      setSelecionado(null);
                    } else {
                      setTela("mapa");
                      setRespondido(false);
                      setStatus(null);
                      setSelecionado(null);
                    }
                  }
                : () => {
                    setRespondido(true);
                    setStatus(
                      (selecionado === 1 && pergunta.fato) ||
                        (selecionado === 2 && !pergunta.fato)
                        ? "acerto"
                        : "erro",
                    );
                  }
            }
            disabled={!selecionado}
            style={{
              width: "100%",
              padding: "20px",
              borderRadius: "15px",
              backgroundColor: !selecionado
                ? "#e5e5e5"
                : status === "erro"
                  ? "#ff4b4b"
                  : "#58cc02",
              color: "white",
              fontWeight: "bold",
              border: "none",
            }}
          >
            {respondido ? "CONTINUAR" : "VERIFICAR"}
          </button>
        </footer>
      </main>
    </div>
  );
}
