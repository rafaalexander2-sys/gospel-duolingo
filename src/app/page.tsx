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

type Tela = "login" | "cadastro" | "criar_personagem" | "home" | "trilhas" | "mapa" | "etapas" | "jogo" | "resultado" | "armadura" | "ranking";
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
  const sash = "#6a3008";
  const sandal = "#7a3808";

  // Cada personagem tem pele, rosto e expressão únicos
  const faces: Record<TipoPersonagem, React.ReactNode> = {
    // ── PEREGRINO: jovem, rosto redondo, sorriso largo, olhos grandes ──
    peregrino: (() => {
      const skin = "#c8784a"; const hair = "#3c1808";
      return (
        <g>
          {/* cabelo ondulado atrás */}
          <ellipse cx="40" cy="8" rx="18" ry="11" fill={hair} />
          <path d="M22 18 C17 26,21 33,17 42" stroke={hair} strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M58 18 C63 26,59 33,63 42" stroke={hair} strokeWidth="9" strokeLinecap="round" fill="none" />
          {/* rosto redondo */}
          <ellipse cx="40" cy="23" rx="18" ry="19" fill={skin} />
          {/* bochechas rosadas */}
          <ellipse cx="25" cy="31" rx="5" ry="3.5" fill="#e85030" opacity="0.20" />
          <ellipse cx="55" cy="31" rx="5" ry="3.5" fill="#e85030" opacity="0.20" />
          {/* sobrancelhas finas curvadas */}
          <path d="M26 14 Q31 11 36 13" stroke={hair} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M44 13 Q49 11 54 14" stroke={hair} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {/* olhos grandes e redondos */}
          <ellipse cx="31" cy="22" rx="6" ry="6.5" fill="white" />
          <ellipse cx="49" cy="22" rx="6" ry="6.5" fill="white" />
          <circle cx="31.5" cy="22.5" r="4" fill="#2a1408" />
          <circle cx="49.5" cy="22.5" r="4" fill="#2a1408" />
          <circle cx="31.5" cy="22.5" r="2.2" fill="#0a0404" />
          <circle cx="49.5" cy="22.5" r="2.2" fill="#0a0404" />
          <circle cx="33" cy="20.5" r="1.6" fill="white" />
          <circle cx="51" cy="20.5" r="1.6" fill="white" />
          {/* nariz pequeno arredondado */}
          <ellipse cx="40" cy="30" rx="2.5" ry="2" fill="#a05828" opacity="0.6" />
          {/* sorriso largo e aberto */}
          <path d="M30 36 Q40 44 50 36" stroke="#803010" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M32 37 Q40 42 48 37" fill="#c04820" opacity="0.3" />
        </g>
      );
    })(),

    // ── PROFETA: idoso, rosto oval longo, barba espessa, olhos sábios ──
    profeta: (() => {
      const skin = "#b86838"; const hair = "#1a0c04";
      return (
        <g>
          {/* cabelo longo até os ombros */}
          <ellipse cx="40" cy="7" rx="17" ry="10" fill={hair} />
          <path d="M23 15 C20 24,19 34,18 46" stroke={hair} strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M57 15 C60 24,61 34,62 46" stroke={hair} strokeWidth="11" strokeLinecap="round" fill="none" />
          {/* rosto oval mais longo/estreito */}
          <ellipse cx="40" cy="24" rx="15" ry="20" fill={skin} />
          {/* sobrancelhas grossas e sérias */}
          <path d="M25 13 Q31 10 37 12" stroke={hair} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M43 12 Q49 10 55 13" stroke={hair} strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* olhos fundos e intensos — menores */}
          <ellipse cx="31" cy="21" rx="5" ry="5" fill="white" />
          <ellipse cx="49" cy="21" rx="5" ry="5" fill="white" />
          <circle cx="31.5" cy="21.5" r="3.5" fill="#1a0808" />
          <circle cx="49.5" cy="21.5" r="3.5" fill="#1a0808" />
          <circle cx="31.5" cy="21.5" r="2" fill="#080404" />
          <circle cx="49.5" cy="21.5" r="2" fill="#080404" />
          <circle cx="32.5" cy="20" r="1.2" fill="white" />
          <circle cx="50.5" cy="20" r="1.2" fill="white" />
          {/* nariz pronunciado */}
          <path d="M37 28 Q40 35 43 28" stroke="#904828" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M36 33 Q40 36 44 33" stroke="#904828" strokeWidth="1.2" fill="none" />
          {/* boca séria */}
          <path d="M33 37 Q40 39 47 37" stroke="#703020" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* barba espessa */}
          <path d="M25 30 Q26 46 40 50 Q54 46 55 30 Q50 40 40 43 Q30 40 25 30 Z" fill={hair} opacity="0.85" />
          {/* bigode */}
          <path d="M30 35 Q40 38 50 35" stroke={hair} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.9" />
          {/* rugas */}
          <path d="M26 17 Q28 15 30 17" stroke="#904828" strokeWidth="0.8" fill="none" opacity="0.5" />
          <path d="M50 17 Q52 15 54 17" stroke="#904828" strokeWidth="0.8" fill="none" opacity="0.5" />
        </g>
      );
    })(),

    // ── GUERREIRO: adulto, queixo quadrado, olhos estreitos e sérios ──
    guerreiro: (() => {
      const skin = "#c07040"; const hair = "#140a04";
      return (
        <g>
          {/* cabelo curto e duro */}
          <rect x="22" y="4" width="36" height="14" rx="5" fill={hair} />
          <rect x="19" y="10" width="8" height="16" rx="3" fill={hair} />
          <rect x="53" y="10" width="8" height="16" rx="3" fill={hair} />
          {/* rosto quadrado/angular — queixo forte */}
          <path d="M24 20 L24 38 Q24 46 40 48 Q56 46 56 38 L56 20 Q56 8 40 8 Q24 8 24 20 Z" fill={skin} />
          {/* sobrancelhas grossas e franzidas */}
          <path d="M25 16 Q31 13 37 16" stroke={hair} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M43 16 Q49 13 55 16" stroke={hair} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          {/* ângulo interno franzido */}
          <path d="M35 15 L38 17" stroke={hair} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M45 15 L42 17" stroke={hair} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* olhos estreitos — semicerrados */}
          <ellipse cx="31" cy="23" rx="6" ry="4" fill="white" />
          <ellipse cx="49" cy="23" rx="6" ry="4" fill="white" />
          <ellipse cx="31.5" cy="23.5" r="3" fill="#180808" />
          <ellipse cx="49.5" cy="23.5" r="3" fill="#180808" />
          <ellipse cx="31.5" cy="23.5" r="1.6" fill="#050202" />
          <ellipse cx="49.5" cy="23.5" r="1.6" fill="#050202" />
          <circle cx="32.5" cy="22.2" r="1" fill="white" />
          <circle cx="50.5" cy="22.2" r="1" fill="white" />
          {/* pálpebra franzida superior */}
          <path d="M25 21 Q31 19 37 21" stroke={hair} strokeWidth="1.2" fill="none" opacity="0.6" />
          <path d="M43 21 Q49 19 55 21" stroke={hair} strokeWidth="1.2" fill="none" opacity="0.6" />
          {/* nariz largo */}
          <path d="M37 29 Q40 34 43 29" stroke="#905030" strokeWidth="2" fill="none" strokeLinecap="round" />
          <ellipse cx="36" cy="31" rx="2" ry="1.5" fill="#905030" opacity="0.4" />
          <ellipse cx="44" cy="31" rx="2" ry="1.5" fill="#905030" opacity="0.4" />
          {/* boca fechada, expressão firme */}
          <path d="M33 38 Q40 40 47 38" stroke="#703020" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          {/* cicatriz sutil */}
          <path d="M50 26 L53 30" stroke="#904830" strokeWidth="1" fill="none" opacity="0.4" />
        </g>
      );
    })(),

    // ── SÁBIA: mulher, rosto oval suave, olhos amendoados, véu ──
    sabia: (() => {
      const skin = "#c87848"; const hair = "#1c0830";
      return (
        <g>
          {/* véu cobrindo cabeça */}
          <ellipse cx="40" cy="10" rx="21" ry="14" fill={hair} />
          <path d="M19 18 Q15 30 17 46" stroke={hair} strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.95" />
          <path d="M61 18 Q65 30 63 46" stroke={hair} strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.95" />
          {/* rosto oval suave */}
          <ellipse cx="40" cy="24" rx="16" ry="18" fill={skin} />
          {/* véu sobre testa */}
          <path d="M19 18 Q40 10 61 18 L58 28 Q40 22 22 28 Z" fill={hair} opacity="0.9" />
          {/* sobrancelhas finas e arqueadas */}
          <path d="M27 20 Q31 17 36 19" stroke={hair} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M44 19 Q49 17 53 20" stroke={hair} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* olhos amendoados grandes */}
          <path d="M25 26 Q31 21 37 26 Q31 29 25 26 Z" fill="white" />
          <path d="M43 26 Q49 21 55 26 Q49 29 43 26 Z" fill="white" />
          <circle cx="31" cy="25.5" r="3.8" fill="#2a1040" />
          <circle cx="49" cy="25.5" r="3.8" fill="#2a1040" />
          <circle cx="31" cy="25.5" r="2.2" fill="#0c0418" />
          <circle cx="49" cy="25.5" r="2.2" fill="#0c0418" />
          <circle cx="32.2" cy="23.8" r="1.4" fill="white" />
          <circle cx="50.2" cy="23.8" r="1.4" fill="white" />
          {/* cílios superiores suaves */}
          <path d="M25 24 Q31 20 37 24" stroke={hair} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.8" />
          <path d="M43 24 Q49 20 55 24" stroke={hair} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.8" />
          {/* nariz delicado */}
          <path d="M38 31 Q40 34 42 31" stroke="#a06030" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          {/* bochechas rosadas */}
          <ellipse cx="25" cy="32" rx="4.5" ry="3" fill="#e06050" opacity="0.22" />
          <ellipse cx="55" cy="32" rx="4.5" ry="3" fill="#e06050" opacity="0.22" />
          {/* sorriso gentil e fechado */}
          <path d="M32 37 Q40 42 48 37" stroke="#803020" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M33 37.5 Q40 41 47 37.5" fill="#c04030" opacity="0.25" />
        </g>
      );
    })(),
  };

  const bgs: Record<TipoPersonagem, string> = {
    peregrino: "#d4e8d0",
    profeta: "#e8d4b0",
    guerreiro: "#d0d8e8",
    sabia: "#e8d0e8",
  };

  return (
    <svg width={size} height={Math.round(size * 1.2)} viewBox="0 0 80 96">
      <circle cx="40" cy="44" r="38" fill={bgs[tipo]} opacity="0.65" />

      {/* ── ROBE ── */}
      <path d="M22 42 Q12 66 10 94 L70 94 Q68 66 58 42 Z" fill={cor} />
      <path d="M33 42 Q29 64 28 94 L52 94 Q51 64 47 42 Z" fill={cor} opacity="0.5" />
      <path d="M38 42 Q37 64 36 94 L44 94 Q43 64 42 42 Z" fill="white" opacity="0.12" />
      <path d="M18 57 Q40 62 62 57 L60 65 Q40 70 20 65 Z" fill={sash} />
      <circle cx="40" cy="61" r="4" fill={sash} />
      <circle cx="40" cy="61" r="2.5" fill="#8a4010" />

      {/* ── BRAÇOS ── */}
      {tipo === "guerreiro" ? (
        <>
          <path d="M22 48 Q6 58 4 72" stroke={cor} strokeWidth="15" strokeLinecap="round" fill="none" />
          <path d="M22 48 Q6 58 4 72" stroke="#c07040" strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M58 48 Q74 58 76 72" stroke={cor} strokeWidth="15" strokeLinecap="round" fill="none" />
          <path d="M58 48 Q74 58 76 72" stroke="#c07040" strokeWidth="11" strokeLinecap="round" fill="none" />
          <ellipse cx="4" cy="74" rx="6" ry="5" fill="#c07040" />
          <ellipse cx="76" cy="74" rx="6" ry="5" fill="#c07040" />
        </>
      ) : (
        <>
          <path d="M22 46 Q8 60 6 76" stroke={cor} strokeWidth="13" strokeLinecap="round" fill="none" />
          <path d="M22 46 Q8 60 6 76" stroke={tipo === "sabia" ? "#c87848" : tipo === "profeta" ? "#b86838" : "#c8784a"} strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M58 46 Q72 60 74 76" stroke={cor} strokeWidth="13" strokeLinecap="round" fill="none" />
          <path d="M58 46 Q72 60 74 76" stroke={tipo === "sabia" ? "#c87848" : tipo === "profeta" ? "#b86838" : "#c8784a"} strokeWidth="9" strokeLinecap="round" fill="none" />
          <ellipse cx="6" cy="78" rx="5.5" ry="4.5" fill={tipo === "sabia" ? "#c87848" : tipo === "profeta" ? "#b86838" : "#c8784a"} />
          <ellipse cx="74" cy="78" rx="5.5" ry="4.5" fill={tipo === "sabia" ? "#c87848" : tipo === "profeta" ? "#b86838" : "#c8784a"} />
        </>
      )}

      {/* ── PESCOÇO ── */}
      <rect x="36" y="38" width="8" height="8" rx="3" fill={tipo === "sabia" ? "#c87848" : tipo === "profeta" ? "#b86838" : tipo === "guerreiro" ? "#c07040" : "#c8784a"} />

      {/* ── SANDÁLIAS ── */}
      <ellipse cx="27" cy="93" rx="11" ry="5" fill={sandal} />
      <ellipse cx="53" cy="93" rx="11" ry="5" fill={sandal} />
      <path d="M20 91 Q27 87 34 91" stroke={sandal} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M46 91 Q53 87 60 91" stroke={sandal} strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* ── ROSTO único por personagem ── */}
      {faces[tipo]}

      {/* ── ACESSÓRIOS ── */}
      {tipo === "peregrino" && (
        <line x1="71" y1="30" x2="71" y2="94" stroke="#5a2808" strokeWidth="4.5" strokeLinecap="round" />
      )}
      {tipo === "profeta" && (
        <g>
          <rect x="4" y="58" width="12" height="17" rx="2" fill="#e8dcc0" stroke="#8a6030" strokeWidth="1.2" />
          <line x1="7" y1="63" x2="13" y2="63" stroke="#8a6030" strokeWidth="0.8" />
          <line x1="7" y1="67" x2="13" y2="67" stroke="#8a6030" strokeWidth="0.8" />
          <line x1="7" y1="71" x2="13" y2="71" stroke="#8a6030" strokeWidth="0.8" />
        </g>
      )}
      {tipo === "guerreiro" && (
        <g>
          <rect x="67" y="38" width="5.5" height="36" rx="1.5" fill="#a0a8bc" />
          <rect x="62" y="46" width="15" height="4.5" rx="1.5" fill="#c8b040" />
          <rect x="65.5" y="34" width="8" height="7" rx="2" fill="#c8b040" />
        </g>
      )}
      {tipo === "sabia" && (
        <g>
          <rect x="62" y="56" width="14" height="18" rx="2" fill="#d4c090" stroke="#8a6820" strokeWidth="1.2" />
          <line x1="65" y1="56" x2="65" y2="74" stroke="#8a6820" strokeWidth="1" />
          <line x1="65" y1="60" x2="75" y2="60" stroke="#8a6820" strokeWidth="0.8" />
          <line x1="65" y1="64" x2="75" y2="64" stroke="#8a6820" strokeWidth="0.8" />
          <line x1="65" y1="68" x2="75" y2="68" stroke="#8a6820" strokeWidth="0.8" />
        </g>
      )}
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
            {carregando ? "Criando conta..." : "Iniciar Jornada"}
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
            stroke={i < completas ? DS.douradoClaro : "#3a2808"}
            strokeWidth="5.5" fill="none" strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

// ── Tela HOME ─────────────────────────────────────────────────────
function TelaHome({
  perfil, vidas, onEscolher, onArmadura, onPersonagem, onRanking, onTrilhas, onSair,
}: {
  perfil: Perfil; vidas: number;
  onEscolher: (t: Trilha) => void;
  onArmadura: () => void;
  onPersonagem: () => void;
  onRanking: () => void;
  onTrilhas: () => void;
  onSair: () => void;
}) {
  const pecasTotal = Object.values(perfil.armadura).filter(Boolean).length;

  return (
    <div className="tela-scroll">
      <style>{`
        @keyframes pulse-glow {
          0%,100% { text-shadow: 0 0 20px rgba(212,160,23,0.4), 0 2px 4px rgba(0,0,0,0.6); }
          50%      { text-shadow: 0 0 40px rgba(212,160,23,0.8), 0 2px 4px rgba(0,0,0,0.6); }
        }
        .titulo-hero { animation: pulse-glow 3s ease-in-out infinite; }
      `}</style>

      <main style={{ width: "100%", maxWidth: "450px", padding: "16px 20px" }}>
        {/* Header */}
        <div className="banner-faixa" style={{ borderRadius: "8px 8px 0 0", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0" }}>
          <button onClick={onPersonagem} title="Personalizar personagem"
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <SvgPersonagem tipo={perfil.personagem_tipo} cor={perfil.personagem_cor} size={32} />
            <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "12px", color: DS.douradoClaro, maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{perfil.nome}</span>
          </button>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#f0d898", display: "flex", alignItems: "center", gap: "3px" }}>
              <svg width="12" height="14" viewBox="0 0 12 14"><path d="M6 0 C4 3 1 5 1 8 a5 5 0 0 0 10 0 C11 5 8 3 6 0Z" fill="#f0a040"/><path d="M6 4 C5 6 3 7 3 9 a3 3 0 0 0 6 0 C9 7 7 6 6 4Z" fill="#ffe080"/></svg>
              {perfil.sequencia}
            </span>
            <span style={{ fontSize: "12px", color: "#f0a0a0", letterSpacing: "1px" }}>
              {"♥".repeat(vidas)}{"♡".repeat(VIDAS_MAX - vidas)}
            </span>
            <span style={{ fontSize: "13px", color: DS.douradoClaro, display: "flex", alignItems: "center", gap: "3px" }}>
              <svg width="13" height="13" viewBox="0 0 13 13"><circle cx="6.5" cy="6.5" r="6" fill={DS.douradoClaro} stroke={DS.douradoSombra} strokeWidth="1"/><circle cx="6.5" cy="6.5" r="3.5" fill={DS.douradoSombra} opacity="0.5"/><text x="6.5" y="9.5" textAnchor="middle" fontSize="6" fill={DS.douradoClaro} fontWeight="bold">D</text></svg>
              {perfil.talentos}
            </span>
            <BotaoBgm />
          </div>
        </div>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
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

        <div className="divisor-ornamentado"><span>✦</span></div>

        {/* Bíblia */}
        <div className="card-pergaminho" style={{ padding: "16px 20px", marginBottom: "12px" }}>
          <p style={{ fontFamily: "var(--font-cinzel)", fontSize: "13px", color: DS.titulo, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="16" viewBox="0 0 14 16"><rect x="2" y="1" width="10" height="14" rx="1.5" fill="#c8a860" stroke="#8a6030" strokeWidth="1"/><rect x="1" y="1" width="3" height="14" rx="1" fill="#a07840"/><line x1="5" y1="5" x2="11" y2="5" stroke="#8a6030" strokeWidth="0.8"/><line x1="5" y1="7.5" x2="11" y2="7.5" stroke="#8a6030" strokeWidth="0.8"/><line x1="5" y1="10" x2="11" y2="10" stroke="#8a6030" strokeWidth="0.8"/><line x1="5" y1="12.5" x2="9" y2="12.5" stroke="#8a6030" strokeWidth="0.8"/></svg>
            A Bíblia
          </p>
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
          <p style={{ fontFamily: "var(--font-cinzel)", fontSize: "13px", color: "#ffcccc", marginBottom: "6px" }}>Jornada de Jesus</p>
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
            <span>◆ {perfil.xp.toLocaleString()} XP</span>
            <span>Nv. {Math.floor(perfil.xp / 500) + 1}</span>
          </div>
          <div className="barra-progress-track">
            <div className="barra-progress-fill" style={{ width: `${(perfil.xp % 500) / 5}%` }} />
          </div>
        </div>

        <SlotAnuncio altura={70} label="banner" />

        {/* Nav */}
        <div className="banner-faixa" style={{ borderRadius: "0 0 8px 8px", padding: "8px 0", display: "flex", justifyContent: "space-around" }}>
          {([
            { icon: <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 3 L3 10 L3 21 L9 21 L9 15 L15 15 L15 21 L21 21 L21 10 Z" fill={DS.douradoClaro} stroke={DS.douradoSombra} strokeWidth="0.8"/><rect x="9" y="15" width="6" height="6" fill={DS.douradoSombra}/></svg>, label: "Início", action: () => {} },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24"><rect x="3" y="4" width="12" height="16" rx="1.5" fill={DS.douradoClaro} stroke={DS.douradoSombra} strokeWidth="0.8"/><rect x="3" y="4" width="4" height="16" rx="1.5" fill={DS.douradoSombra} opacity="0.6"/><line x1="9" y1="8" x2="14" y2="8" stroke={DS.douradoSombra} strokeWidth="1"/><line x1="9" y1="11" x2="14" y2="11" stroke={DS.douradoSombra} strokeWidth="1"/><line x1="9" y1="14" x2="14" y2="14" stroke={DS.douradoSombra} strokeWidth="1"/><path d="M16 6 C18 6 21 7 21 10 C21 13 18 14 16 14" stroke={DS.douradoClaro} strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>, label: "Trilhas", action: onTrilhas },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2 L4 6 L4 13 C4 18 7.5 22 12 23 C16.5 22 20 18 20 13 L20 6 Z" fill={DS.douradoClaro} stroke={DS.douradoSombra} strokeWidth="0.8"/><path d="M12 7 L8 11 L10 13 L12 11 L16 8 Z" fill={DS.douradoSombra}/></svg>, label: "Armadura", action: onArmadura },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2 L14.5 8.5 L22 9.3 L16.5 14.2 L18.2 21.5 L12 17.8 L5.8 21.5 L7.5 14.2 L2 9.3 L9.5 8.5 Z" fill={DS.douradoClaro} stroke={DS.douradoSombra} strokeWidth="0.8"/><rect x="10" y="19" width="4" height="4" rx="1" fill={DS.douradoSombra}/><rect x="8" y="22" width="8" height="2" rx="1" fill={DS.douradoSombra}/></svg>, label: "Ranking", action: onRanking },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24"><path d="M10 12 L18 12 M18 12 L14 8 M18 12 L14 16" stroke={DS.douradoClaro} strokeWidth="2" strokeLinecap="round"/><path d="M14 5 L5 5 L5 19 L14 19" stroke={DS.douradoClaro} strokeWidth="2" strokeLinecap="round" fill="none"/></svg>, label: "Sair", action: onSair },
          ] as { icon: React.ReactNode; label: string; action: () => void }[]).map(nav => (
            <button key={nav.label} onClick={nav.action}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "4px 8px" }}>
              {nav.icon}
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

  const primeiroNaoCompleto = capitulos.findIndex((cap, i) => !progressoCompleto.has(`${trilha}_${cap.id}`));
  const idxAtual = primeiroNaoCompleto === -1 ? capitulos.length : primeiroNaoCompleto;

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #1a1208 0%, #2a1c08 40%, #1a1208 100%)" }}>
      <style>{`
        @keyframes mapa-pulse { 0%,100%{box-shadow:0 0 20px rgba(0,200,255,0.5),0 4px 12px rgba(0,0,0,0.5)} 50%{box-shadow:0 0 40px rgba(0,200,255,0.9),0 4px 12px rgba(0,0,0,0.5)} }
        .cap-atual { animation: mapa-pulse 2s ease-in-out infinite; }
      `}</style>
      {/* Header */}
      <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px", zIndex: 10, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
        <button onClick={onVoltar} style={{ background: "none", border: "none", color: DS.douradoClaro, fontSize: "20px", cursor: "pointer", padding: "4px 8px" }}>←</button>
        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "16px", color: DS.douradoClaro, fontWeight: "700" }}>{titulo}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "14px", alignItems: "center" }}>
          <span style={{ fontSize: "14px", color: "#f0a0a0", letterSpacing: "2px" }}>
            {"♥".repeat(vidas)}{"♡".repeat(VIDAS_MAX - vidas)}
          </span>
          <span style={{ fontSize: "13px", color: DS.douradoClaro, display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6.5" fill={DS.douradoClaro} stroke={DS.douradoSombra} strokeWidth="1"/><text x="7" y="10.5" textAnchor="middle" fontSize="7" fill={DS.douradoSombra} fontWeight="bold">D</text></svg>
            {perfil.talentos}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 60px", position: "relative" }}>
        {/* Personagem */}
        <div style={{ textAlign: "center", marginBottom: "12px" }}>
          <SvgPersonagem tipo={perfil.personagem_tipo} cor={perfil.personagem_cor} size={72} />
        </div>

        {/* Caminho */}
        <div style={{ position: "relative", paddingBottom: "20px" }}>
          {/* Linha do caminho — espessa com gradiente */}
          <div style={{
            position: "absolute", left: "50%", top: "10px", bottom: "10px",
            width: "8px", marginLeft: "-4px",
            background: `linear-gradient(180deg, ${DS.douradoClaro} 0%, ${DS.douradoSombra} 60%, #3a2808 100%)`,
            borderRadius: "4px", opacity: 0.5,
          }} />

          {capitulos.map((cap, idx) => {
            const chave = `${trilha}_${cap.id}`;
            const completo = progressoCompleto.has(chave);
            const bloqueado = idx > 0 && !progressoCompleto.has(`${trilha}_${capitulos[idx - 1].id}`);
            const atual = idx === idxAtual;
            const lado = idx % 2 === 0 ? "left" : "right";

            let bg, borda, glow;
            if (completo) {
              bg = `linear-gradient(145deg, ${DS.douradoClaro}, ${DS.douradoSombra})`;
              borda = DS.douradoClaro;
              glow = `0 0 20px rgba(212,160,20,0.7), 0 4px 10px rgba(0,0,0,0.5)`;
            } else if (atual) {
              bg = `linear-gradient(145deg, #00c8ff, #0060a0)`;
              borda = "#00c8ff";
              glow = `0 0 20px rgba(0,200,255,0.6), 0 4px 10px rgba(0,0,0,0.5)`;
            } else if (bloqueado) {
              bg = `linear-gradient(145deg, #2a2018, #1a1208)`;
              borda = "#3a2818";
              glow = `0 2px 6px rgba(0,0,0,0.5)`;
            } else {
              bg = `linear-gradient(145deg, #fdf6e3, #c8a860)`;
              borda = DS.borda;
              glow = `0 3px 10px rgba(0,0,0,0.3)`;
            }

            return (
              <div key={cap.id} style={{
                display: "flex",
                flexDirection: lado === "left" ? "row" : "row-reverse",
                alignItems: "center", gap: "12px",
                marginBottom: "28px", position: "relative",
              }}>
                {/* Info */}
                <div style={{ flex: 1, textAlign: lado === "left" ? "right" : "left", opacity: bloqueado ? 0.4 : 1 }}>
                  <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "12px", color: completo ? DS.douradoClaro : atual ? "#00c8ff" : "#c8b890", fontWeight: "700" }}>{cap.titulo}</div>
                  {completo && <div style={{ fontSize: "10px", color: DS.douradoClaro, marginTop: "2px" }}>✓ Completo</div>}
                  {atual && <div style={{ fontSize: "10px", color: "#00c8ff", fontFamily: "var(--font-cinzel)", fontWeight: "700", marginTop: "2px" }}>JOGAR</div>}
                </div>

                {/* Botão capítulo + anel de etapas */}
                <div style={{ position: "relative", width: "76px", height: "76px", flexShrink: 0 }}>
                  <button
                    disabled={bloqueado}
                    onClick={() => !bloqueado && onCapitulo(cap, idx)}
                    className={atual ? "cap-atual" : ""}
                    style={{
                      width: "76px", height: "76px", borderRadius: "50%",
                      background: bg, border: `3px solid ${borda}`, boxShadow: glow,
                      cursor: bloqueado ? "not-allowed" : "pointer", fontSize: "26px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "transform 0.15s", opacity: bloqueado ? 0.35 : 1,
                    }}>
                    {bloqueado ? "🔒" : cap.icone}
                  </button>
                  {!bloqueado && cap.etapas && cap.etapas.length > 0 && (
                    <AnelProgresso completas={progressoEtapas[`${trilha}_${cap.id}`] ?? 0} total={cap.etapas.length} />
                  )}
                </div>

                <div style={{ flex: 1, opacity: bloqueado ? 0.4 : 1 }} />
              </div>
            );
          })}
        </div>
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
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #1a1208 0%, #2a1c08 100%)" }}>
      <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
        <button onClick={onVoltar} style={{ background: "none", border: "none", color: DS.douradoClaro, fontSize: "20px", cursor: "pointer", padding: "4px 8px" }}>←</button>
        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "16px", color: DS.douradoClaro, fontWeight: "700" }}>{capitulo.titulo}</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {/* Capítulo info */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ position: "relative", display: "inline-block", width: "76px", height: "76px", marginBottom: "12px" }}>
            <div style={{
              width: "76px", height: "76px", borderRadius: "50%",
              background: `linear-gradient(145deg, ${DS.douradoClaro}, ${DS.douradoSombra})`,
              border: `3px solid ${DS.douradoClaro}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "28px",
              boxShadow: `0 0 20px rgba(212,160,20,0.5)`,
            }}>{capitulo.icone}</div>
            <AnelProgresso completas={progressoEtapas} total={etapas.length} />
          </div>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "20px", color: DS.douradoClaro, fontWeight: "700", marginTop: "8px" }}>{capitulo.titulo}</div>
          <div style={{ fontSize: "12px", color: DS.off, marginTop: "4px" }}>{capitulo.subtitulo}</div>
          <div style={{ fontSize: "12px", color: DS.dourado, marginTop: "8px", fontFamily: "var(--font-cinzel)" }}>
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
                  padding: "14px 18px", borderRadius: "12px",
                  cursor: bloqueada ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: "14px", textAlign: "left",
                  background: completa
                    ? `linear-gradient(145deg, ${DS.douradoClaro}, ${DS.douradoSombra})`
                    : atual ? `linear-gradient(145deg, #00c8ff, #0060a0)`
                    : `linear-gradient(145deg, #2a2018, #1a1208)`,
                  border: `2px solid ${completa ? DS.douradoClaro : atual ? "#00c8ff" : "#3a2818"}`,
                  boxShadow: atual ? `0 0 20px rgba(0,200,255,0.35)` : "none",
                  opacity: bloqueada ? 0.4 : 1,
                  transition: "all 0.15s",
                  width: "100%",
                }}>
                <div style={{
                  width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
                  background: "rgba(255,255,255,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-cinzel)", fontSize: "14px", fontWeight: "700",
                  color: completa ? DS.titulo : "white",
                }}>
                  {completa ? "✓" : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "13px", fontWeight: "700", color: completa ? DS.titulo : "white" }}>
                    Etapa {i + 1} — {nomes[i] ?? "Desafio"}
                  </div>
                  <div style={{ fontSize: "11px", color: completa ? DS.titulo : "rgba(255,255,255,0.6)", marginTop: "2px" }}>
                    {etapa.length} questões
                  </div>
                </div>
                {completa && (
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="9" fill={DS.douradoSombra}/>
                    <path d="M5 10 L8 13 L15 7" stroke={DS.douradoClaro} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                  </svg>
                )}
                {bloqueada && (
                  <svg width="16" height="20" viewBox="0 0 16 20">
                    <rect x="2" y="8" width="12" height="10" rx="2.5" fill="#2a1808" stroke="#4a3018" strokeWidth="1.5"/>
                    <path d="M4 8 V6 A4 4 0 0 1 12 6 V8" fill="none" stroke="#4a3018" strokeWidth="1.5"/>
                    <circle cx="8" cy="13" r="1.8" fill="#4a3018"/>
                  </svg>
                )}
                {atual && (
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <path d="M3 2 L12 7 L3 12 Z" fill="white"/>
                  </svg>
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
    <div style={{ position: "fixed", inset: 0, background: `linear-gradient(145deg,${DS.vermelhoEsc},#1a0808)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", padding: "32px" }}>
      <style>{`@keyframes rl { from{width:0%} to{width:100%} }`}</style>
      <svg width="64" height="64" viewBox="0 0 64 64" style={{ marginBottom: "0" }}>
        <circle cx="32" cy="32" r="28" fill="none" stroke="#ff8888" strokeWidth="5" strokeDasharray="120 30" strokeLinecap="round"/>
        <path d="M50 18 L56 12 M56 12 L56 22 M56 12 L46 12" stroke="#ff8888" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
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

  if (msgMotivacional) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", zIndex: 200 }}>
      <div className="card-pergaminho" style={{ padding: "32px 28px", maxWidth: "380px", width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>✦</div>
        <p style={{ fontFamily: "var(--font-garamond)", fontSize: "20px", color: DS.titulo, lineHeight: 1.7, fontStyle: "italic", marginBottom: "12px" }}>
          {msgMotivacional}
        </p>
        <p style={{ fontSize: "13px", color: DS.dourado, fontFamily: "var(--font-cinzel)", marginBottom: "24px" }}>{msgMotivacionalRef}</p>
        <button
          onClick={() => { setMsgMotivacional(null); setMsgMotivacionalRef(null); avancarProximo(); }}
          className="btn-medieval btn-dourado"
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
        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "11px", color: isReview ? "#ff8888" : DS.dourado, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
          {isReview ? <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7 C2 4 4 2 7 2 C10 2 12 4 12 7 C12 10 10 12 7 12 C4 12 2 10 2 7Z" fill="none" stroke="#ff8888" strokeWidth="1.5"/><path d="M5 5 L9 9 M9 5 L5 9" stroke="#ff8888" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 2 L7 0 M11.5 2.5 L13 1 M12 7 L14 7" stroke="#ff8888" strokeWidth="1" strokeLinecap="round"/></svg> : "✦"} {questaoAtual + 1}/{questoes.length}
        </span>
        <span style={{ fontSize: "12px", color: "#f0a0a0", letterSpacing: "1px" }}>{"♥".repeat(vidasRestantes)}{"♡".repeat(Math.max(0, VIDAS_MAX - vidasRestantes))}</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ background: isReview ? `linear-gradient(135deg,#7a1515,#4a0a0a)` : `linear-gradient(135deg,${DS.vermelho},${DS.vermelhoEsc})`, color: isReview ? "#ffaaaa" : "#ffcccc", fontSize: "11px", padding: "3px 10px", borderRadius: "12px", fontFamily: "var(--font-cinzel)", letterSpacing: "0.5px" }}>
            {isReview ? "↺ REVISÃO" : capitulo.titulo.toUpperCase()}
          </span>
          {xpGanho > 0 && <span style={{ fontSize: "11px", color: DS.dourado }}>+{xpGanho} XP</span>}
        </div>
        <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "20px", color: DS.titulo, marginBottom: "16px", lineHeight: 1.3 }}>{getTitulo(q)}</h2>
        {renderEnunciado()}
        {feedback && (
          <div style={{
            background: corFeedback,
            border: `2px solid ${bordaFeedback}`,
            borderLeft: `5px solid ${feedback.certa ? DS.verde : DS.vermelho}`,
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "14px",
          }}>
            <p style={{ fontFamily: "var(--font-cinzel)", fontSize: "14px", fontWeight: "700", color: feedback.certa ? DS.verde : DS.vermelho, marginBottom: "6px" }}>
              {feedback.certa ? "✓ Correto!" : "✗ Resposta errada"}
            </p>
            {!feedback.certa && opcoes[correta] && (
              <div style={{ background: DS.acerto, border: `1px solid ${DS.verde}`, borderRadius: "6px", padding: "8px 12px", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", color: DS.verde, fontFamily: "var(--font-cinzel)", fontWeight: "700" }}>RESPOSTA CORRETA</span>
                <p style={{ fontSize: "13px", color: DS.verde, fontWeight: "600", marginTop: "2px" }}>{opcoes[correta]}</p>
              </div>
            )}
            {feedback.explicacao ? (
              <p style={{ fontSize: "12px", color: DS.corpo, lineHeight: 1.6, borderTop: `1px solid ${bordaFeedback}`, paddingTop: "8px", marginTop: "4px" }}>
                {feedback.explicacao}
              </p>
            ) : !feedback.certa && (
              <p style={{ fontSize: "12px", color: DS.corpo, lineHeight: 1.6, fontStyle: "italic" }}>
                Não desanime — essa questão aparecerá novamente na revisão!
              </p>
            )}
          </div>
        )}
        {renderOpcoes()}
      </div>

      <div className="banner-faixa" style={{ padding: "12px 20px" }}>
        {!confirmada ? (
          <button onClick={() => { sfxClick(); confirmar(); }} disabled={!podeVerificar} className="btn-medieval btn-dourado" style={{ width: "100%", padding: "14px", fontSize: "14px", opacity: podeVerificar ? 1 : 0.5 }}>Verificar</button>
        ) : (
          <button onClick={() => { sfxClick(); proximo(); }} className="btn-medieval btn-dourado" style={{ width: "100%", padding: "14px", fontSize: "14px" }}>
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
              <div style={{ fontSize: "11px", color: DS.off }}>Talentos</div>
            </div>
          </div>

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

          <button onClick={() => setStep("ofensiva")} className="btn-medieval btn-dourado"
            style={{ width: "100%", padding: "13px", fontSize: "14px" }}>
            Ver Progresso →
          </button>
        </div>
        <SlotAnuncio altura={90} label="banner" />
      </main>
    </div>
  );

  if (step === "ofensiva") return (
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px", background: `linear-gradient(145deg, #1a0a00, #2a1200)` }}>
      <main style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
        <svg width="80" height="100" viewBox="0 0 80 100" style={{ marginBottom: "16px" }}>
          <path d="M40 5 C30 20 10 30 10 50 C10 72 23 90 40 95 C57 90 70 72 70 50 C70 30 50 20 40 5Z" fill="#ff6a00" opacity="0.9"/>
          <path d="M40 20 C33 32 20 40 20 55 C20 70 29 82 40 86 C51 82 60 70 60 55 C60 40 47 32 40 20Z" fill="#ffb800" opacity="0.85"/>
          <path d="M40 35 C36 43 28 48 28 58 C28 67 33 75 40 78 C47 75 52 67 52 58 C52 48 44 43 40 35Z" fill="#fff176" opacity="0.8"/>
        </svg>
        <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "28px", fontWeight: "900", color: "#ffb800", marginBottom: "8px", letterSpacing: "1px" }}>
          Ofensiva de {streakDias ?? 1} {(streakDias ?? 1) === 1 ? "dia" : "dias"}!
        </h2>
        <p style={{ color: "#ffddaa", fontSize: "15px", lineHeight: 1.6, marginBottom: "32px" }}>
          Continue assim! Cada dia dedicado fortalece sua fé e sabedoria.
        </p>
        <button onClick={() => setStep("arca")} className="btn-medieval btn-dourado"
          style={{ width: "100%", padding: "14px", fontSize: "14px", maxWidth: "360px" }}>
          Abrir Arca →
        </button>
      </main>
    </div>
  );

  if (step === "arca") return (
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px", background: `linear-gradient(145deg, #0a0806, #1a1204)` }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .float-arca { animation: float 2.4s ease-in-out infinite; }
      `}</style>
      <main style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
        <div className="float-arca" style={{ marginBottom: "20px" }}>
          <svg width="120" height="90" viewBox="0 0 120 90">
            <rect x="10" y="40" width="100" height="48" rx="6" fill="#8a5c20" stroke="#d4a017" strokeWidth="2"/>
            <rect x="10" y="40" width="100" height="12" rx="4" fill="#b87830" stroke="#d4a017" strokeWidth="1.5"/>
            <path d="M10 52 Q60 30 110 52" fill="#c88c30" stroke="#d4a017" strokeWidth="2"/>
            <rect x="20" y="54" width="25" height="28" rx="3" fill="#7a4c18" stroke="#b8860b" strokeWidth="1"/>
            <rect x="75" y="54" width="25" height="28" rx="3" fill="#7a4c18" stroke="#b8860b" strokeWidth="1"/>
            <rect x="50" y="56" width="20" height="26" rx="3" fill="#7a4c18" stroke="#b8860b" strokeWidth="1"/>
            <rect x="52" y="60" width="16" height="6" rx="2" fill="#d4a017" opacity="0.8"/>
            <circle cx="60" cy="63" r="3" fill="#ffcc00"/>
            <line x1="10" y1="52" x2="110" y2="52" stroke="#d4a017" strokeWidth="1.5"/>
            <rect x="5" y="56" width="8" height="26" rx="2" fill="#6a3c10" stroke="#b8860b" strokeWidth="1"/>
            <rect x="107" y="56" width="8" height="26" rx="2" fill="#6a3c10" stroke="#b8860b" strokeWidth="1"/>
          </svg>
        </div>
        <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "24px", fontWeight: "900", color: DS.douradoClaro, marginBottom: "8px", letterSpacing: "1px" }}>
          Arca Recompensa!
        </h2>
        <p style={{ color: DS.off, fontSize: "14px", marginBottom: "8px" }}>Recompensa acumulada:</p>
        <p style={{ fontFamily: "var(--font-cinzel)", fontSize: "32px", color: DS.douradoClaro, marginBottom: "28px", fontWeight: "900" }}>
          +{arcaBonus} talentos
        </p>
        <button onClick={() => setStep("fim")} style={{
          width: "100%", maxWidth: "360px", padding: "15px", fontSize: "15px",
          background: `linear-gradient(145deg, ${DS.douradoClaro}, ${DS.douradoSombra})`,
          border: `2px solid ${DS.douradoClaro}`, borderRadius: "8px", cursor: "pointer",
          fontFamily: "var(--font-cinzel)", fontWeight: "700", color: "#1a0a00",
          boxShadow: `0 0 20px rgba(212,160,20,0.5)`,
        }}>
          Abrir Arca
        </button>
      </main>
    </div>
  );

  // step === "fim"
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px", background: `linear-gradient(145deg, #1a1208, #2a1c08)` }}>
      <style>{`
        @keyframes sparkle { 0%,100%{opacity:0;transform:scale(0.5)} 50%{opacity:1;transform:scale(1.2)} }
        .sp1{animation:sparkle 1.2s ease-in-out infinite 0s}
        .sp2{animation:sparkle 1.2s ease-in-out infinite 0.4s}
        .sp3{animation:sparkle 1.2s ease-in-out infinite 0.8s}
      `}</style>
      <main style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
        <div style={{ position: "relative", display: "inline-block", marginBottom: "24px" }}>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "48px", fontWeight: "900", color: DS.douradoClaro, textShadow: `0 0 30px rgba(212,160,20,0.8)` }}>
            +{arcaBonus}
          </div>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "18px", color: DS.dourado }}>talentos</div>
          <div className="sp1" style={{ position: "absolute", top: "-10px", right: "-15px", fontSize: "20px", color: DS.douradoClaro }}>✦</div>
          <div className="sp2" style={{ position: "absolute", top: "10px", left: "-20px", fontSize: "16px", color: DS.douradoClaro }}>✦</div>
          <div className="sp3" style={{ position: "absolute", bottom: "-5px", right: "0px", fontSize: "14px", color: DS.douradoClaro }}>✦</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "360px", margin: "0 auto" }}>
          <button onClick={onReiniciar} className="btn-medieval btn-dourado"
            style={{ width: "100%", padding: "14px", fontSize: "14px" }}>
            Repetir
          </button>
          <button onClick={onVoltar} className="btn-medieval btn-escuro"
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
  const opcoes: { trilha: Trilha; titulo: string; sub: string; cor: string; corBorda: string }[] = [
    { trilha: "VT", titulo: "Velho Testamento", sub: "Gênesis ao Malaquias — 9 capítulos", cor: `linear-gradient(145deg, ${DS.bgCard}, #f0e4c0)`, corBorda: DS.douradoClaro },
    { trilha: "NT", titulo: "Novo Testamento", sub: "Mateus ao Apocalipse — 9 capítulos", cor: `linear-gradient(145deg, #e8f0f8, #d0e0f0)`, corBorda: "#6090c0" },
    { trilha: "JESUS", titulo: "Jornada de Jesus", sub: "Do nascimento à ressurreição — 7 capítulos", cor: `linear-gradient(145deg, ${DS.vermelhoEsc}, #3a0a0a)`, corBorda: "#c06060" },
  ];
  return (
    <div className="tela-scroll">
      <main style={{ width: "100%", maxWidth: "450px", padding: "16px 20px" }}>
        <div className="banner-faixa" style={{ borderRadius: "8px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <button onClick={onVoltar} style={{ background: "none", border: "none", color: DS.douradoClaro, fontSize: "20px", cursor: "pointer" }}>←</button>
          <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "16px", color: DS.douradoClaro, fontWeight: "700", letterSpacing: "1px" }}>Escolher Trilha</span>
        </div>
        {opcoes.map(o => (
          <button key={o.trilha} onClick={() => { sfxClick(); onEscolher(o.trilha); }}
            style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "0", marginBottom: "14px" }}>
            <div style={{ background: o.cor, border: `2px solid ${o.corBorda}`, borderRadius: "12px", padding: "20px 22px", textAlign: "left", boxShadow: `0 0 14px ${o.corBorda}44, 0 4px 10px rgba(0,0,0,0.3)`, transition: "transform 0.15s", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: o.corBorda, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 12px ${o.corBorda}88` }}>
                <svg width="28" height="28" viewBox="0 0 24 24"><rect x="3" y="4" width="12" height="16" rx="1.5" fill="white" opacity="0.9"/><rect x="3" y="4" width="4" height="16" rx="1.5" fill="rgba(0,0,0,0.2)"/><line x1="9" y1="8" x2="14" y2="8" stroke="rgba(0,0,0,0.3)" strokeWidth="1"/><line x1="9" y1="11" x2="14" y2="11" stroke="rgba(0,0,0,0.3)" strokeWidth="1"/><line x1="9" y1="14" x2="14" y2="14" stroke="rgba(0,0,0,0.3)" strokeWidth="1"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "16px", fontWeight: "700", color: o.trilha === "JESUS" ? "#ffcccc" : DS.titulo, marginBottom: "4px" }}>{o.titulo}</div>
                <div style={{ fontSize: "12px", color: o.trilha === "JESUS" ? "#ffaaaa" : DS.off }}>{o.sub}</div>
              </div>
              <svg width="20" height="20" viewBox="0 0 20 20"><path d="M7 4 L13 10 L7 16" stroke={o.trilha === "JESUS" ? "#ffcccc" : DS.douradoClaro} strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
            </div>
          </button>
        ))}
      </main>
    </div>
  );
}

// ── Tela RANKING ──────────────────────────────────────────────────
function TelaRanking({ perfil, onVoltar }: { perfil: Perfil; onVoltar: () => void }) {
  const jogadores = [
    { pos: 1, nome: "Guerreiro da Fé", xp: 2800, icone: "⚔️" },
    { pos: 2, nome: "Servo Fiel", xp: 1950, icone: "📖" },
    { pos: 3, nome: perfil.nome, xp: perfil.xp, icone: "✦", atual: true },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: DS.bg }}>
      {/* Header */}
      <div className="banner-faixa" style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: "12px", zIndex: 10 }}>
        <button onClick={onVoltar} style={{ background: "none", border: "none", color: DS.douradoClaro, fontSize: "20px", cursor: "pointer", padding: "4px 8px" }}>←</button>
        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "18px", color: DS.douradoClaro, fontWeight: "700", letterSpacing: "2px" }}>
          Ranking
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {/* Perfil atual em destaque */}
        <div className="card-pergaminho" style={{ padding: "16px 20px", marginBottom: "20px", textAlign: "center", border: `1.5px solid ${DS.douradoClaro}`, boxShadow: `0 0 12px rgba(212,160,20,0.25)` }}>
          <SvgPersonagem tipo={perfil.personagem_tipo} cor={perfil.personagem_cor} size={64} />
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "16px", fontWeight: "700", color: DS.titulo, marginTop: "8px" }}>{perfil.nome}</div>
          <div style={{ fontSize: "12px", color: DS.off, marginTop: "4px" }}>Posição: aguardando mais jogadores</div>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "14px", color: DS.douradoClaro, marginTop: "6px" }}>{perfil.xp.toLocaleString()} XP</div>
        </div>

        {/* Lista */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {jogadores.map((j) => (
            <div key={j.pos} className="card-pergaminho" style={{
              padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px",
              border: j.atual ? `1.5px solid ${DS.douradoClaro}` : undefined,
              background: j.atual ? `linear-gradient(145deg, #fdf6e3, #f0e4c0)` : undefined,
            }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                background: j.pos === 1 ? `linear-gradient(145deg, #ffd700, #b8860b)` : j.pos === 2 ? `linear-gradient(145deg, #c0c0c0, #808080)` : `linear-gradient(145deg, #cd7f32, #8b4513)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-cinzel)", fontSize: "14px", fontWeight: "700", color: "white",
              }}>
                {j.pos}
              </div>
              <div style={{ fontSize: "20px" }}>{j.icone}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "13px", fontWeight: "700", color: DS.titulo }}>{j.nome}</div>
                <div style={{ fontSize: "12px", color: DS.dourado, marginTop: "2px" }}>{j.xp.toLocaleString()} XP</div>
              </div>
              {j.atual && <span style={{ fontSize: "11px", color: DS.douradoClaro, fontFamily: "var(--font-cinzel)" }}>Você</span>}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", padding: "16px", color: DS.off, fontSize: "13px", fontStyle: "italic" }}>
          Mais jogadores chegando em breve!
        </div>

        <SlotAnuncio altura={70} label="banner" />
      </div>
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
  const [progressoEtapas, setProgressoEtapas] = useState<Record<string, number>>({});
  const [etapaAtual, setEtapaAtual] = useState(0);
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

  // Desbloquear audio no primeiro clique/toque
  useEffect(() => {
    const unlock = () => { import("@/lib/sounds").then(m => m.sfxClick()); };
    document.addEventListener("touchstart", unlock, { once: true });
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
      onRanking={() => setTela("ranking")}
      onTrilhas={() => setTela("trilhas")}
      onSair={handleSair}
    />
  );

  if (tela === "trilhas") return (
    <TelaTrilhas
      onEscolher={t => { setTrilha(t); setTela("mapa"); }}
      onVoltar={() => setTela("home")}
    />
  );

  if (tela === "ranking") return (
    <TelaRanking perfil={perfil} onVoltar={() => setTela("home")} />
  );

  if (tela === "mapa") return (
    <TelaMapa
      trilha={trilha} perfil={perfil} vidas={vidasAtivas}
      progressoCompleto={progressoIds}
      progressoEtapas={progressoEtapas}
      onCapitulo={(cap) => {
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

  if (tela === "etapas" && capitulo) return (
    <TelaEtapas
      capitulo={capitulo}
      trilha={trilha}
      progressoEtapas={progressoEtapas[`${trilha}_${capitulo.id}`] ?? 0}
      onEtapa={(idx) => { setEtapaAtual(idx); setTela("jogo"); }}
      onVoltar={() => setTela("mapa")}
    />
  );

  if (tela === "jogo" && capitulo) return (
    <TelaQuiz
      capitulo={capitulo} trilha={trilha} perfil={perfil} vidas={vidasAtivas}
      questoes={capitulo.etapas ? capitulo.etapas[etapaAtual] : undefined}
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
      streakDias={perfil.sequencia}
      talentosGanho={resultadoState.talentos}
      novasPecas={resultadoState.novasPecas}
      onReiniciar={() => capitulo?.etapas ? setTela("etapas") : setTela("jogo")}
      onVoltar={() => setTela("mapa")}
    />
  );

  return null;
}
