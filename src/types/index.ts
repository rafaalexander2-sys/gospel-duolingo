export type TipoQuestao =
  | "fato_fake"
  | "multipla_escolha"
  | "completar_versiculo"
  | "quem_disse"
  | "onde_aconteceu"
  | "ordenar_eventos"
  | "qual_numero"
  | "qual_livro"
  | "personagem_misterio"
  | "verdade_mito";

export interface QuestaoBase {
  tipo: TipoQuestao;
  personagem: string;
  explicacao: string;
}

export interface QuestaoFatoFake extends QuestaoBase {
  tipo: "fato_fake";
  afirmacao: string;
  fato: boolean;
}

export interface QuestaoMultiplaEscolha extends QuestaoBase {
  tipo: "multipla_escolha";
  enunciado: string;
  opcoes: string[];
  resposta: number; // índice da opção correta
}

export interface QuestaoCompletarVersiculo extends QuestaoBase {
  tipo: "completar_versiculo";
  versiculo: string;       // texto com ___ no lugar da lacuna
  referencia: string;      // ex: "Gênesis 1:1"
  opcoes: string[];
  resposta: number;
}

export interface QuestaoQuemDisse extends QuestaoBase {
  tipo: "quem_disse";
  frase: string;
  opcoes: string[];
  resposta: number;
}

export interface QuestaoOndeAconteceu extends QuestaoBase {
  tipo: "onde_aconteceu";
  evento: string;
  opcoes: string[];
  resposta: number;
}

export interface QuestaoOrdenarEventos extends QuestaoBase {
  tipo: "ordenar_eventos";
  enunciado: string;
  eventos: string[];
  ordemCorreta: number[]; // índices na ordem certa
}

export interface QuestaoQualNumero extends QuestaoBase {
  tipo: "qual_numero";
  enunciado: string;
  opcoes: string[];
  resposta: number;
}

export interface QuestaoQualLivro extends QuestaoBase {
  tipo: "qual_livro";
  enunciado: string;
  opcoes: string[];
  resposta: number;
}

export interface QuestaoPersonagemMisterio extends QuestaoBase {
  tipo: "personagem_misterio";
  pistas: string[]; // reveladas uma a uma
  opcoes: string[];
  resposta: number;
}

export interface QuestaoVerdadeMito extends QuestaoBase {
  tipo: "verdade_mito";
  mito: string;     // a crença popular
  fato: boolean;    // true = é verdade, false = é mito
}

export type Questao =
  | QuestaoFatoFake
  | QuestaoMultiplaEscolha
  | QuestaoCompletarVersiculo
  | QuestaoQuemDisse
  | QuestaoOndeAconteceu
  | QuestaoOrdenarEventos
  | QuestaoQualNumero
  | QuestaoQualLivro
  | QuestaoPersonagemMisterio
  | QuestaoVerdadeMito;

export interface Capitulo {
  id: number;
  titulo: string;
  subtitulo: string;
  icone: string;
  livros: string[];
  perguntas: Questao[];
  etapas?: Questao[][];   // 5 grupos de questões por dificuldade crescente
}

export interface Trilha {
  id: string;
  titulo: string;
  testamento: "VT" | "NT" | "JESUS";
  capitulos: Capitulo[];
}
