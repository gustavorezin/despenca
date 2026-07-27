import { describe, it, expect } from "vitest";
import { normalizarNome } from "@/modules/item/domain/normalizacao";

describe("normalizarNome", () => {
  it("dado um texto com espaços extras, então apara e colapsa os espaços", () => {
    // Dado
    const bruto = "  leite   em  pó ";

    // Quando
    const nome = normalizarNome(bruto);

    // Então
    expect(nome).toBe("Leite em pó");
  });

  it("dado um texto em minúsculas, então capitaliza só a 1ª letra", () => {
    // Dado
    const bruto = "café";

    // Quando
    const nome = normalizarNome(bruto);

    // Então
    expect(nome).toBe("Café");
  });

  it("dado um texto já normalizado, então preserva como está", () => {
    // Dado
    const bruto = "Leite Integral";

    // Quando
    const nome = normalizarNome(bruto);

    // Então
    expect(nome).toBe("Leite Integral");
  });

  it("dado um texto vazio ou só de espaços, então devolve vazio", () => {
    // Dado / Quando / Então
    expect(normalizarNome("")).toBe("");
    expect(normalizarNome("   ")).toBe("");
  });
});
