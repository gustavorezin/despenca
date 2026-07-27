# Product Specification

**Versão:** v0.3.0 — 2026-07-14

---

## 1. Princípios

- **Baixo atrito.** Cada ação frequente deve exigir o mínimo de toques e digitação possível.
- **Utilidade acima da precisão.** Estimativas boas e acionáveis valem mais que dados perfeitos.
- **Aprendizado contínuo.** O sistema melhora com o uso sem exigir configuração extra do usuário.
- **Transparência.** Toda estimativa ou Sugestão deve ser explicável quando o usuário quiser entender.
- **IA como assistente.** O sistema propõe; o usuário decide. Nenhuma ação é irreversível ou forçada.

---

## 2. Vocabulário canônico

Todo documento interno, ADR, microcópia e código usa exclusivamente os termos abaixo. (ver [ADR-011](./adr/ADR-011-vocabulario-canonico.md))

| Termo | Significado | Substitui |
|---|---|---|
| **Lista** | Lista de compras corrente — Sugestões da IA e itens manuais na mesma superfície | "lista automática", "recomendações" |
| **Despensa** | Estoque estimado da Casa | "inventário", "estoque" |
| **Item** | Produto genérico normalizado (ex.: "Leite Integral") | "produto", "item de lista" |
| **Compra** | Evento de abastecimento (uma ida ao mercado) com data e lista de Itens | "compra", "registro", "nota" |
| **Casa** | Container de dados ao qual o usuário pertence | "residência", "lar", "conta familiar" |
| **Sugestão** | Item proposto pela IA, identificado visualmente com badge | "recomendação", "sugestão automática" |

O usuário nunca vê os termos "inventário", "normalização" ou percentuais de confiança.

---

## 3. Regras de negócio

### 3.1 Casa

- Cada usuário pertence a uma Casa.
- Todos os dados (Itens, Compras, Despensa, Lista) vivem dentro da Casa, não do usuário.
- O nome da Casa é coletado no onboarding e é o único dado obrigatório além da autenticação. (ver [ADR-009](./adr/ADR-009-onboarding-3-telas.md))
- Pode existir mais de um morador por Casa, mas a funcionalidade de multi-morador (convite, permissões, resolução de conflitos) é F5. O modelo de dados prevê Casa desde F0 para garantir migração sem retrabalho. (ver [ADR-010](./adr/ADR-010-multi-morador-fora-do-mvp.md))

### 3.2 Itens

- Item representa um produto genérico. A marca não diferencia um Item.
- O sistema normaliza nomes semelhantes para o mesmo Item canônico. Exemplo: "Leite Tirol" e "Leite Parmalat" viram "Leite Integral".
- Itens são compartilhados dentro da Casa — não existe catálogo global.
- A categoria do Item é usada pelo Modo Mercado [F1] para reorganização por prateleira. No F0, categorização automática por IA não é requisito — o back-end pode usar categorias manuais ou fixas.
- [F1] Categoria e unidade do Item podem ser definidas durante o registro de Compra ou pelo bottom sheet de ajuste da Despensa, a partir de listas fixas; ambas são opcionais. Item sem categoria aparece no grupo "Sem categoria". (ver [ADR-022](./adr/ADR-022-categoria-e-unidade-no-chip-do-registro.md))

### 3.3 Compras

- Uma Compra é um evento de abastecimento: tem data, lista de Itens com quantidade, e opcionalmente valor total.
- [F1] A Compra pode ter uma descrição — texto livre opcional (ex.: "Mercado Extra", "Janta do dia dos namorados") — exibida no histórico. (ver [ADR-021](./adr/ADR-021-descricao-e-data-no-registro.md))
- [F1] A data da Compra é editável no registro: default hoje, retroativa permitida, futura proibida. (ver [ADR-021](./adr/ADR-021-descricao-e-data-no-registro.md))
- [F1] Compras podem ser editadas (descrição, data, itens) e excluídas com confirmação; a Despensa é rederivada por Item afetado e as Sugestões são recalculadas. (ver [ADR-023](./adr/ADR-023-edicao-e-exclusao-de-compra.md))
- Toda Compra pode ser registrada. [F0] Registro exclusivamente manual com autocomplete agressivo. (ver [ADR-005](./adr/ADR-005-captura-manual-com-autocomplete.md))
- [F1] A tela de registro ganha a opção "Marcar da lista" como segunda via. (ver [ADR-017](./adr/ADR-017-marcar-da-lista-na-fase-1.md))
- [F3] A tela de registro ganha a opção "Foto da nota fiscal" com OCR e tela de revisão. (ver [ADR-014](./adr/ADR-014-foto-da-nota-na-fase-3.md))
- Registrar uma Compra é o fluxo fundacional do produto: sem Compras, não há dados, não há aprendizado, não há Sugestões.

