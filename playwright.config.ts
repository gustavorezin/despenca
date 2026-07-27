import { defineConfig } from "@playwright/test";

/*
  E2E do fluxo fundacional (spec-tecnica §1: Playwright, sob demanda).
  Pré-requisito: Postgres local de dev no ar (`npm run db:up`) com migrations
  aplicadas — o teste cria uma Casa descartável e a remove ao final.
  Rodar com `npm run test:e2e`; o servidor Next sobe sozinho na porta 3100.
*/
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 120_000,
  // O dev server compila cada rota no primeiro acesso; folga nas esperas.
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3000",
  },
  // Reusa o `next dev` que estiver de pé (o Next 16 não permite um segundo
  // dev server no mesmo diretório); sem nenhum, sobe um aqui.
  webServer: {
    command: "npx next dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
