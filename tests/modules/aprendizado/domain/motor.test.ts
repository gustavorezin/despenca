import { describe, it, expect } from "vitest";
import {
  intervaloMedioDias,
  gerarSugestao,
  type HistoricoAprendizado,
} from "@/modules/aprendizado/domain/motor";

const hoje = new Date("2026-07-12T12:00:00Z");
const diasAtras = (n: number) => new Date(hoje.getTime() - n * 86_400_000);

function historico(over: Partial<HistoricoAprendizado> = {}): HistoricoAprendizado {
  return {
    numeroCompras: 2,
    primeiraCompraEm: diasAtras(30),
    ultimaCompraEm: diasAtras(2),
    ultimoAjuste: null,
    ...over,
  };
}

describe("intervaloMedioDias", () => {
  it("dado menos de 2 compras, então não há intervalo (null)", () => {
    // Dado
    const h = historico({ numeroCompras: 1, primeiraCompraEm: null });

    // Quando
    const intervalo = intervaloMedioDias(h);

    // Então
    expect(intervalo).toBeNull();
  });

  it("dado 3 compras em 40 dias, então o intervalo médio é 20 dias", () => {
    // Dado
    const h = historico({
      numeroCompras: 3,
      primeiraCompraEm: diasAtras(42),
      ultimaCompraEm: diasAtras(2),
    });

    // Quando
    const intervalo = intervaloMedioDias(h);

    // Então
    expect(intervalo).toBe(20);
  });
});

describe("gerarSugestao — por frequência de Compra", () => {
  it("dado que passou do intervalo típico, então sugere 'provavelmente acabando'", () => {
    // Dado: 2 compras a 15 dias de distância; última há 15 dias (no intervalo)
    const h = historico({
      numeroCompras: 2,
      primeiraCompraEm: diasAtras(30),
      ultimaCompraEm: diasAtras(15),
    });

    // Quando
    const sug = gerarSugestao(h, hoje);

    // Então
    expect(sug?.motivo).toBe("PROVAVELMENTE_ACABANDO");
    expect(sug?.resumo).toContain("semana");
  });

  it("dado item frequente ainda com folga, então sugere como 'recorrente'", () => {
    // Dado: 3 compras, intervalo ~20 dias, última há 13 (entre 0.6 e 0.9 do intervalo)
    const h = historico({
      numeroCompras: 3,
      primeiraCompraEm: diasAtras(53),
      ultimaCompraEm: diasAtras(13),
    });

    // Quando
    const sug = gerarSugestao(h, hoje);

    // Então
    expect(sug?.motivo).toBe("RECORRENTE");
  });

  it("dado uma compra recente dentro do hábito, então não sugere nada", () => {
    // Dado: intervalo ~28 dias, comprado há 2 dias
    const h = historico({
      numeroCompras: 2,
      primeiraCompraEm: diasAtras(30),
      ultimaCompraEm: diasAtras(2),
    });

    // Quando
    const sug = gerarSugestao(h, hoje);

    // Então
    expect(sug).toBeNull();
  });

  it("dado histórico insuficiente (1 compra) e sem ajuste, então não sugere", () => {
    // Dado
    const h = historico({
      numeroCompras: 1,
      primeiraCompraEm: diasAtras(10),
      ultimaCompraEm: diasAtras(10),
    });

    // Quando
    const sug = gerarSugestao(h, hoje);

    // Então
    expect(sug).toBeNull();
  });
});

describe("gerarSugestao — ajuste manual como proxy (ADR-013)", () => {
  it("dado 'Acabou' recente, então sugere 'provavelmente acabando'", () => {
    // Dado
    const h = historico({
      ultimaCompraEm: diasAtras(5),
      ultimoAjuste: { tipo: "ACABOU", em: diasAtras(0) },
    });

    // Quando
    const sug = gerarSugestao(h, hoje);

    // Então
    expect(sug?.motivo).toBe("PROVAVELMENTE_ACABANDO");
    expect(sug?.explicacao).toContain("acabou");
  });

  it("dado 'Pouco' recente, então sugere 'provavelmente acabando'", () => {
    // Dado
    const h = historico({
      ultimaCompraEm: diasAtras(5),
      ultimoAjuste: { tipo: "POUCO", em: diasAtras(0) },
    });

    // Quando
    const sug = gerarSugestao(h, hoje);

    // Então
    expect(sug?.motivo).toBe("PROVAVELMENTE_ACABANDO");
  });

  it("dado 'Tem' recente, então não sugere (usuário confirmou estoque)", () => {
    // Dado: mesmo passado do intervalo, o 'Tem' cancela a sugestão
    const h = historico({
      numeroCompras: 2,
      primeiraCompraEm: diasAtras(30),
      ultimaCompraEm: diasAtras(15),
      ultimoAjuste: { tipo: "TEM", em: diasAtras(0) },
    });

    // Quando
    const sug = gerarSugestao(h, hoje);

    // Então
    expect(sug).toBeNull();
  });

  it("dado um ajuste mais antigo que a última compra, então a frequência prevalece", () => {
    // Dado: comprou depois de ter marcado 'Acabou' → a compra recente manda
    const h = historico({
      numeroCompras: 2,
      primeiraCompraEm: diasAtras(30),
      ultimaCompraEm: diasAtras(2),
      ultimoAjuste: { tipo: "ACABOU", em: diasAtras(10) },
    });

    // Quando
    const sug = gerarSugestao(h, hoje);

    // Então: comprou há 2 dias, com folga → não sugere
    expect(sug).toBeNull();
  });
});
