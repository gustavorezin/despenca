# ADRs — Assistente de Abastecimento Doméstico

Architecture Decision Records (ADRs) registram as decisões de UX e produto deste projeto: **o quê** foi decidido, **por quê**, e **o que foi rejeitado**. São imutáveis — uma decisão revista não edita o ADR anterior, cria um novo com `Status: Substituído por ADR-XXX`.

Para criar um novo ADR: copie [`_template.md`](./_template.md), nomeie como `ADR-NNN-kebab-titulo.md`, preencha todos os campos e adicione ao índice abaixo.

---

## Por fase do produto

### Meta (processo e estrutura)

- [ADR-019](./ADR-019-faseamento.md) — Faseamento — regra de que cada fase entrega valor sozinha, sem depender de fases posteriores.
- [ADR-020](./ADR-020-adocao-de-adrs.md) — Adoção de ADRs — decisão de registrar decisões em `docs/adr/` com template e numeração sequencial.

### Fase 0 — MVP 🎯

- [ADR-001](./ADR-001-bottom-tab-mais-fab-central.md) — Bottom tab + FAB central — navegação com 4 abas e FAB persistente para registrar Compra em 1 toque.
- [ADR-002](./ADR-002-home-eh-a-lista.md) — Home é a Lista — a aba ativa ao abrir o app é a Lista, não a Despensa ou um dashboard.
- [ADR-003](./ADR-003-lista-absorve-recomendacoes.md) — Lista absorve recomendações — "lista automática" e "recomendações" são unificadas em uma única superfície (Lista).
- [ADR-004](./ADR-004-confianca-como-semaforo.md) — Confiança como semáforo — nível de confiança do estoque exibido como 🟢🟡🔴, nunca como percentagem.
- [ADR-005](./ADR-005-captura-manual-com-autocomplete.md) — Captura manual com autocomplete — registro de Compra é manual no MVP, com autocomplete agressivo a partir do 2º caractere.
- [ADR-006](./ADR-006-sugestoes-agrupadas-por-motivo.md) — Sugestões agrupadas por motivo — na Lista, Itens são agrupados por razão ("Provavelmente acabando", "Recorrentes"), não por categoria de produto.
- [ADR-007](./ADR-007-ajuste-de-despensa-3-opcoes.md) — Ajuste de despensa com 3 opções — bottom sheet com Tem / Pouco / Acabou + Ajuste preciso; cobre 90% dos ajustes sem teclado.
- [ADR-008](./ADR-008-explicacao-em-tap-to-expand.md) — Explicação em tap-to-expand — explicações da IA nunca aparecem inline; acessíveis via ⓘ sem bloquear a ação.
- [ADR-009](./ADR-009-onboarding-3-telas.md) — Onboarding em 3 telas — autenticação, nome da Casa e escolha de início, com "pular" como opção legítima.
- [ADR-010](./ADR-010-multi-morador-fora-do-mvp.md) — Multi-morador fora do MVP — funcionalidade de convite na Fase 5; modelo de dados com Casa pronto desde o Dia 1.
- [ADR-011](./ADR-011-vocabulario-canonico.md) — Vocabulário canônico — seis termos oficiais: Lista, Despensa, Item, Compra, Casa, Sugestão.
- [ADR-012](./ADR-012-estado-vazio-com-cta.md) — Estado vazio com CTA — todo estado vazio tem texto contextual e chamada para ação; telas brancas são proibidas.
- [ADR-013](./ADR-013-aprendizado-por-proxies.md) — Aprendizado por proxies — o sistema aprende por Compras e Ajustes, sem exigir registro explícito de consumo.
- [ADR-014](./ADR-014-foto-da-nota-na-fase-3.md) — Foto da nota na Fase 3 — OCR e revisão de itens entram na Fase 3; a tela de captura do MVP já prevê a opção.

### Fase 1 — Atrito do dia-a-dia 📉

