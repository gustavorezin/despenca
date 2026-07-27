import { describe, it, expect } from "vitest";
import {
  calcularConfianca,
  nivelConfianca,
  textoQuantidade,
  gerarExplicacao,
  diasDesde,
  calcularNovaQtdAposAjuste,
  ajustarQtdAposEscritaDeCompra,
  type HistoricoItem,
} from "@/modules/aprendizado/domain/estimativa";

const hoje = new Date("2026-07-11T12:00:00Z");
const diasAtras = (n: number) => new Date(hoje.getTime() - n * 86_400_000);

function historico(over: Partial<HistoricoItem> = {}): HistoricoItem {
  return {
    numeroCompras: 1,
    ultimaCompraEm: diasAtras(2),
    ultimoAjuste: null,
    ...over,
  };
}

describe("diasDesde", () => {
  it("dado uma data no passado, então conta os dias de calendário decorridos", () => {
    // Dado
    const data = diasAtras(18);

    // Quando
    const dias = diasDesde(data, hoje);

    // Então
    expect(dias).toBe(18);
  });

  it("dado uma data no futuro, então nunca retorna negativo", () => {
    // Dado
    const data = diasAtras(-5);

    // Quando
    const dias = diasDesde(data, hoje);

    // Então
    expect(dias).toBe(0);
  });
});

describe("calcularConfianca + nivelConfianca", () => {
  it("dado uma compra há poucos dias, então a confiança é alta", () => {
    // Dado
    const h = historico({ numeroCompras: 1, ultimaCompraEm: diasAtras(1) });

    // Quando
    const nivel = nivelConfianca(calcularConfianca(h, hoje));

    // Então
    expect(nivel).toBe("alta");
  });

  it("dado que a última compra envelhece, então a confiança cai para média", () => {
    // Dado
    const h = historico({ ultimaCompraEm: diasAtras(18) });

    // Quando
    const nivel = nivelConfianca(calcularConfianca(h, hoje));

    // Então
    expect(nivel).toBe("media");
  });

  it("dado uma compra muito antiga, então a confiança é baixa", () => {
    // Dado
    const h = historico({ ultimaCompraEm: diasAtras(60) });

    // Quando
    const nivel = nivelConfianca(calcularConfianca(h, hoje));

    // Então
    expect(nivel).toBe("baixa");
  });

  it("dado um item sem nenhuma compra, então a confiança é baixa", () => {
    // Dado
    const h = historico({ numeroCompras: 0, ultimaCompraEm: null });

    // Quando
    const nivel = nivelConfianca(calcularConfianca(h, hoje));

    // Então
    expect(nivel).toBe("baixa");
  });

  it("dado muitas compras recentes, então a pontuação permanece dentro de 0..1", () => {
    // Dado
    const h = historico({ numeroCompras: 9, ultimaCompraEm: diasAtras(0) });

    // Quando
    const pontuacao = calcularConfianca(h, hoje);

    // Então
    expect(pontuacao).toBeGreaterThanOrEqual(0);
    expect(pontuacao).toBeLessThanOrEqual(1);
  });
});

describe("nivelConfianca — limiares do semáforo", () => {
  it("dado a pontuação exatamente em 0.66, então o nível é alto", () => {
    // Dado / Quando / Então (fronteira alta ↔ média)
    expect(nivelConfianca(0.66)).toBe("alta");
    expect(nivelConfianca(0.659)).toBe("media");
  });

  it("dado a pontuação exatamente em 0.4, então o nível é médio", () => {
    // Dado / Quando / Então (fronteira média ↔ baixa)
    expect(nivelConfianca(0.4)).toBe("media");
    expect(nivelConfianca(0.399)).toBe("baixa");
  });
});

describe("calcularConfianca — fronteiras de recência", () => {
  // numeroCompras = 1 isola a recência (bônus de histórico = 0).
  it("dado a última compra há 7 dias, então ainda é alta; no 8º dia, cai para média", () => {
    // Dado
    const noLimite = historico({ numeroCompras: 1, ultimaCompraEm: diasAtras(7) });
    const passouDoLimite = historico({
      numeroCompras: 1,
      ultimaCompraEm: diasAtras(8),
    });

    // Quando + Então
    expect(nivelConfianca(calcularConfianca(noLimite, hoje))).toBe("alta");
    expect(nivelConfianca(calcularConfianca(passouDoLimite, hoje))).toBe(
      "media",
    );
  });

  it("dado a última compra há 45 dias, então é média; no 46º dia, cai para baixa", () => {
    // Dado
    const noLimite = historico({
      numeroCompras: 1,
      ultimaCompraEm: diasAtras(45),
    });
    const passouDoLimite = historico({
      numeroCompras: 1,
      ultimaCompraEm: diasAtras(46),
    });

    // Quando + Então
    expect(nivelConfianca(calcularConfianca(noLimite, hoje))).toBe("media");
    expect(nivelConfianca(calcularConfianca(passouDoLimite, hoje))).toBe(
      "baixa",
    );
  });
});

