# Technical Specification

**Versão:** v0.3.0 — 2026-07-14
**Decisor(es):** Gustavo Rezin Durigon

> Guia técnico de desenvolvimento. Complementa [spec-produto.md](./spec-produto.md) e [spec-design.md](./spec-design.md). Não substitui ADRs de produto/UX; quando a arquitetura é restringida por uma decisão de produto, o ADR é citado.

---

## 0. Contexto e princípios de arquitetura

Projeto pessoal de estudo. As escolhas seguem três princípios, nesta ordem:

1. **Simplicidade primeiro.** Uma base de código, uma linguagem, um deploy. Nada de microsserviços, filas, ou infra distribuída sem necessidade comprovada.
2. **Fácil de evoluir.** A lógica de domínio (em especial o motor de aprendizado) vive isolada de framework e de banco, atrás de interfaces. Trocar Next.js por outro cliente, ou a heurística por uma LLM, não deve exigir reescrever o núcleo.
3. **Entregar valor cedo.** Cada fase do produto entrega valor sozinha ([ADR-019](./adr/ADR-019-faseamento.md)). A arquitetura espelha isso: a Fase 0 sobe em produção completa, sem andaimes das fases seguintes.

**Decisões macro confirmadas com o time:**
- Next.js full-stack único, entregue como **PWA** instalável.
- **Postgres + ORM próprio** — a lógica de domínio é escrita à mão, não delegada a um BaaS.
- Mobile-first de verdade; desktop fora de escopo ([spec-design §4](./spec-design.md)).

---

## 1. Stack proposta

| Camada | Escolha | Por quê (resumo) |
|---|---|---|
| **Front-end** | Next.js (App Router) + React, como **PWA** | Full-stack num framework só; mesma linguagem do back; deploy trivial; PWA cobre 100% da Fase 0. |
| **Estilo/UI** | Tailwind CSS + Radix UI (via shadcn/ui) | Tailwind acelera o mobile-first; Radix entrega primitivas acessíveis (bottom sheet, dialog) que o produto exige. |
| **Back-end** | Next.js **Server Actions** (escrita) + **Route Handlers** (leitura externa/API futura) | Sem API separada para manter no MVP; lógica fica em serviços reusáveis por ambos. |
| **Banco** | **PostgreSQL** gerenciado (Neon) | Relacional combina com o domínio (Casa → Compras → Itens); Neon tem free tier serverless e integra bem com Vercel. |
| **ORM** | **Prisma** | DX e tipagem excelentes, migrations simples, documentação farta — melhor para aprender e entregar rápido. |
| **Validação** | **Zod** | Um schema valida input de Server Action, gera tipos e documenta o contrato. |
| **Autenticação** | **Auth.js (NextAuth v5)** — email + Google | Nativo do Next.js, gratuito, cobre os dois provedores do F0 ([spec-produto §4.1](./spec-produto.md)). |
| **Hospedagem** | **Vercel** (app) + **Neon** (banco) | Deploy por push, free tier suficiente, zero infra para manter. |
| **Testes** | **Vitest** (unidade/domínio) + **Playwright** (E2E, sob demanda) | O motor de aprendizado é testado isoladamente; E2E só nos fluxos fundacionais. |

### 1.1 Trade-offs relevantes