- [ADR-015](./ADR-015-modo-mercado-na-fase-1.md) — Modo Mercado — tela fullscreen modal com Itens agrupados por categoria para uso no supermercado.
- [ADR-016](./ADR-016-notificacoes-1-por-dia.md) — Notificações 1/dia máximo — limite hard de 1 notificação push por dia com deep-link para a Lista.
- [ADR-017](./ADR-017-marcar-da-lista-na-fase-1.md) — Marcar da lista — terceira via de registro que usa os Itens da Lista como base, reduzindo atrito para usuários com Lista madura.
- [ADR-021](./ADR-021-descricao-e-data-no-registro.md) — Descrição e data no registro — a Compra ganha descrição livre opcional e data editável (retroativa permitida, futura proibida).
- [ADR-022](./ADR-022-categoria-e-unidade-no-chip-do-registro.md) — Categoria e unidade no chip — bottom sheet opcional no chip do registro, com listas fixas de categorias e unidades.
- [ADR-023](./ADR-023-edicao-e-exclusao-de-compra.md) — Edição e exclusão de Compra — Compras editáveis/excluíveis com rederivação da Despensa por Item afetado.
- [ADR-024](./ADR-024-adiamento-das-notificacoes-push.md) — Adiamento das notificações push — push sai do escopo da Fase 1; formato do ADR-016 permanece válido.
- [ADR-025](./ADR-025-dicas-de-uso-na-conta.md) — Dicas de uso na Conta — página estática com dicas por tela; sem tour guiado nem cards contextuais.
- [ADR-026](./ADR-026-aceite-implicito-da-sugestao.md) — Aceite implícito da Sugestão — sem botão "aceitar"; editar a quantidade aceita a Sugestão e a protege do recálculo.

### Fase 3 — Captura por imagem 📷

- [ADR-014](./ADR-014-foto-da-nota-na-fase-3.md) — Foto da nota — rollout do OCR e revisão de itens identificados. *(Decisão tomada na Fase 0; ver entrada acima.)*

### Fase 4 — Resiliência ⚡

- [ADR-018](./ADR-018-offline-na-fase-4.md) — Offline com fila de sync — registro de Compra e ajuste de Despensa funcionam sem internet; dados sincronizam ao reconectar.

### Fase 5 — Colaboração 👥

- [ADR-010](./ADR-010-multi-morador-fora-do-mvp.md) — Multi-morador — rollout de convites e permissões. *(Modelo de dados pronto desde a Fase 0; ver entrada acima.)*

---

## Tabela de status

| ADR | Título | Status | Data |
|---|---|---|---|
| ADR-001 | Bottom tab + FAB central | Aceito | 2026-06-28 |
| ADR-002 | Home é a Lista | Aceito | 2026-06-28 |
| ADR-003 | Lista absorve recomendações | Aceito | 2026-06-28 |
| ADR-004 | Confiança como semáforo | Aceito | 2026-06-28 |
| ADR-005 | Captura manual com autocomplete | Aceito | 2026-06-28 |
| ADR-006 | Sugestões agrupadas por motivo | Aceito | 2026-06-28 |
| ADR-007 | Ajuste de despensa com 3 opções | Aceito | 2026-06-28 |
| ADR-008 | Explicação em tap-to-expand | Aceito | 2026-06-28 |
| ADR-009 | Onboarding em 3 telas | Aceito | 2026-06-28 |
| ADR-010 | Multi-morador fora do MVP | Aceito | 2026-06-28 |
| ADR-011 | Vocabulário canônico | Aceito | 2026-06-28 |
| ADR-012 | Estado vazio com CTA | Aceito | 2026-06-28 |
| ADR-013 | Aprendizado por proxies | Aceito | 2026-06-28 |
| ADR-014 | Foto da nota na Fase 3 | Aceito | 2026-06-28 |
| ADR-015 | Modo Mercado na Fase 1 | Aceito | 2026-06-28 |
| ADR-016 | Notificações 1/dia | Aceito (fase de entrega ajustada pelo ADR-024) | 2026-06-28 |
| ADR-017 | Marcar da lista na Fase 1 | Aceito | 2026-06-28 |
| ADR-018 | Offline na Fase 4 | Aceito | 2026-06-28 |
| ADR-019 | Faseamento (meta) | Aceito | 2026-06-28 |
| ADR-020 | Adoção de ADRs (meta) | Aceito | 2026-06-28 |
| ADR-021 | Descrição e data no registro | Aceito | 2026-07-12 |
| ADR-022 | Categoria e unidade no chip | Aceito | 2026-07-12 |
| ADR-023 | Edição e exclusão de Compra | Aceito | 2026-07-12 |
| ADR-024 | Adiamento das notificações push | Aceito | 2026-07-12 |
| ADR-025 | Dicas de uso na Conta | Aceito | 2026-07-12 |
| ADR-026 | Aceite implícito da Sugestão | Aceito | 2026-07-14 |