describe("calcularConfianca — o ajuste manual mais recente domina", () => {
  it("dado 'Tem' após uma compra antiga, então a confiança é alta", () => {
    // Dado
    const h = historico({
      ultimaCompraEm: diasAtras(50),
      ultimoAjuste: { tipo: "TEM", em: diasAtras(1) },
    });

    // Quando
    const nivel = nivelConfianca(calcularConfianca(h, hoje));

    // Então
    expect(nivel).toBe("alta");
  });

  it("dado 'Acabou' após uma compra recente, então a confiança é baixa", () => {
    // Dado
    const h = historico({
      ultimaCompraEm: diasAtras(1),
      ultimoAjuste: { tipo: "ACABOU", em: diasAtras(0) },
    });

    // Quando
    const nivel = nivelConfianca(calcularConfianca(h, hoje));

    // Então
    expect(nivel).toBe("baixa");
  });

  it("dado um ajuste mais antigo que a última compra, então a compra prevalece", () => {
    // Dado: comprou depois de ter marcado 'Acabou' → a compra é o evento mais recente
    const h = historico({
      numeroCompras: 2,
      ultimaCompraEm: diasAtras(1),
      ultimoAjuste: { tipo: "ACABOU", em: diasAtras(10) },
    });

    // Quando
    const nivel = nivelConfianca(calcularConfianca(h, hoje));

    // Então
    expect(nivel).toBe("alta");
  });
});

describe("calcularNovaQtdAposAjuste", () => {
  it("dado 'Acabou', então zera independente da quantidade atual ou do histórico", () => {
    // Dado / Quando / Então
    expect(
      calcularNovaQtdAposAjuste({
        tipo: "ACABOU",
        qtdAtual: 5,
        qtdUltimaCompra: 8,
      }),
    ).toBe(0);
  });

  it("dado 'Preciso' com valor informado, então usa o valor exato", () => {
    // Dado / Quando / Então
    expect(
      calcularNovaQtdAposAjuste({
        tipo: "PRECISO",
        valor: 3,
        qtdAtual: 5,
        qtdUltimaCompra: null,
      }),
    ).toBe(3);
  });

  it("dado 'Tem' com estimativa positiva, então mantém a quantidade atual", () => {
    // Dado / Quando / Então
    expect(
      calcularNovaQtdAposAjuste({
        tipo: "TEM",
        qtdAtual: 4,
        qtdUltimaCompra: null,
      }),
    ).toBe(4);
  });

  it("dado 'Tem' após a estimativa ter zerado (ex.: 'Acabou' anterior), então parte da última Compra", () => {
    // Dado: bug relatado — confiança sobe mas a quantidade ficava travada em 0
    const resultado = calcularNovaQtdAposAjuste({
      tipo: "TEM",
      qtdAtual: 0,
      qtdUltimaCompra: 3,
    });

    // Então
    expect(resultado).toBe(3);
    expect(resultado).toBeGreaterThan(0);
  });

  it("dado 'Tem' com estimativa zerada e sem histórico de Compra, então assume 1", () => {
    // Dado / Quando / Então
    expect(
      calcularNovaQtdAposAjuste({
        tipo: "TEM",
        qtdAtual: 0,
        qtdUltimaCompra: null,
      }),
    ).toBe(1);
  });

  it("dado 'Pouco' com estimativa acima de 1, então reduz pela metade", () => {
    // Dado / Quando / Então
    expect(
      calcularNovaQtdAposAjuste({
        tipo: "POUCO",
        qtdAtual: 6,
        qtdUltimaCompra: null,
      }),
    ).toBe(3);
  });

  it("dado 'Pouco' com estimativa em 1, então mantém — nunca zera por essa via", () => {
    // Dado / Quando / Então
    expect(
      calcularNovaQtdAposAjuste({
        tipo: "POUCO",
        qtdAtual: 1,
        qtdUltimaCompra: null,
      }),
    ).toBe(1);
  });

  it("dado 'Pouco' com estimativa já zerada, então parte da última Compra (reduzida) e nunca zera", () => {
    // Dado / Quando / Então
    const resultado = calcularNovaQtdAposAjuste({
      tipo: "POUCO",
      qtdAtual: 0,
      qtdUltimaCompra: 4,
    });

    expect(resultado).toBe(2);
    expect(resultado).toBeGreaterThan(0);
  });

  it("dado 'Pouco' com estimativa zerada e sem histórico de Compra, então assume 1", () => {
    // Dado / Quando / Então
    expect(
      calcularNovaQtdAposAjuste({
        tipo: "POUCO",
        qtdAtual: 0,
        qtdUltimaCompra: null,
      }),
    ).toBe(1);
  });
});