- **ORM — Prisma vs Drizzle.** Drizzle é mais leve e "perto do SQL" (bom para quem quer dominar SQL). Prisma abstrai mais e tem a melhor curva de aprendizado. Escolhido **Prisma** pelo foco em entregar; migrar para Drizzle depois é viável porque o acesso a dados fica isolado na camada de repositório (§2.4).
- **Banco — Neon vs Supabase-como-Postgres.** Ambos servem. Neon foi escolhido por ser Postgres "puro" gerenciado, alinhado à decisão de **não** usar BaaS. Supabase continua sendo plano B trivial (é Postgres por baixo).
- **Auth — Auth.js vs Clerk.** Clerk é mais rápido de plugar e tem UI pronta, mas é serviço externo (e custo ao crescer). Auth.js é gratuito, roda no próprio app e ensina mais sobre sessão/JWT. Escolhido **Auth.js**.
- **Server Actions vs API REST.** No MVP, mutações via Server Actions eliminam boilerplate de API. A lógica mora em **serviços de domínio**, então quando um cliente nativo (React Native/Capacitor) precisar de JSON, basta expor os mesmos serviços via Route Handlers — sem reescrever regra de negócio. Ver §6 (evolução).
- **PWA vs nativo.** PWA cobre a Fase 0. Recursos nativos (push iOS F1, câmera+OCR F3, offline robusto F4) ganham qualidade num shell nativo. Caminho de evolução sem jogar código fora: **Capacitor** embrulhando a PWA, ou um cliente **React Native** reusando API e tipos. Decisão adiada para quando a fase exigir.

---

## 2. Arquitetura

### 2.1 Estilo: monólito modular em camadas

Um único app Next.js, organizado como **monólito modular**: o código é dividido por **contexto de domínio** (módulos), e cada módulo é internamente dividido em **camadas**. Não há serviços separados nem rede entre módulos — apenas chamadas de função e fronteiras de pasta disciplinadas.

```
┌─────────────────────────────────────────────────┐
│  Apresentação  (app/ — rotas, Server/Client      │
│                 Components, Server Actions)       │
├─────────────────────────────────────────────────┤
│  Aplicação     (services/ — casos de uso,         │
│                 orquestram domínio + repositório) │
├─────────────────────────────────────────────────┤
│  Domínio       (domain/ — entidades, regras,      │
│                 MOTOR DE APRENDIZADO; sem I/O)     │
├─────────────────────────────────────────────────┤
│  Infraestrutura(repository/, db/, auth/ — Prisma, │
│                 provedores externos)              │
└─────────────────────────────────────────────────┘
```

**Regra de dependência:** as setas apontam para baixo. Domínio não conhece Prisma, Next.js nem HTTP. Isso mantém o núcleo testável e portável.

### 2.2 Organização em módulos

Um módulo por contexto do vocabulário canônico ([ADR-011](./adr/ADR-011-vocabulario-canonico.md)):

| Módulo | Responsabilidade |
|---|---|
| `casa` | Casa, Moradores, onboarding. Escopo multi-tenant de todos os dados. |
| `item` | Item canônico, categoria, normalização de nomes (apelidos). |
| `compra` | Registro de Compra e seus itens. Fonte primária de dados de aprendizado. |
| `despensa` | Estoque estimado por Item, confiança (semáforo), ajustes rápidos (Tem/Pouco/Acabou). |
| `lista` | Lista unificada (Sugestões + manuais), agrupamento por motivo, ações (aceitar/editar/dispensar). |
| `aprendizado` | **Motor de aprendizado** — deriva estimativas e Sugestões a partir de Compras e ajustes. Domínio puro. |

`aprendizado` é consumido por `despensa` e `lista`, mas não depende deles: recebe dados de entrada e devolve estimativas/Sugestões (ver §5).

### 2.3 Estrutura de pastas