### 3.4 Despensa (estoque estimado)

- A Despensa mantém uma estimativa da quantidade disponível de cada Item na Casa.
- A estimativa nunca é exata — é calculada a partir das Compras registradas e ajustada por proxies de consumo. (ver [ADR-013](./adr/ADR-013-aprendizado-por-proxies.md))
- Cada Item na Despensa tem um nível de confiança da estimativa, exposto ao usuário como semáforo: verde (confiança alta), amarelo (confiança média), vermelho (confiança baixa). Nenhum número percentual aparece na interface. (ver [ADR-004](./adr/ADR-004-confianca-como-semaforo.md))
- O ajuste da Despensa pode ser feito a qualquer momento via bottom sheet com três opções predefinidas — **Tem** (confirma a estimativa), **Pouco** (reduz quantidade e move Item para a Lista), **Acabou** (zera e promove ao topo da Lista) — mais um **Ajuste preciso** com seletor numérico para quem precisa de granularidade. (ver [ADR-007](./adr/ADR-007-ajuste-de-despensa-3-opcoes.md))

### 3.5 Lista

- A Lista unifica Sugestões da IA e Itens adicionados manualmente em uma única superfície. Não existem duas superfícies separadas para "automático" e "manual". (ver [ADR-003](./adr/ADR-003-lista-absorve-recomendacoes.md))
- Dentro da Lista, os Itens são agrupados pelo motivo da Sugestão (ex.: "Provavelmente acabando", "Recorrentes", "Você adicionou"), não por categoria de produto. (ver [ADR-006](./adr/ADR-006-sugestoes-agrupadas-por-motivo.md))
- A Lista é a tela principal do aplicativo — a aba ativa ao abrir o app. (ver [ADR-002](./adr/ADR-002-home-eh-a-lista.md))

### 3.6 Sugestões da IA

- Toda Sugestão é identificada visualmente com badge.
- Toda Sugestão é editável. O **aceite é implícito** — não há botão "aceitar": editar a quantidade é o gesto de aceite, e protege a Sugestão (e a quantidade escolhida) do recálculo automático. (ver [ADR-026](./adr/ADR-026-aceite-implicito-da-sugestao.md))
- Toda Sugestão tem explicação acessível com 1 toque — nunca inline, sempre em bottom sheet sob demanda. (ver [ADR-008](./adr/ADR-008-explicacao-em-tap-to-expand.md))
- [F1] O usuário pode dispensar uma Sugestão via swipe (inclusive uma já aceita) — esse gesto é um sinal negativo de aprendizado.
- Correções feitas pelo usuário alimentam o aprendizado futuro do sistema.

### 3.7 Ajuste de despensa

- Ver seção 3.4. O ajuste rápido é a ação principal para recalibrar a Despensa sem precisar registrar uma Compra completa.
- "Tem" funciona como confirmação de confiança: eleva o semáforo do Item.
- "Pouco" e "Acabou" são proxies de consumo e afetam as Sugestões geradas. (ver [ADR-013](./adr/ADR-013-aprendizado-por-proxies.md))

### 3.8 Consumo (opcional)

- O sistema funciona mesmo sem registros de consumo explícitos.
- Consumo é inferido por proxies implícitos: Compra registrada sinaliza que o Item foi consumido no intervalo; ajuste de Despensa sinaliza consumo acelerado ou lento; Sugestão dispensada [F1] sinaliza discordância da estimativa. (ver [ADR-013](./adr/ADR-013-aprendizado-por-proxies.md))
- Registro explícito de consumo (ex.: "usei hoje") não é uma funcionalidade do roadmap atual.

### 3.9 Aprendizado por proxies

- O sistema aprende frequência, recorrência e padrões de consumo a partir das Compras e ajustes — sem exigir que o usuário alimente dados extras.
- [F0] Aprendizado por contagem e frequência de Compra (lógica determinística, sem ML pesado).
- [F2] Aprendizado de frequência por Item, detecção de mudança de hábito, sazonalidade básica.
- A qualidade das Sugestões melhora organicamente com o uso: quanto mais Compras registradas, mais precisas as Sugestões. (ver [ADR-013](./adr/ADR-013-aprendizado-por-proxies.md))

### 3.10 Casos não cobertos (pós-MVP)

- Compras fora do padrão (ex.: estocar em promoção) podem gerar Sugestões incorretas no período seguinte — a detecção de "compra atípica" é F2.
- Mudanças de hábito demoram para ser detectadas em F0; o sistema pode sugerir Itens que o usuário parou de consumir até o próximo ciclo de aprendizado (F2).
- Sazonalidade (ex.: cerveja no verão) não é detectada em F0.

---

## 4. Requisitos funcionais por fase