describe("ajustarQtdAposEscritaDeCompra", () => {
  it("dado registrar uma Compra sem nenhum Ajuste, então soma ao que já havia", () => {
    // Dado: bug relatado — 3 Compras manuais de 1 arroz cada ficavam em 1un
    let qtd = 0;
    for (let i = 0; i < 3; i++) {
      qtd = ajustarQtdAposEscritaDeCompra({
        qtdAtual: qtd,
        ultimoAjuste: null,
        dataAntiga: null,
        qtdAntiga: 0,
        dataNova: diasAtras(0),
        qtdNova: 1,
      });
    }

    // Então
    expect(qtd).toBe(3);
  });

  it("dado registrar uma Compra retroativa mais antiga que o último Ajuste, então não altera a estimativa", () => {
    // Dado: usuário esqueceu de registrar uma compra de antes do "Acabou"
    const qtd = ajustarQtdAposEscritaDeCompra({
      qtdAtual: 0,
      ultimoAjuste: { em: diasAtras(5) },
      dataAntiga: null,
      qtdAntiga: 0,
      dataNova: diasAtras(10),
      qtdNova: 4,
    });

    // Então: o Ajuste já redefiniu o estado depois dessa Compra (ADR-013)
    expect(qtd).toBe(0);
  });

  it("dado registrar uma Compra após 'Acabou', então soma a partir de zero", () => {
    // Dado
    const qtd = ajustarQtdAposEscritaDeCompra({
      qtdAtual: 0,
      ultimoAjuste: { em: diasAtras(2) },
      dataAntiga: null,
      qtdAntiga: 0,
      dataNova: diasAtras(0),
      qtdNova: 2,
    });

    // Então
    expect(qtd).toBe(2);
  });

  it("dado registrar uma Compra após 'Tem', então soma à quantidade confirmada", () => {
    // Dado: "Tem" confirmou 5 (valor não recuperável do histórico — por isso
    // soma sobre `qtdAtual`, não recompõe do zero)
    const qtd = ajustarQtdAposEscritaDeCompra({
      qtdAtual: 5,
      ultimoAjuste: { em: diasAtras(3) },
      dataAntiga: null,
      qtdAntiga: 0,
      dataNova: diasAtras(0),
      qtdNova: 1,
    });

    // Então
    expect(qtd).toBe(6);
  });

  it("dado editar uma Compra alterando a quantidade de um Item, então soma só a diferença", () => {
    // Dado: a Compra tinha 1 unidade e passou a ter 5 (mesma data)
    const data = diasAtras(1);
    const qtd = ajustarQtdAposEscritaDeCompra({
      qtdAtual: 3, // 3 compras de 1 já registradas, incluindo esta
      ultimoAjuste: null,
      dataAntiga: data,
      qtdAntiga: 1,
      dataNova: data,
      qtdNova: 5,
    });

    // Então: 3 - 1 (desfaz) + 5 (refaz) = 7
    expect(qtd).toBe(7);
  });

  it("dado editar um campo que não muda a quantidade, então a estimativa não se altera", () => {
    // Dado: só a descrição mudou; quantidade antiga e nova são iguais
    const data = diasAtras(1);
    const qtd = ajustarQtdAposEscritaDeCompra({
      qtdAtual: 3,
      ultimoAjuste: null,
      dataAntiga: data,
      qtdAntiga: 1,
      dataNova: data,
      qtdNova: 1,
    });

    // Então
    expect(qtd).toBe(3);
  });

  it("dado editar uma Compra mais antiga que o último Ajuste, então não afeta a estimativa atual", () => {
    // Dado: a Compra editada já estava "coberta" por um Ajuste posterior
    const qtd = ajustarQtdAposEscritaDeCompra({
      qtdAtual: 2,
      ultimoAjuste: { em: diasAtras(5) },
      dataAntiga: diasAtras(10),
      qtdAntiga: 1,
      dataNova: diasAtras(10),
      qtdNova: 99,
    });

    // Então
    expect(qtd).toBe(2);
  });

  it("dado excluir uma Compra, então desfaz a contribuição dela", () => {
    // Dado: 3 compras de 1 já somadas (qtdAtual=3); exclui uma delas
    const qtd = ajustarQtdAposEscritaDeCompra({
      qtdAtual: 3,
      ultimoAjuste: null,
      dataAntiga: diasAtras(1),
      qtdAntiga: 1,
      dataNova: null,
      qtdNova: 0,
    });

    // Então
    expect(qtd).toBe(2);
  });

  it("dado excluir uma Compra mais antiga que o último Ajuste, então não afeta a estimativa atual", () => {
    // Dado
    const qtd = ajustarQtdAposEscritaDeCompra({
      qtdAtual: 4,
      ultimoAjuste: { em: diasAtras(3) },
      dataAntiga: diasAtras(10),
      qtdAntiga: 7,
      dataNova: null,
      qtdNova: 0,
    });

    // Então
    expect(qtd).toBe(4);
  });

  it("dado um resultado que ficaria negativo, então nunca fica abaixo de zero", () => {
    // Dado
    const qtd = ajustarQtdAposEscritaDeCompra({
      qtdAtual: 1,
      ultimoAjuste: null,
      dataAntiga: diasAtras(1),
      qtdAntiga: 5,
      dataNova: null,
      qtdNova: 0,
    });

    // Então
    expect(qtd).toBe(0);
  });
});