```
despensa/
├── prisma/
│   └── schema.prisma            # modelo de dados (fonte da verdade do banco)
├── public/
│   └── manifest.json            # PWA (ícones, nome, tema)
├── src/
│   ├── app/                     # APRESENTAÇÃO — App Router
│   │   ├── (auth)/              # login / callbacks (sem tab bar)
│   │   ├── (onboarding)/       # stack linear 3 telas (ADR-009)
│   │   ├── (app)/              # shell autenticado
│   │   │   ├── layout.tsx      # bottom tab + FAB persistente (ADR-001)
│   │   │   ├── lista/          # home (ADR-002)
│   │   │   ├── despensa/
│   │   │   ├── compras/
│   │   │   └── conta/
│   │   ├── api/                # Route Handlers (auth, webhooks, API futura)
│   │   └── layout.tsx
│   ├── lib/                     # cliente Prisma singleton
│   ├── modules/                 # DOMÍNIO + APLICAÇÃO por contexto
│   │   ├── casa/
│   │   │   ├── domain/         # entidades e regras puras
│   │   │   ├── services/       # casos de uso
│   │   │   └── repository/     # acesso a dados (Prisma)
│   │   ├── usuario/            # perfil do Usuario (nome)
│   │   ├── item/
│   │   ├── compra/
│   │   ├── despensa/           # estado derivado (services/ + repository/)
│   │   ├── lista/
│   │   └── aprendizado/        # motor de aprendizado: domain/ (estimativa +
│   │                           #   sugestões, puro) e repository/ (carga de proxies)
│   └── shared/
│       ├── auth/               # config Auth.js, helpers de sessão
│       ├── ui/                 # componentes e hooks: BottomSheet, EstadoVazio,
│       │                       #   NavInferior, SheetAdicionarItem, useBuscaItens...
│       └── utils/
│                               # (schemas Zod ficam junto do service que os usa)
├── tests/                       # Vitest (domínio) + Playwright (E2E)
└── ...config (next, tailwind, tsconfig, eslint)
```

### 2.4 Responsabilidades por camada

- **Apresentação (`app/`).** Renderiza UI e capta intenção do usuário. Server Components leem dados chamando **services**; mutações chamam **Server Actions**, que validam com Zod e delegam ao **service**. Nenhuma regra de negócio aqui.
- **Aplicação (`services/`).** Orquestra um caso de uso (ex.: "registrar Compra"): valida invariantes, chama domínio, persiste via repositório, dispara recálculo de aprendizado. É a fronteira transacional.
- **Domínio (`domain/`).** Entidades e regras puras, sem I/O. Aqui mora o **motor de aprendizado** e cálculos de confiança. 100% testável com Vitest, sem banco.
- **Infraestrutura (`repository/`, `shared/db`, `shared/auth`).** Traduz domínio ↔ Prisma e fala com serviços externos. Único lugar que conhece SQL/Prisma. Trocar de ORM ou banco fica contido aqui.

**Multi-tenant por Casa.** Todo dado pertence à Casa, não ao usuário ([spec-produto §3.1](./spec-produto.md), [ADR-010](./adr/ADR-010-multi-morador-fora-do-mvp.md)). Todo repositório recebe e filtra por `casaId`; a sessão resolve a Casa ativa do usuário. Isso prepara multi-morador (F5) sem construí-lo agora.

---

## 3. Modelagem do domínio

Entidades principais e relacionamentos (sem migrations; o `schema.prisma` é a fonte detalhada futura).

```
Usuario ──< Morador >── Casa
                          │
        ┌─────────────────┼──────────────────┬───────────────┐
        │                 │                  │               │
      Item            Compra            DespensaItem      ListaItem
        │                 │                  │               │
  ApelidoItem       CompraItem          AjusteDespensa   (ref. Item)
  (normalização)    (ref. Item)         (registro de eventos)
```

