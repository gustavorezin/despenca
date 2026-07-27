import { describe, it, expect } from "vitest";
import {
  CATEGORIAS,
  SEM_CATEGORIA,
  pesoCategoria,
  agruparPorCategoria,
} from "@/modules/item/domain/categorias";

describe("pesoCategoria", () => {
  it("dado categorias conhecidas, então ordenam pela posição da lista", () => {
    // Dado
    const primeira = CATEGORIAS[0];
    const ultima = CATEGORIAS[CATEGORIAS.length - 1];

    // Quando / Então
    expect(pesoCategoria(primeira)).toBeLessThan(pesoCategoria(ultima));
  });

  it("dado uma categoria desconhecida, então vem depois das conhecidas", () => {
    // Dado
    const desconhecida = "Utilidades";

    // Quando
    const peso = pesoCategoria(desconhecida);

    // Então
    for (const categoria of CATEGORIAS) {
      expect(peso).toBeGreaterThan(pesoCategoria(categoria));
    }
  });

  it("dado 'Sem categoria', então fica sempre por último", () => {
    // Dado
    const desconhecida = "Utilidades";

    // Quando
    const pesoSemCategoria = pesoCategoria(SEM_CATEGORIA);

    // Então
    expect(pesoSemCategoria).toBeGreaterThan(pesoCategoria(desconhecida));
  });
});

describe("agruparPorCategoria", () => {
  it("dado itens de categorias distintas, então agrupa na ordem de prateleira", () => {
    // Dado: "Limpeza" vem depois de "Laticínios" na lista fixa
    const itens = [
      { nome: "Sabão", categoria: "Limpeza" },
      { nome: "Leite", categoria: "Laticínios" },
    ];

    // Quando
    const grupos = agruparPorCategoria(itens);

    // Então
    expect(grupos.map((g) => g.categoria)).toEqual(["Laticínios", "Limpeza"]);
  });

  it("dado um item sem categoria, então cai em 'Sem categoria', por último", () => {
    // Dado
    const itens = [
      { nome: "Isqueiro", categoria: null },
      { nome: "Leite", categoria: "Laticínios" },
    ];

    // Quando
    const grupos = agruparPorCategoria(itens);

    // Então
    expect(grupos[grupos.length - 1].categoria).toBe(SEM_CATEGORIA);
    expect(grupos[grupos.length - 1].itens.map((i) => i.nome)).toEqual([
      "Isqueiro",
    ]);
  });

  it("dado itens no mesmo grupo, então ordena por nome (pt-BR)", () => {
    // Dado
    const itens = [
      { nome: "Queijo", categoria: "Laticínios" },
      { nome: "Iogurte", categoria: "Laticínios" },
    ];

    // Quando
    const grupos = agruparPorCategoria(itens);

    // Então
    expect(grupos[0].itens.map((i) => i.nome)).toEqual(["Iogurte", "Queijo"]);
  });
});