describe("textoQuantidade", () => {
  it("dado quantidade zero, então mostra 'acabou'", () => {
    // Dado
    const entrada = { qtd: 0, unidade: "un", nivel: "baixa" as const };

    // Quando
    const texto = textoQuantidade(entrada);

    // Então
    expect(texto).toBe("acabou");
  });

  it("dado confiança alta, então mostra a quantidade aproximada com a unidade", () => {
    // Dado
    const entrada = { qtd: 2, unidade: "pacote", nivel: "alta" as const };

    // Quando
    const texto = textoQuantidade(entrada);

    // Então
    expect(texto).toBe("~2 pacote");
  });

  it("dado uma unidade ausente, então usa 'un' como padrão", () => {
    // Dado
    const entrada = { qtd: 1, unidade: null, nivel: "alta" as const };

    // Quando
    const texto = textoQuantidade(entrada);

    // Então
    expect(texto).toBe("~1 un");
  });

  it("dado incerteza, então esconde o número (média → 'aprox.', baixa → '?')", () => {
    // Dado / Quando / Então
    expect(textoQuantidade({ qtd: 3, unidade: "un", nivel: "media" })).toBe(
      "aprox.",
    );
    expect(textoQuantidade({ qtd: 3, unidade: "un", nivel: "baixa" })).toBe("?");
  });
});

describe("gerarExplicacao", () => {
  it("dado pouco histórico na primeira compra, então cita o histórico curto", () => {
    // Dado
    const h = historico({ numeroCompras: 1, ultimaCompraEm: diasAtras(18) });

    // Quando
    const texto = gerarExplicacao(h, hoje);

    // Então
    expect(texto).toContain("pouco histórico");
  });

  it("dado 'Acabou' como evento mais recente, então a explicação reflete o ajuste", () => {
    // Dado
    const h = historico({ ultimoAjuste: { tipo: "ACABOU", em: diasAtras(0) } });

    // Quando
    const texto = gerarExplicacao(h, hoje);

    // Então
    expect(texto).toContain("acabou");
  });

  it("dado um item recorrente, então cita o tempo desde a última compra", () => {
    // Dado
    const h = historico({ numeroCompras: 4, ultimaCompraEm: diasAtras(10) });

    // Quando
    const texto = gerarExplicacao(h, hoje);

    // Então
    expect(texto).toContain("10 dias");
  });
});