| Entidade | Campos-chave | Notas |
|---|---|---|
| **Usuario** | id, email, nome, provedor | Identidade de login (Auth.js). |
| **Casa** | id, nome, criadaEm | Container de todos os dados. Nome vindo do onboarding. |
| **Morador** | usuarioId, casaId, papel | Liga Usuario ↔ Casa. `papel` já previsto para multi-morador (F5). |
| **Item** | id, casaId, nomeCanonico, categoria, unidadePadrao | Produto genérico, marca não diferencia. Compartilhado na Casa. |
| **ApelidoItem** | id, itemId, textoBruto | Mapeia nomes digitados/OCR ao Item canônico (normalização). |
| **Compra** | id, casaId, data, descricao?, valorTotal?, criadaPor | Evento de abastecimento. Fonte primária de aprendizado. `descricao` é texto livre opcional ([ADR-021](./adr/ADR-021-descricao-e-data-no-registro.md)). |
| **CompraItem** | id, compraId, itemId, quantidade, unidade, precoUnit? | Linha de uma Compra. |
| **DespensaItem** | id, casaId, itemId, qtdEstimada, confianca, ultimaCompraEm, atualizadoEm | Estoque estimado + nível de confiança (semáforo). Derivado, recalculável. |
| **AjusteDespensa** | id, casaId, itemId, tipo (TEM/POUCO/ACABOU/PRECISO), valor?, em | Registro de ajustes — **proxy de consumo** ([ADR-013](./adr/ADR-013-aprendizado-por-proxies.md)). |
| **ListaItem** | id, casaId, itemId, origem (SUGESTAO/MANUAL), motivo, qtdSugerida, status (ATIVO/ACEITO/DISPENSADO/COMPRADO), criadoEm | Lista unificada ([ADR-003](./adr/ADR-003-lista-absorve-recomendacoes.md)). `motivo` dá o agrupamento ([ADR-006](./adr/ADR-006-sugestoes-agrupadas-por-motivo.md)). `status=DISPENSADO` é sinal negativo (F1). |

**Notas de modelagem:**
- `DespensaItem` e as Sugestões em `ListaItem` são **dados derivados**: nascem do motor de aprendizado a partir de Compras + Ajustes. Mantê-los persistidos (em vez de só calcular on-the-fly) evita recomputar tudo a cada render e dá histórico — mas eles sempre podem ser reconstruídos.
- `confianca` é guardada como pontuação interna (ex.: 0–1); a UI nunca a expõe, só a traduz em 🟢/🟡/🔴 ([ADR-004](./adr/ADR-004-confianca-como-semaforo.md)).
- `AjusteDespensa` é um **registro de eventos**, não um estado mutável: cada ajuste é um fato que alimenta o aprendizado. Bom para auditoria e para refinar heurísticas depois.

---

## 4. Fluxos principais (alto nível)

### 4.1 Login
1. Usuário escolhe email (link de acesso) ou Google → Auth.js cria/recupera `Usuario`.
2. Sessão resolve a `Casa` ativa via `Morador`. Sem Casa → vai para onboarding.
3. Onboarding ([ADR-009](./adr/ADR-009-onboarding-3-telas.md)) cria a `Casa` (nome) e leva ao CTA de primeira Compra.

### 4.2 Cadastro de Compras (fluxo fundacional)
1. FAB persistente → tela "Como quer registrar?" → **Manual** (F0).
2. Busca com autocomplete a partir do 2º caractere ([ADR-005](./adr/ADR-005-captura-manual-com-autocomplete.md)): consulta `Item` da Casa; texto novo vira `Item` (e `ApelidoItem`) via normalização simples.
3. Itens viram chips com quantidade editável. Confirmar → Server Action valida (Zod) → `service.registrarCompra` cria `Compra` + `CompraItem`.
4. Ao persistir, dispara **recálculo de aprendizado** (§4.4 / §5) de forma síncrona no mesmo caso de uso (volume é pequeno; sem fila no MVP).

### 4.3 Atualização do estoque (Despensa)
- **Derivada de Compra:** registrar Compra atualiza `DespensaItem` (quantidade sobe, `ultimaCompraEm`, confiança recalculada).
- **Ajuste rápido:** toque no Item → bottom sheet Tem/Pouco/Acabou (+ Ajuste preciso) ([ADR-007](./adr/ADR-007-ajuste-de-despensa-3-opcoes.md)). Cada opção grava um `AjusteDespensa` e atualiza `DespensaItem`:
  - **Tem** → confirma estimativa, **eleva confiança**.
  - **Pouco** → reduz qtd, move Item para a Lista.
  - **Acabou** → zera qtd, promove ao topo da Lista.