Ver tabela cross-referenciada com [ADR-019](./adr/ADR-019-faseamento.md). Regra inviolável: cada fase entrega valor completo sem depender de fases posteriores.

### 4.1 Fase 0 — MVP

| Funcionalidade | Regra / nota |
|---|---|
| Autenticação (email + Google) | — |
| Onboarding 3 telas | Nome da Casa obrigatório; "pular" é opção legítima (ADR-009) |
| Lista (home) | Sugestões por recorrência simples + itens manuais, agrupados por motivo (ADR-002, ADR-003, ADR-006) |
| Despensa com semáforo de confiança | Estimativa + verde/amarelo/vermelho (ADR-004) |
| Registrar Compra manual com autocomplete | Autocomplete a partir do 2º caractere; chip com qty editável (ADR-005) |
| Ajuste rápido de Despensa | Tem / Pouco / Acabou + Ajuste preciso (ADR-007) |
| Explicação da Sugestão em bottom sheet | 1 toque; nunca bloqueia ação (ADR-008) |
| Histórico de Compras | Lista + detalhe da Compra |
| Estado vazio sempre com CTA | Sem telas brancas em nenhuma área (ADR-012) |
| Conta básica | Perfil, dados da Casa, sair |
| Online only | Sem suporte a offline |
| Aprendizado por contagem e frequência | Lógica determinística; sem ML pesado (ADR-013) |

**Critério de pronto do F0:** A persona Camila consegue, em 5 minutos, registrar a primeira Compra, ver a Despensa preenchida, voltar 2 semanas depois e ver ao menos 3 Sugestões na Lista — todas com explicação textual.

### 4.2 Fase 1 — Atrito do dia a dia

| Funcionalidade | Regra / nota |
|---|---|
| Registro de Compra completo | Descrição livre e data editável (ADR-021); categoria/unidade no chip (ADR-022); editar/excluir Compra com rederivação (ADR-023) |
| Dicas de uso | Página estática na Conta; sem tour guiado (ADR-025) |
| Modo Mercado | Fullscreen modal; Itens agrupados por categoria; checks grandes (ADR-015) |
| Notificações push | **Adiada para fase posterior (ADR-024).** Quando entrar: máximo 1 por dia por Casa; deep-link direto para a Lista (ADR-016) |
| "Marcar da lista" como 2ª via de registro | Disponível quando a Lista tem ao menos 1 Item (ADR-017) |
| Swipe para dispensar Sugestão | Sinal negativo de aprendizado (ADR-013) |
| Aceite implícito da Sugestão | Editar a quantidade aceita e protege do recálculo; sem botão "aceitar" (ADR-026) |

**Critério de pronto do F1:** Camila, com a Lista alimentada pelo uso do F0, consegue: registrar uma Compra de ontem com nome ("Mercado Extra") e data retroativa; corrigir uma Compra errada e ver a Despensa se ajustar sozinha; fazer uma ida ao mercado inteira pelo Modo Mercado — marcar os Itens por prateleira e registrar a Compra pré-preenchida sem redigitar nada; e dispensar com um deslize uma Sugestão que não faz sentido, sem que ela volte antes da próxima Compra.

### 4.3 Fase 2 — IA mais inteligente

| Funcionalidade | Nota |
|---|---|
| Aprendizado de frequência por Item | Sugestões por intervalo real, não só contagem |
| Detecção de mudança de hábito | "Consumo aumentou / diminuiu" |
| Sazonalidade básica | Ex.: itens de verão |
| Explicações mais ricas | Faixas de confiança em texto; sem número percentual |

### 4.4 Fase 3 — Captura por imagem

| Funcionalidade | Nota |
|---|---|
| Foto da nota fiscal com OCR | Via "Foto da nota" na tela de registro (ADR-014) |
| Tela de revisão de itens identificados | Itens confirmados / precisam atenção; obrigatória antes de confirmar |
| Normalização de itens de NF-e | Aprende com correções manuais do usuário |

### 4.5 Fase 4 — Resiliência

| Funcionalidade | Nota |
|---|---|
| Offline para registrar Compra manual e ajustar Despensa | Fila de sync automática (ADR-018) |
| Resolução de conflitos | "Último a sincronizar vence" com log visível |
| Indicador visual de conectividade | Discreto; não alarma |

### 4.6 Fase 5 — Colaboração

| Funcionalidade | Nota |
|---|---|
| Multi-morador na mesma Casa | Convites por link ou email (ADR-010) |
| Atribuição opcional de quem registrou | Não obrigatório |
| Resolução de conflito de escrita simultânea | Necessário para dados consistentes |

### 4.7 Fase 6+ — Visão longa

Itens do `visao.md` que excedem o roadmap atual:

