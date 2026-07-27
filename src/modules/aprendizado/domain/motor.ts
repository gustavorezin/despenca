/*
  Motor de aprendizado — domínio puro (sem I/O). Heurística determinística F0
  (spec-tecnica §5.2, ADR-013): decide se um Item deve virar Sugestão a partir de
  proxies (frequência entre Compras, recência, último ajuste). O "agora" é
  injetado (`hoje`) para manter tudo testável.

  Interface estável (§5.1): no futuro (F2/LLM) troca-se a implementação sem mexer
  em quem consome. Números e decisão vêm daqui; linguagem também é template simples.
*/

import { ajusteDomina, diasDesde, type TipoAjuste } from "./estimativa";

export type MotivoSugestao = "PROVAVELMENTE_ACABANDO" | "RECORRENTE";

export type HistoricoAprendizado = {
  /** Nº de Compras distintas da Casa que incluíram o Item. */
  numeroCompras: number;
  primeiraCompraEm: Date | null;
  ultimaCompraEm: Date | null;
  ultimoAjuste: { tipo: TipoAjuste; em: Date } | null;
};

export type Sugestao = {
  motivo: MotivoSugestao;
  /** Microcópia curta para a linha da Lista (ex.: "compra a cada ~3 semanas"). */
  resumo: string;
  /** Frase completa para o bottom sheet de explicação (ADR-008). */
  explicacao: string;
  qtdSugerida: number;
};

/** Intervalo médio entre Compras do Item, em dias. `null` com menos de 2 Compras. */
export function intervaloMedioDias(h: HistoricoAprendizado): number | null {
  if (h.numeroCompras < 2 || !h.primeiraCompraEm || !h.ultimaCompraEm) {
    return null;
  }
  const total = diasDesde(h.primeiraCompraEm, h.ultimaCompraEm);
  if (total <= 0) return null;
  return total / (h.numeroCompras - 1);
}

/** "~2 semanas" / "~5 dias" — linguagem doméstica (§7.5), sem números crus de intervalo. */
function humanizarIntervalo(dias: number): string {
  if (dias >= 12) {
    const semanas = Math.max(1, Math.round(dias / 7));
    return semanas === 1 ? "~1 semana" : `~${semanas} semanas`;
  }
  const d = Math.max(1, Math.round(dias));
  return d === 1 ? "~1 dia" : `~${d} dias`;
}

/**
 * Decide se o Item deve virar Sugestão, com motivo, microcópia e explicação.
 * Quando um Item se encaixa em mais de um motivo, "provavelmente acabando" tem
 * prioridade sobre "recorrente" (ADR-006).
 */
export function gerarSugestao(
  h: HistoricoAprendizado,
  hoje: Date,
): Sugestao | null {
  // 1) Ajuste manual recente manda (proxy forte, ADR-013).
  if (ajusteDomina(h)) {
    const tipo = h.ultimoAjuste!.tipo;
    if (tipo === "ACABOU") {
      return {
        motivo: "PROVAVELMENTE_ACABANDO",
        resumo: "você marcou que acabou",
        explicacao: "Você marcou que acabou — deixei no topo da sua Lista.",
        qtdSugerida: 1,
      };
    }
    if (tipo === "POUCO") {
      return {
        motivo: "PROVAVELMENTE_ACABANDO",
        resumo: "você marcou que está pouco",
        explicacao: "Você marcou que está acabando, então trouxe para a Lista.",
        qtdSugerida: 1,
      };
    }
    // TEM (confirmou que tem) ou PRECISO (acabou de informar a quantidade): em
    // ambos o usuário calibrou o estoque há pouco, então não sugerimos.
    // (Simplificação F0: um PRECISO de valor 0 não vira Sugestão porque o motor
    // não recebe o valor do ajuste — refinar quando o proxy carregar a quantidade.)
    return null;
  }

  // 2) Sem histórico suficiente para inferir frequência.
  const intervalo = intervaloMedioDias(h);
  if (intervalo === null || !h.ultimaCompraEm) return null;

  const dias = diasDesde(h.ultimaCompraEm, hoje);
  const cadencia = humanizarIntervalo(intervalo);

  // 3) Passou (ou está no fim) do intervalo típico → provavelmente acabando.
  if (dias >= intervalo * 0.9) {
    return {
      motivo: "PROVAVELMENTE_ACABANDO",
      resumo: `compra a cada ${cadencia}`,
      explicacao: `Você costuma comprar a cada ${cadencia}, e a última foi há ${dias} dia${dias === 1 ? "" : "s"} — provavelmente está acabando.`,
      qtdSugerida: 1,
    };
  }

  // 4) Item frequente e já a caminho do intervalo → recorrente (lembrete suave).
  if (h.numeroCompras >= 3 && dias >= intervalo * 0.6) {
    return {
      motivo: "RECORRENTE",
      resumo: `costuma comprar a cada ${cadencia}`,
      explicacao: `Costuma entrar nas suas Compras a cada ${cadencia}. Ainda deve ter, mas fica de olho.`,
      qtdSugerida: 1,
    };
  }

  // 5) Comprado há pouco em relação ao hábito → não precisa.
  return null;
}