### 4.4 Geração da Lista
1. Ao abrir a Lista (home), um Server Component pede ao `service.montarLista(casaId)`.
2. O serviço junta: Sugestões do motor de aprendizado (`status=ATIVO`, `origem=SUGESTAO`) + itens manuais (`origem=MANUAL`).
3. Agrupa por `motivo` ("Provavelmente acabando", "Recorrentes", "Você adicionou") ([ADR-006](./adr/ADR-006-sugestoes-agrupadas-por-motivo.md)).
4. Cada Sugestão carrega a explicação textual gerada pelo motor (tap-to-expand, [ADR-008](./adr/ADR-008-explicacao-em-tap-to-expand.md)).
5. Ações (aceitar/editar/dispensar) são Server Actions que mudam `status` do `ListaItem` — e dispensar (F1) volta como sinal ao aprendizado.

### 4.5 Aprendizado
Disparado após cada Compra e cada Ajuste. Reavalia, por Item da Casa: frequência de Compra, recência, e gera/atualiza Sugestões + confiança. Detalhado na §5.

---

## 5. Inteligência do sistema (motor de aprendizado)

### 5.1 Arquitetura

O motor é um **módulo de domínio puro** (`modules/aprendizado/domain`), sem I/O, atrás de uma interface:

```
interface MotorAprendizado {
  // recebe o histórico de um Item e devolve estimativa + confiança
  estimarDespensa(historico: HistoricoItem): EstimativaItem

  // decide se o Item deve virar Sugestão, com motivo e explicação
  gerarSugestao(historico: HistoricoItem, estimativa: EstimativaItem): Sugestao | null
}
```

O `service` carrega o histórico (Compras + Ajustes) via repositório, chama o motor, e persiste o resultado em `DespensaItem`/`ListaItem`. **O motor nunca toca no banco** — recebe dados e devolve cálculos. Isso permite:
- testá-lo com Vitest usando dados de teste fixos, sem subir Postgres;
- trocar a implementação (heurística → LLM) sem mexer no resto.

### 5.2 Como aprende sem IA (heurística determinística — F0)

Aprendizado por **proxies implícitos** ([ADR-013](./adr/ADR-013-aprendizado-por-proxies.md)), sem registro de consumo:

- **Frequência/recorrência:** intervalos entre Compras do mesmo Item. Comprou arroz 3x com ~21 dias de intervalo → recorrência ~3 semanas. F0 usa **contagem e intervalo médio** (sem ML).
- **Estimativa de "provavelmente acabando":** se `hoje − ultimaCompraEm ≳ intervalo médio`, o Item entra na Lista com motivo "Provavelmente acabando". É suposição, não cálculo exato — e a UI deixa isso honesto via semáforo.
- **Recorrentes:** Itens com histórico estável e dentro do intervalo → motivo "Recorrentes".
- **Ajustes como proxy:** "Acabou"/"Pouco" aceleram a Sugestão; "Tem" adia e eleva confiança.

**Confiança (semáforo):** função determinística de (nº de Compras do Item, recência, variância dos intervalos). Pouco histórico → 🔴; histórico estável e recente → 🟢. Pontuação interna, nunca exposta ([ADR-004](./adr/ADR-004-confianca-como-semaforo.md)).

**Explicações** são geradas por template a partir dos mesmos números ("você compra a cada ~3 semanas", "última Compra há 45 dias — pouco histórico") — linguagem doméstica, sem jargão ([spec-design §7.5](./spec-design.md)).

### 5.3 Evolução do motor por fase

- **F0:** contagem + frequência (acima).
- **F2:** frequência por Item mais fina, detecção de mudança de hábito, sazonalidade básica, detecção de compra atípica. Ainda determinístico — entra como nova implementação da mesma interface.

### 5.4 Onde uma LLM faz sentido (futuro)

