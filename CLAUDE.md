@AGENTS.md

# Discypulo — Contexto do Projeto

App de gamificação bíblica estilo Duolingo. Stack: Next.js 16 (App Router, `"use client"`), React 19, Supabase (auth + banco), TypeScript. Todo o app vive em um único arquivo: `src/app/page.tsx` (~2500 linhas).

## Arquitetura resumida

- **Navegação**: estado `tela` (useState) com renderização condicional — não usa rotas do Next.js
- **Banco**: Supabase com RLS. Tabelas: `perfis`, `progresso`, `missoes_diarias`
- **Estado local**: localStorage para etapas (`gq_etapas`) e missões (`gq_missoes`)
- **Tema**: medieval/pergaminho — tokens no objeto `DS` no topo de `page.tsx`
- **Sons**: Web Audio API procedural em `src/lib/sounds.ts` (sem arquivos de áudio)
- **Pontuação**: Maná — nome de exibição do XP (variável interna continua `xp`). Nível = xp / 500 + 1. Talentos = moeda. Lógica em `src/lib/gameEngine.ts`

## Telas disponíveis (`type Tela`)

`login` → `cadastro` → `criar_personagem` → `home` → `trilhas` → `mapa` → `etapas` → `jogo` → `resultado` → `armadura` → `ranking` → `missoes` → `admin`

## Emails admin

`rafaalexander2@gmail.com` e `santosaline2802@gmail.com` — têm acesso ao Painel Admin (reset de dados de beta testers).

---

## Histórico de atualizações

### [2026-05-17] Conclusão de missão + Ranking real + Painel Admin

**Missões diárias**
- Após registrar reflexão: tela animada de "Missão Concluída!" com XP, Talentos e versículo bíblico
- Botão "Ir para Início ✦" retorna ao home após conclusão

**Tela inicial (TelaHome)**
- Cartão "Missão de Hoje" com título do desafio do dia e atalho direto
- Badge vermelho (🔴) no ícone Missões da nav quando a missão do dia está pendente
- Barra de XP melhorada: mostra quantos XP faltam para o próximo nível
- Botão "⚙ Painel Admin" visível apenas para os emails admin

**Ranking**
- Substituído dado estático por query real no Supabase (`perfis` ordenado por XP)
- Mostra posição do usuário logado, streak (🔥) e total de jogadores

**Painel Admin** (`TelaAdmin`)
- Lista todos os beta testers com XP, Talentos, sequência e data de cadastro
- Reset individual (dois toques para confirmar) ou reset geral
- Badge "ADMIN" nos cards dos usuários administradores

**Infraestrutura**
- `gameEngine.ts`: adicionado `carregarRanking`, `carregarTodosPerfis`, `resetarPerfilAdmin`, `deletarProgressoAdmin`
- `supabase-admin-migration.sql`: políticas RLS para ranking público e operações admin — **já executado no Supabase**

---

### [2026-05-17] Monetização — Telas de Planos e Bloqueio por Vidas

**Telas novas**
- `TelaPlanos` — tela de planos (Grátis · Premium Mensal R$14,90 · Premium Anual R$89,90). Botão "Começar Premium" exibe aviso "Em breve" — pagamento ainda não integrado
- `TelaSemVidas` — bloqueio estilo Duolingo quando vidas chegam a 0 durante quiz; opções: esperar recarga, ir para TelaPlanos ou voltar ao mapa

**Home**
- Banner "Discípulo Premium" substituiu o SlotAnuncio (placeholder de anúncio) no home
- TelaPlanos acessível pelo banner e pela tela de vidas zeradas

**Preços atuais** (alterar diretamente no componente `TelaPlanos`):
- Mensal: R$ 14,90/mês
- Anual: R$ 89,90/ano (≈ R$ 7,49/mês)

**TODO**: Integrar gateway de pagamento (Stripe recomendado) e adicionar campo `premium` na tabela `perfis`

---

### [2026-05-17] XP renomeado para Maná

- Toda a interface agora exibe "Maná" no lugar de "XP" (ex: "+80 Maná", "faltam 120 Maná para o próximo nível")
- Variáveis internas no código continuam como `xp`, `xpGanho` etc — só o rótulo visual mudou
- Nome do app ainda a definir (candidatos: Elyon, Hagios, Kairos, Pneuma…)

---

## Pendências / próximos passos conhecidos

- Modo Arena (PvP) referenciado na Couraça da Justiça — não implementado ainda
- `SlotAnuncio` é placeholder — integração de anúncios não feita
- Missões diárias não persistem no Supabase (tabela `missoes_diarias` existe mas não é usada — dados ficam só no localStorage)
