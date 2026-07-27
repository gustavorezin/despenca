import { describe, it, expect } from "vitest";
import { resolverCabecalho } from "@/modules/compra/domain/cabecalho";

// 11/07/2026 às 15h no fuso da Casa (America/Sao_Paulo, −03:00) — instante
// absoluto: o teste dá o mesmo resultado em qualquer fuso de máquina.
const hoje = new Date("2026-07-11T15:00:00-03:00");

describe("resolverCabecalho", () => {
  it("dado uma entrada sem data, então a Compra é datada de hoje", () => {
    // Dado
    const entrada = {};

    // Quando
    const { data } = resolverCabecalho(entrada, hoje);

    // Então
    expect(data).toBe(hoje);
  });

  it("dado uma data retroativa, então é aceita ao meio-dia UTC (imune a fuso)", () => {
    // Dado
    const entrada = { data: "2026-07-01" };

    // Quando
    const { data } = resolverCabecalho(entrada, hoje);

    // Então
    expect(data.getUTCFullYear()).toBe(2026);
    expect(data.getUTCMonth()).toBe(6);
    expect(data.getUTCDate()).toBe(1);
    expect(data.getUTCHours()).toBe(12);
  });

  it("dado a data de hoje por extenso, então mantém o instante real do registro", () => {
    // Dado: a fronteira do futuro é aceita, e o instante preserva a ordem
    // entre a Compra e os ajustes do mesmo dia (ADR-013)
    const entrada = { data: "2026-07-11" };

    // Quando
    const { data } = resolverCabecalho(entrada, hoje);

    // Então
    expect(data).toBe(hoje);
  });

  it("dado uma data futura, então recusa (ADR-021)", () => {
    // Dado
    const entrada = { data: "2026-07-12" };

    // Quando / Então
    expect(() => resolverCabecalho(entrada, hoje)).toThrow(/futuro/);
  });

  it("dado descrição ausente ou vazia, então persiste null", () => {
    // Dado / Quando / Então
    expect(resolverCabecalho({}, hoje).descricao).toBeNull();
    expect(resolverCabecalho({ descricao: "" }, hoje).descricao).toBeNull();
  });

  it("dado descrição informada, então é preservada", () => {
    // Dado
    const entrada = { descricao: "Mercado Extra" };

    // Quando
    const { descricao } = resolverCabecalho(entrada, hoje);

    // Então
    expect(descricao).toBe("Mercado Extra");
  });
});