A interface estável permite plugar LLM **só onde agrega**, sem reescrever o núcleo:
- **Normalização de nomes** (F3, OCR de NF-e): "LT INT TIROL 1L" → "Leite Integral". Tarefa de linguagem, difícil por regra, ideal para LLM.
- **Explicações mais ricas** em linguagem natural, mantendo os números vindos da heurística.
- **Visão longa** ([visao.md](./visao.md)): "vale a pena essa promoção?", insights de gasto, raciocínio explícito — onde interpretar contexto supera heurística.

Princípio: **números e decisões vêm da heurística determinística; a LLM cuida de linguagem e casos ambíguos.** Isso mantém o sistema explicável, barato e testável.

---

## 6. Roadmap técnico (ordem de implementação)

Ordem pensada para ter algo rodando ponta a ponta o quanto antes, e só então enriquecer. Marcos 0–4 mapeiam a Fase 0 do produto (concluída); Marcos 5–8 mapeiam a Fase 1.

**Marco 0 — Fundação (esqueleto que sobe)**
1. Projeto Next.js (App Router) + Tailwind + Prisma + Neon conectados.
2. `schema.prisma` inicial (Usuario, Casa, Morador, Item, Compra, CompraItem).
3. Auth.js com Google + email; sessão resolvendo Casa ativa.
4. Deploy na Vercel desde o início (CI por push) — evita "big bang" no fim.

**Marco 1 — Núcleo do dado (o produto começa a existir)**
5. Onboarding 3 telas → cria Casa ([ADR-009](./adr/ADR-009-onboarding-3-telas.md)).
6. Shell autenticado: bottom tab + FAB ([ADR-001](./adr/ADR-001-bottom-tab-mais-fab-central.md)); estados vazios com CTA ([ADR-012](./adr/ADR-012-estado-vazio-com-cta.md)).
7. **Registrar Compra manual** com autocomplete (fluxo fundacional, [ADR-005](./adr/ADR-005-captura-manual-com-autocomplete.md)).
8. Histórico de Compras (lista + detalhe).

**Marco 2 — Despensa derivada**
9. `DespensaItem` populado a partir de Compras; tela Despensa por categoria.
10. Semáforo de confiança ([ADR-004](./adr/ADR-004-confianca-como-semaforo.md)).
11. Ajuste rápido Tem/Pouco/Acabou + Ajuste preciso ([ADR-007](./adr/ADR-007-ajuste-de-despensa-3-opcoes.md)); `AjusteDespensa` como log.

**Marco 3 — Inteligência mínima (fecha o ciclo de valor)**
12. Motor de aprendizado F0 (frequência + confiança) como domínio puro, com testes Vitest.
13. Lista (home) unificando Sugestões + manuais, agrupadas por motivo ([ADR-002](./adr/ADR-002-home-eh-a-lista.md), [ADR-003](./adr/ADR-003-lista-absorve-recomendacoes.md), [ADR-006](./adr/ADR-006-sugestoes-agrupadas-por-motivo.md)).
14. Explicações em bottom sheet ([ADR-008](./adr/ADR-008-explicacao-em-tap-to-expand.md)).
15. Ações da Lista: aceitar / editar qtd / dispensar.

**Marco 4 — Acabamento do MVP**
16. Conta (perfil, dados da Casa, sair).
17. PWA (manifest, ícones, instalável).
18. Validar o critério de pronto do F0 ([spec-produto §4.1](./spec-produto.md)): Camila registra 1ª Compra, vê Despensa preenchida, volta e vê ≥3 Sugestões explicadas.

### Fase 1 — Atrito do dia a dia

> Notificações push ([ADR-016](./adr/ADR-016-notificacoes-1-por-dia.md)) foram **adiadas para fase posterior** ([ADR-024](./adr/ADR-024-adiamento-das-notificacoes-push.md)) — não há marco de push na F1.

