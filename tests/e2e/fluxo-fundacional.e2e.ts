import { test, expect } from "@playwright/test";
import {
  criarSessaoDeTeste,
  limparSessaoDeTeste,
  type SessaoDeTeste,
} from "./apoio/sessao";

/*
  Fluxo fundacional de ponta a ponta (spec-produto §3.3: "sem Compras, não há
  dados, não há aprendizado"): registrar a 1ª Compra preenche a Despensa
  (§4.2/§4.3) e o ajuste "Acabou" vira Sugestão na Lista pelo motor (ADR-007,
  ADR-013). Roda numa Casa descartável criada direto no banco de dev.
*/

async function registrarCompraManual(page: import("@playwright/test").Page, item: string) {
  await page.goto("/registrar");
  await page.getByRole("button", { name: /Manual/ }).click();
  await page.getByPlaceholder("Buscar item para adicionar…").fill(item);

  const existente = page.getByRole("button", { name: item, exact: true });
  const novo = page.getByRole("button", { name: new RegExp(`Adicionar .${item}.`) });
  await existente.or(novo).first().click();

  await page.getByRole("button", { name: /Registrar Compra · 1/ }).click();
  await page.waitForURL("**/despensa");
}

test.describe("fluxo fundacional", () => {
  let sessao: SessaoDeTeste;

  test.beforeAll(async () => {
    sessao = await criarSessaoDeTeste();
  });

  test.afterAll(async () => {
    await limparSessaoDeTeste(sessao);
  });

  test("dado uma Casa nova, então a 1ª Compra preenche a Despensa e 'Acabou' vira Sugestão na Lista", async ({
    page,
    context,
    baseURL,
  }) => {
    // Dado: sessão válida (cookie de sessão "database" do Auth.js)
    await context.addCookies([
      { name: "authjs.session-token", value: sessao.sessionToken, url: baseURL! },
    ]);

    // Lista começa vazia, com CTA (ADR-012)
    await page.goto("/lista");
    await expect(page.getByText("Ainda estou aprendendo")).toBeVisible();

    // Quando: registro manual da 1ª Compra (ADR-005)
    await registrarCompraManual(page, "Arroz");

    // Então: efeito imediato — Despensa preenchida (§4.2)
    await expect(page.getByRole("button", { name: "Arroz" })).toBeVisible();

    // Quando: ajuste rápido "Acabou" (ADR-007)
    await page.getByRole("button", { name: "Arroz" }).click();
    await page.getByRole("button", { name: /Acabou/ }).click();

    // Então: a estimativa zera ("acabou") e, pela transação do ajuste,
    // o motor promove o Item à Lista (ADR-013)
    await expect(page.getByText("acabou", { exact: true })).toBeVisible();
    await page.goto("/lista");
    await expect(page.getByText("Provavelmente acabando")).toBeVisible();
    await expect(page.getByText("Arroz")).toBeVisible();

    // Quando: confirma "Tem" depois de ter marcado "Acabou" (bug relatado —
    // a confiança subia mas a quantidade ficava travada em "acabou")
    await page.goto("/despensa");
    await page.getByRole("button", { name: "Arroz" }).click();
    await page.getByRole("button", { name: /Tem\s+confirma/ }).click();

    // Então: "Tem" afirma que o Item existe — a quantidade não pode mais
    // aparecer como "acabou"
    await expect(page.getByText("acabou", { exact: true })).toHaveCount(0);
  });

  test("dado 3 Compras manuais do mesmo Item, então a Despensa soma as quantidades", async ({
    page,
    context,
    baseURL,
  }) => {
    // Dado: bug relatado — registrar o mesmo Item em Compras separadas
    // mantinha a Despensa em 1un, como se cada registro substituísse o
    // anterior em vez de somar (§4.3: "quantidade sobe")
    await context.addCookies([
      { name: "authjs.session-token", value: sessao.sessionToken, url: baseURL! },
    ]);

    // Quando: 3 Compras manuais de 1 unidade cada do mesmo Item
    await registrarCompraManual(page, "Feijão");
    await registrarCompraManual(page, "Feijão");
    await registrarCompraManual(page, "Feijão");

    // Então: 1 + 1 + 1 — a Despensa acumula, nunca substitui
    await expect(page.getByText("~3 un")).toBeVisible();
  });
});
