---
name: testes-unitarios
description: Padrões para escrever testes unitários neste projeto (Vitest, domínio puro). Use ao criar ou editar arquivos *.test.ts, ao adicionar lógica de domínio testável, ou quando pedirem "testes unitários"/"cobrir com testes".
---

# Testes unitários — padrões do projeto Despensa

Guia de como escrever testes unitários aqui. Segue as convenções do repositório
(`CLAUDE.md`, ADR-011) e a arquitetura em camadas (`docs/spec-tecnica.md §2`).

## O que testar (e o que não)

- **Teste apenas o domínio puro**: funções sem I/O em `src/modules/*/domain/`
  (cálculos, regras, transformações). É onde vive a lógica que merece testes rápidos e determinísticos.
- **NÃO teste** aqui camadas com efeito colateral: `repository/` (Prisma), `services/`
  (orquestração + banco), Server Actions, componentes React. Elas se validam por
  verificação de ponta a ponta / integração, não por unit test.
- Se uma regra importante está presa dentro de um service, **extraia-a para `domain/`**
  como função pura e teste-a lá — não monte mocks de Prisma para alcançá-la.

## Estrutura e localização

- Framework: **Vitest** (`npm run test` executa; `npm run test:watch` observa).
- Arquivos em **`tests/`** na raiz, **espelhando o caminho de `src/`**:
  `src/modules/aprendizado/domain/estimativa.ts` → `tests/modules/aprendizado/domain/estimativa.test.ts`.
- Importe pelo alias `@/` (ex.: `import { calcularConfianca } from "@/modules/aprendizado/domain/estimativa"`).

## Convenções de escrita

- **Português** nos `describe`/`it` e nas variáveis (ADR-011). `describe` nomeia a unidade
  (a função/regra); `it` descreve o **cenário** em linguagem natural, no formato
  **"dado … então …"** (o "quando" costuma ficar implícito na ação). Foco no comportamento
  observável, nunca na implementação.
  - Bom: `it("dado uma última compra antiga, então a confiança é baixa", ...)`
  - Evite: `it("retorna 0.3", ...)`
- **Um comportamento por teste.** Prefira vários testes pequenos a um teste com muitos asserts.
- **Dado → Quando → Então** (Given-When-Then) no corpo, um bloco por etapa, separados por
  linha em branco e marcados por comentário. Torna explícito o contexto, a ação e a expectativa:

  ```ts
  it("dado que o usuário confirma 'Tem', então a confiança é alta", () => {
    // Dado
    const historico = { numeroCompras: 1, ultimaCompraEm: dias(hoje, -40), ultimoAjuste: { tipo: "TEM", em: hoje } };

    // Quando
    const pontuacao = calcularConfianca(historico, hoje);

    // Então
    expect(nivelConfianca(pontuacao)).toBe("alta");
  });
  ```

  - **Dado**: o estado/entradas do cenário (o contexto).
  - **Quando**: a ação sob teste — a chamada da função. Normalmente uma linha.
  - **Então**: as asserções sobre o resultado observável.
- **Cubra as bordas**, não só o caminho feliz: limiares (o valor exato onde 🟡 vira 🟢),
  entradas vazias/nulas, extremos (0, negativos se possível, datas muito antigas).

## Determinismo (obrigatório)

- O domínio **não** pode ler o relógio nem gerar aleatório: nada de `Date.now()`,
  `new Date()` sem argumento, `Math.random()`. O "agora" é **injetado como parâmetro**
  (ex.: `calcularConfianca(historico, hoje)`), então o teste controla o tempo.
- Fixe um `const hoje = new Date("2026-07-11T12:00:00Z")` no teste e derive as demais datas dele.
- Sem dependência de fuso/locale nos asserts; se a função formata data/locale, teste o
  contrato observável, não a string exata dependente de ambiente.

## Checklist antes de concluir

- [ ] Testes no lugar certo (`tests/` espelhando `src/`), nomes em português no formato "dado … então …".
- [ ] Cada teste tem os blocos **Dado / Quando / Então** marcados por comentário.
- [ ] Cada limiar/branch da função tem ao menos um teste.
- [ ] Nenhum acesso a relógio/rede/banco dentro do que é testado.
- [ ] `npm run test` verde.