- Insights de gasto.
- Comparação de promoções.
- Recomendações ativas com raciocínio explícito.
- Integração com supermercados ou marketplaces.

---

## 5. Fora de escopo

Os itens abaixo nunca farão parte deste produto ou estão explicitamente fora do roadmap previsível:

- **ERP doméstico.** O produto não é um sistema de controle de estoque com precisão absoluta.
- **Controle perfeito de estoque.** Estimativa útil é o objetivo; precisão exata não é.
- **Obrigatoriedade de registrar consumo.** O sistema funciona sem isso; forçar registro de consumo contradiz o princípio de baixo atrito.
- **Catálogo global de produtos.** O catálogo de Itens é construído pela Casa, não imposto pelo sistema.
- **Integração com sensores ou hardware** (geladeira inteligente, balança de prateleira).
- **Notificações em tempo real baseadas em eventos de consumo.** O sistema usa proxies, não sensores — alarmes em tempo real gerariam falsos positivos frequentes.

---

## 6. Decisões de produto e rastreabilidade

| Decisão | ADR |
|---|---|
| Bottom tab com 4 abas + FAB central persistente para registrar Compra | [ADR-001](./adr/ADR-001-bottom-tab-mais-fab-central.md) |
| Home é a Lista, não a Despensa nem um dashboard | [ADR-002](./adr/ADR-002-home-eh-a-lista.md) |
| "Lista automática" e "recomendações" unificadas em Lista | [ADR-003](./adr/ADR-003-lista-absorve-recomendacoes.md) |
| Confiança da estimativa como semáforo visual, sem % numérica | [ADR-004](./adr/ADR-004-confianca-como-semaforo.md) |
| Captura de Compra manual com autocomplete no F0 | [ADR-005](./adr/ADR-005-captura-manual-com-autocomplete.md) |
| Sugestões agrupadas por motivo, não por categoria | [ADR-006](./adr/ADR-006-sugestoes-agrupadas-por-motivo.md) |
| Ajuste de Despensa com 3 opções predefinidas + ajuste preciso | [ADR-007](./adr/ADR-007-ajuste-de-despensa-3-opcoes.md) |
| Explicações da IA em tap-to-expand; nunca bloqueiam | [ADR-008](./adr/ADR-008-explicacao-em-tap-to-expand.md) |
| Onboarding em 3 telas com "pular" legítimo | [ADR-009](./adr/ADR-009-onboarding-3-telas.md) |
| Multi-morador fora do MVP; modelo de Casa desde F0 | [ADR-010](./adr/ADR-010-multi-morador-fora-do-mvp.md) |
| Vocabulário canônico: 6 termos, sem sinônimos | [ADR-011](./adr/ADR-011-vocabulario-canonico.md) |
| Estados vazios sempre com CTA contextual | [ADR-012](./adr/ADR-012-estado-vazio-com-cta.md) |
| Aprendizado por proxies implícitos; consumo explícito não é requisito | [ADR-013](./adr/ADR-013-aprendizado-por-proxies.md) |
| Foto da nota fiscal postergada para F3 | [ADR-014](./adr/ADR-014-foto-da-nota-na-fase-3.md) |
| Modo Mercado na F1 | [ADR-015](./adr/ADR-015-modo-mercado-na-fase-1.md) |
| Notificações máximo 1/dia na F1 | [ADR-016](./adr/ADR-016-notificacoes-1-por-dia.md) |
| "Marcar da lista" como 2ª via de registro na F1 | [ADR-017](./adr/ADR-017-marcar-da-lista-na-fase-1.md) |
| Offline com fila de sync na F4 | [ADR-018](./adr/ADR-018-offline-na-fase-4.md) |
| Cada fase entrega valor sozinha (regra inviolável) | [ADR-019](./adr/ADR-019-faseamento.md) |
| Decisões de produto documentadas como ADRs imutáveis | [ADR-020](./adr/ADR-020-adocao-de-adrs.md) |
| Compra com descrição livre e data editável na F1 | [ADR-021](./adr/ADR-021-descricao-e-data-no-registro.md) |
| Categoria e unidade no chip do registro, com listas fixas | [ADR-022](./adr/ADR-022-categoria-e-unidade-no-chip-do-registro.md) |
| Edição e exclusão de Compra com rederivação da Despensa | [ADR-023](./adr/ADR-023-edicao-e-exclusao-de-compra.md) |
| Notificações push adiadas para fase posterior | [ADR-024](./adr/ADR-024-adiamento-das-notificacoes-push.md) |
| Dicas de uso centralizadas na Conta | [ADR-025](./adr/ADR-025-dicas-de-uso-na-conta.md) |
| Aceite implícito da Sugestão (editar quantidade aceita) | [ADR-026](./adr/ADR-026-aceite-implicito-da-sugestao.md) |
