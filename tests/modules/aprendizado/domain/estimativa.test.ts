import { describe, it, expect } from "vitest";
import {
  calcularConfianca,
  nivelConfianca,
  textoQuantidade,
  gerarExplicacao,
  diasDesde,
  rederivarQtdEstimada,
  calcularNovaQtdAposAjuste,
  type HistoricoItem,
  type HistoricoRederivacao,
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

describe("rederivarQtdEstimada", () => {
  function historicoRederivacao(
    over: Partial<HistoricoRederivacao> = {},
  ): HistoricoRederivacao {
    return { ...historico(), qtdUltimaCompra: 2, ...over };
  }

  it("dado um item sem compras e sem ajuste, então remove da Despensa", () => {
    // Dado
    const h = historicoRederivacao({
      numeroCompras: 0,
      ultimaCompraEm: null,
      qtdUltimaCompra: null,
      ultimoAjuste: null,
    });

    // Quando
    const qtd = rederivarQtdEstimada(h, 3);

    // Então
    expect(qtd).toBeNull();
  });

  it("dado um item sem compras mas com ajuste, então mantém a quantidade atual", () => {
    // Dado: todas as Compras do item foram excluídas, mas houve "Preciso"
    const h = historicoRederivacao({
      numeroCompras: 0,
      ultimaCompraEm: null,
      qtdUltimaCompra: null,
      ultimoAjuste: { tipo: "PRECISO", em: diasAtras(3) },
    });

    // Quando
    const qtd = rederivarQtdEstimada(h, 4);

    // Então
    expect(qtd).toBe(4);
  });

  it("dado um ajuste mais recente que a última compra, então a quantidade atual é preservada", () => {
    // Dado: usuário marcou "Acabou" ontem; a Compra editada é mais antiga
    const h = historicoRederivacao({
      ultimaCompraEm: diasAtras(10),
      qtdUltimaCompra: 5,
      ultimoAjuste: { tipo: "ACABOU", em: diasAtras(1) },
    });

    // Quando
    const qtd = rederivarQtdEstimada(h, 0);

    // Então
    expect(qtd).toBe(0);
  });

  it("dado uma compra mais recente que o ajuste, então a quantidade da última compra prevalece", () => {
    // Dado
    const h = historicoRederivacao({
      ultimaCompraEm: diasAtras(1),
      qtdUltimaCompra: 6,
      ultimoAjuste: { tipo: "POUCO", em: diasAtras(9) },
    });

    // Quando
    const qtd = rederivarQtdEstimada(h, 1);

    // Então
    expect(qtd).toBe(6);
  });

  it("dado uma edição que altera a quantidade da última compra, então a Despensa reflete a nova quantidade", () => {
    // Dado: a Compra mais recente passou de 2 para 8 unidades
    const h = historicoRederivacao({
      ultimaCompraEm: diasAtras(2),
      qtdUltimaCompra: 8,
      ultimoAjuste: null,
    });

    // Quando
    const qtd = rederivarQtdEstimada(h, 2);

    // Então
    expect(qtd).toBe(8);
  });

  it("dado ajuste e compra no mesmo instante, então o ajuste domina", () => {
    // Dado: empate de timestamps (consistente com calcularConfianca)
    const mesmoInstante = diasAtras(1);
    const h = historicoRederivacao({
      ultimaCompraEm: mesmoInstante,
      qtdUltimaCompra: 7,
      ultimoAjuste: { tipo: "ACABOU", em: mesmoInstante },
    });

    // Quando
    const qtd = rederivarQtdEstimada(h, 0);

    // Então
    expect(qtd).toBe(0);
  });

  it("dado um item novo sem DespensaItem atual, então nasce com a quantidade da última compra", () => {
    // Dado
    const h = historicoRederivacao({
      ultimaCompraEm: diasAtras(0),
      qtdUltimaCompra: 3,
      ultimoAjuste: null,
    });

    // Quando
    const qtd = rederivarQtdEstimada(h, null);

    // Então
    expect(qtd).toBe(3);
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
