/*
  Estimativa de Despensa — domínio puro (sem I/O). Metade "estimarDespensa" do
  motor de aprendizado (spec-tecnica §5.1/§5.2): deriva quantidade e confiança
  a partir de proxies (nº de Compras, recência, último ajuste). A pontuação é
  interna e nunca é exposta: a UI só mostra o semáforo 🟢/🟡/🔴 (ADR-004).
  A outra metade ("gerarSugestao") vive em ./motor.ts.

  O "agora" é sempre injetado (`hoje`) para manter as funções testáveis.
*/

export type NivelConfianca = "alta" | "media" | "baixa";

export type TipoAjuste = "TEM" | "POUCO" | "ACABOU" | "PRECISO";

export type HistoricoItem = {
  /** Quantas Compras da Casa já incluíram este Item. */
  numeroCompras: number;
  /** Data da Compra mais recente que incluiu o Item (null se nenhuma). */
  ultimaCompraEm: Date | null;
  /** Ajuste manual mais recente do usuário, se houver. */
  ultimoAjuste: { tipo: TipoAjuste; em: Date } | null;
};

const MS_POR_DIA = 86_400_000;

/** Dias de calendário decorridos entre `data` e `hoje` (>= 0). */
export function diasDesde(data: Date, hoje: Date): number {
  const inicio = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.max(0, Math.round((inicio(hoje) - inicio(data)) / MS_POR_DIA));
}

function limitar(n: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, n));
}

/** O ajuste manual manda quando é o evento mais recente do Item (ADR-013). */
export function ajusteDomina(h: {
  ultimaCompraEm: Date | null;
  ultimoAjuste: { em: Date } | null;
}): boolean {
  if (!h.ultimoAjuste) return false;
  if (!h.ultimaCompraEm) return true;
  return h.ultimoAjuste.em.getTime() >= h.ultimaCompraEm.getTime();
}

/**
 * Nova `qtdEstimada` após uma escrita em Compra — registrar (Compra nova),
 * editar ou excluir (ADR-023) — para UM Item afetado. Em vez de recompor a
 * estimativa do zero (o que exigiria saber o valor exato que "Tem"/"Pouco"
 * deixaram, e esse valor não é persistido — só "Acabou"/"Preciso" têm
 * semântica absoluta), desfaz a contribuição antiga da linha desse Item na
 * Compra — se ela ainda "contava" para a estimativa — e refaz a nova, nas
 * mesmas condições. "Contar" depende só de a data estar no-ou-após o último
 * Ajuste (ou não haver Ajuste): um Ajuste redefine o que veio antes dele
 * (ADR-013) — a Compra nunca precisa saber o valor que o Ajuste fixou,
 * porque `qtdAtual` já o reflete.
 *
 * - Registrar: `dataAntiga=null, qtdAntiga=0` (nada a desfazer).
 * - Excluir:   `dataNova=null,  qtdNova=0`   (nada a refazer).
 * - Editar:    os dois lados, com os valores de antes/depois da edição.
 *
 * Resultado nunca fica negativo (o pior caso vira 0, papel do "Acabou").
 */
export function ajustarQtdAposEscritaDeCompra({
  qtdAtual,
  ultimoAjuste,
  dataAntiga,
  qtdAntiga,
  dataNova,
  qtdNova,
}: {
  qtdAtual: number;
  ultimoAjuste: { em: Date } | null;
  dataAntiga: Date | null;
  qtdAntiga: number;
  dataNova: Date | null;
  qtdNova: number;
}): number {
  const conta = (data: Date | null) =>
    data !== null && (!ultimoAjuste || data.getTime() >= ultimoAjuste.em.getTime());

  let qtd = qtdAtual;
  if (conta(dataAntiga)) qtd -= qtdAntiga;
  if (conta(dataNova)) qtd += qtdNova;
  return Math.max(0, qtd);
}

/**
 * Nova `qtdEstimada` após um ajuste rápido (ADR-007). "Tem" e "Pouco" afirmam
 * que o Item ainda existe — nunca deixam a estimativa em zero (zerar é papel
 * exclusivo do "Acabou"). Se ela já estava zerada (ex.: "Acabou" confirmado
 * depois com "Tem"), parte da quantidade da última Compra — mesmo fallback da
 * rederivação (ADR-023) — ou de 1, sem histórico de Compra.
 */