**Marco 5 — Registro de Compra completo**
19. `descricao` opcional e data editável (default hoje, futuro proibido) no registro ([ADR-021](./adr/ADR-021-descricao-e-data-no-registro.md)).
20. Bottom sheet no chip do item: quantidade + unidade + categoria, com listas fixas no domínio do Item ([ADR-022](./adr/ADR-022-categoria-e-unidade-no-chip-do-registro.md)).
21. Edição e exclusão de Compra, com rederivação da Despensa por Item afetado e recálculo das Sugestões ([ADR-023](./adr/ADR-023-edicao-e-exclusao-de-compra.md)).
22. Página "Dicas de uso" na Conta ([ADR-025](./adr/ADR-025-dicas-de-uso-na-conta.md)).

**Marco 6 — "Marcar da lista"**
23. Segunda via na tela "Como quer registrar?", disponível com ≥1 Item ativo na Lista; pré-preenche o formulário de Compra ([ADR-017](./adr/ADR-017-marcar-da-lista-na-fase-1.md)) — reusa o formulário extraído no Marco 5.

**Marco 7 — Modo Mercado**
24. Fullscreen modal ativado pela Lista; Itens agrupados por categoria (do Marco 5); checks grandes; progresso "6 de 12" ([ADR-015](./adr/ADR-015-modo-mercado-na-fase-1.md)).
25. Finalizar → registro de Compra pré-preenchido com os marcados (reusa a via do Marco 6).

**Marco 8 — Swipe para dispensar + acabamento F1**
26. Gesto de swipe na Lista para dispensar Sugestão, chamando a ação de dispensar já existente ([ADR-013](./adr/ADR-013-aprendizado-por-proxies.md)).
27. Validar o critério de pronto da F1 ([spec-produto §4.2](./spec-produto.md)).

**Preparado para depois (sem construir agora):**
- API JSON via Route Handlers reusando os services → habilita cliente nativo (Capacitor/React Native) na F1/F3.
- Idempotência nos casos de uso de escrita → facilita a fila de sync offline da F4 ([ADR-018](./adr/ADR-018-offline-na-fase-4.md)).
- Interface do motor estável → permite implementação F2 e LLM (F3+) sem refatorar o núcleo.

---

## 7. Convenções de nomenclatura

- **Português por padrão.** Entidades de domínio, variáveis, campos de banco, nomes de arquivo de domínio e toda a documentação são nomeados em português. Não misturar inglês e português numa mesma identificação.
- **Inglês apenas para termos técnicos consagrados** que não têm tradução natural de uso corrente — ex.: `Repository`, `Service`, `Controller`, `Next.js`, `PWA`, `ORM`, `deploy`, `Server Actions`, `Route Handlers`, `bottom sheet`.
- **Termos de domínio seguem o vocabulário canônico** ([ADR-011](./adr/ADR-011-vocabulario-canonico.md)): `Casa`, `Item`, `Compra`, `Despensa`, `Lista`, `Sugestão`, `Morador`.
- **Exemplos:** `Usuario` (não `User`), `Morador` (não `Membership`), `ApelidoItem` (não `ItemAlias`), `usuarioId` (não `userId`); "registro de eventos" (não "event log"), "pontuação" (não "score").
- **Composição:** uma classe de infraestrutura combina o termo de domínio em português com o sufixo técnico em inglês — ex.: `CompraRepository`, `DespensaService`, `MotorAprendizado`.

---

## 8. O que NÃO faremos (anti-overengineering)

Decisões explícitas de *não* fazer, para manter a base simples:

- ❌ Microsserviços, mensageria, ou serviços separados — monólito modular basta.
- ❌ Fila/worker para o aprendizado no MVP — recálculo síncrono no caso de uso (volume baixo).
- ❌ BaaS (Supabase Auth/Storage) — optou-se por ORM e lógica próprios.
- ❌ Camada de cache dedicada (Redis) — cache do Next.js e do Postgres bastam.
- ❌ GraphQL — Server Actions + Route Handlers cobrem as necessidades.
- ❌ Suporte desktop/offline no F0 — fora de escopo até F4 ([ADR-018](./adr/ADR-018-offline-na-fase-4.md)).