export function calcularNovaQtdAposAjuste({
  tipo,
  valor,
  qtdAtual,
  qtdUltimaCompra,
}: {
  tipo: TipoAjuste;
  valor?: number;
  qtdAtual: number;
  qtdUltimaCompra: number | null;
}): number {
  if (tipo === "ACABOU") return 0;
  if (tipo === "PRECISO") return valor ?? qtdAtual;

  const base =
    qtdAtual > 0 ? qtdAtual : qtdUltimaCompra && qtdUltimaCompra > 0 ? qtdUltimaCompra : 1;

  if (tipo === "TEM") return base;
  return base <= 1 ? base : Math.floor(base / 2); // POUCO: reduz, nunca zera.
}

const PONTUACAO_POR_AJUSTE: Record<TipoAjuste, number> = {
  TEM: 0.9,
  PRECISO: 0.85,
  POUCO: 0.5,
  ACABOU: 0.2,
};

/**
 * Pontuação interna de confiança (0–1). Nunca exposta na UI (ADR-004).
 * Um ajuste recente domina; senão, recência da última Compra guia, com um
 * pequeno bônus por histórico (mais Compras → um pouco mais de certeza).
 */
export function calcularConfianca(h: HistoricoItem, hoje: Date): number {
  if (ajusteDomina(h)) return PONTUACAO_POR_AJUSTE[h.ultimoAjuste!.tipo];
  if (!h.ultimaCompraEm) return 0.2;

  const dias = diasDesde(h.ultimaCompraEm, hoje);
  const recencia = dias <= 7 ? 0.85 : dias <= 21 ? 0.6 : dias <= 45 ? 0.4 : 0.2;
  const bonusHistorico =
    h.numeroCompras >= 3 ? 0.1 : h.numeroCompras === 2 ? 0.05 : 0;

  return limitar(recencia + bonusHistorico);
}

/** Traduz a pontuação interna no nível do semáforo. */
export function nivelConfianca(pontuacao: number): NivelConfianca {
  if (pontuacao >= 0.66) return "alta";
  if (pontuacao >= 0.4) return "media";
  return "baixa";
}

/**
 * Texto qualitativo da quantidade (mapeamento do protótipo). Nunca mostra
 * pontuação; a granularidade acompanha a confiança.
 */
export function textoQuantidade({
  qtd,
  unidade,
  nivel,
}: {
  qtd: number;
  unidade: string | null;
  nivel: NivelConfianca;
}): string {
  if (qtd <= 0) return "acabou";
  if (nivel === "alta") return `~${qtd} ${unidade ?? "un"}`.trim();
  if (nivel === "media") return "aprox.";
  return "?";
}

/** Explicação doméstica gerada por template a partir dos números (ADR-008). */
export function gerarExplicacao(h: HistoricoItem, hoje: Date): string {
  if (ajusteDomina(h)) {
    switch (h.ultimoAjuste!.tipo) {
      case "TEM":
        return "Você confirmou que ainda tem — por isso a confiança está alta.";
      case "PRECISO":
        return "Você ajustou a quantidade manualmente há pouco.";
      case "POUCO":
        return "Você marcou que está acabando; coloquei na sua lista mental de reposição.";
      case "ACABOU":
        return "Você marcou que acabou.";
    }
  }

  if (!h.ultimaCompraEm) return "Ainda sem Compras registradas deste Item.";

  const dias = diasDesde(h.ultimaCompraEm, hoje);
  const tempo = dias === 0 ? "hoje" : dias === 1 ? "há 1 dia" : `há ${dias} dias`;

  if (h.numeroCompras <= 1) {
    return `Última compra ${tempo} e com pouco histórico — ainda não tenho certeza de quanto restou.`;
  }
  if (dias <= 21) {
    return `Comprado ${tempo}; pela sua média, deve haver o suficiente.`;
  }
  return `Última compra ${tempo} — pela sua média, pode estar acabando.`;
}
