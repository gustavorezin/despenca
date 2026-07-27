import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TipoAjuste } from "@/modules/aprendizado/domain/estimativa";

type LinhaHistorico = {
  numeroCompras: number;
  ultimaCompraEm: Date | null;
  ultimoAjuste: { tipo: TipoAjuste; em: Date } | null;
};

export const DespensaRepository = {
  /** Cria/atualiza a estimativa de um Item (1 DespensaItem por Item). */
  async upsertItem({
    db = prisma,
    casaId,
    itemId,
    qtdEstimada,
    confianca,
    ultimaCompraEm,
  }: {
    db?: Prisma.TransactionClient;
    casaId: string;
    itemId: string;
    qtdEstimada: number;
    confianca: number;
    ultimaCompraEm: Date | null;
  }) {
    return db.despensaItem.upsert({
      where: { itemId },
      create: { casaId, itemId, qtdEstimada, confianca, ultimaCompraEm },
      update: { qtdEstimada, confianca, ultimaCompraEm },
      select: { id: true },
    });
  },

  async obterPorItem({
    db = prisma,
    casaId,
    itemId,
  }: {
    db?: Prisma.TransactionClient;
    casaId: string;
    itemId: string;
  }) {
    return db.despensaItem.findFirst({
      where: { casaId, itemId },
      select: { id: true, qtdEstimada: true },
    });
  },

  async registrarAjuste({
    db = prisma,
    casaId,
    itemId,
    tipo,
    valor,
  }: {
    db?: Prisma.TransactionClient;
    casaId: string;
    itemId: string;
    tipo: TipoAjuste;
    valor?: number | null;
  }) {
    return db.ajusteDespensa.create({
      data: { casaId, itemId, tipo, valor: valor ?? null },
      select: { id: true },
    });
  },

  /** Remove a estimativa de um Item (quando ele fica sem nenhuma fonte). */
  async removerItem({
    db = prisma,
    casaId,
    itemId,
  }: {
    db?: Prisma.TransactionClient;
    casaId: string;
    itemId: string;
  }) {
    return db.despensaItem.deleteMany({ where: { casaId, itemId } });
  },

  /**
   * Histórico de proxies de um Item, para (re)calcular confiança. `qtdUltimaCompra`
   * soma as linhas do Item na Compra de data mais recente (empate de data
   * desempatado por `criadaEm`) — usada como base de "Tem"/"Pouco" quando a
   * estimativa já zerou (`calcularNovaQtdAposAjuste`, em ajustarDespensa).
   */
  async historicoItem({
    db = prisma,
    casaId,
    itemId,
  }: {
    db?: Prisma.TransactionClient;
    casaId: string;
    itemId: string;
  }): Promise<LinhaHistorico & { qtdUltimaCompra: number | null }> {
    const [numeroCompras, ultimaCompra, ultimoAjuste] = await Promise.all([
      // nº de Compras distintas que incluíram o Item (não de linhas).
      db.compra.count({ where: { casaId, itens: { some: { itemId } } } }),
      db.compra.findFirst({
        where: { casaId, itens: { some: { itemId } } },
        orderBy: [{ data: "desc" }, { criadaEm: "desc" }],
        select: {
          data: true,
          itens: { where: { itemId }, select: { quantidade: true } },
        },
      }),
      db.ajusteDespensa.findFirst({
        where: { casaId, itemId },
        orderBy: { em: "desc" },
        select: { tipo: true, em: true },
      }),
    ]);

    return {
      numeroCompras,
      ultimaCompraEm: ultimaCompra?.data ?? null,
      qtdUltimaCompra: ultimaCompra
        ? ultimaCompra.itens.reduce((soma, l) => soma + Number(l.quantidade), 0)
        : null,
      ultimoAjuste: ultimoAjuste
        ? { tipo: ultimoAjuste.tipo as TipoAjuste, em: ultimoAjuste.em }
        : null,
    };
  },

  /**
   * Todos os DespensaItens da Casa com o contexto necessário para recalcular a
   * confiança na leitura (nº de Compras e último ajuste, em consultas batelada).
   */
  async listarComHistorico({ casaId }: { casaId: string }) {
    const itens = await prisma.despensaItem.findMany({
      where: { casaId },
      select: {
        id: true,
        itemId: true,
        qtdEstimada: true,
        ultimaCompraEm: true,
        item: {
          select: {
            nomeCanonico: true,
            categoria: true,
            unidadePadrao: true,
          },
        },
      },
    });
    if (itens.length === 0) return [];

    const itemIds = itens.map((i) => i.itemId);

    const [paresItemCompra, ajustes] = await Promise.all([
      // um par (itemId, compraId) por Compra distinta que incluiu o Item —
      // contamos os pares por Item para obter o nº de Compras (não de linhas).
      prisma.compraItem.groupBy({
        by: ["itemId", "compraId"],
        where: { itemId: { in: itemIds }, compra: { casaId } },
      }),
      prisma.ajusteDespensa.findMany({
        where: { casaId, itemId: { in: itemIds } },
        orderBy: { em: "desc" },
        select: { itemId: true, tipo: true, em: true },
      }),
    ]);

    const contagemPorItem = new Map<string, number>();
    for (const par of paresItemCompra) {
      contagemPorItem.set(
        par.itemId,
        (contagemPorItem.get(par.itemId) ?? 0) + 1,
      );
    }
    const ajustePorItem = new Map<string, { tipo: TipoAjuste; em: Date }>();
    for (const a of ajustes) {
      if (!ajustePorItem.has(a.itemId)) {
        ajustePorItem.set(a.itemId, { tipo: a.tipo as TipoAjuste, em: a.em });
      }
    }

    return itens.map((i) => ({
      id: i.id,
      itemId: i.itemId,
      nome: i.item.nomeCanonico,
      categoria: i.item.categoria,
      unidade: i.item.unidadePadrao,
      qtdEstimada: Number(i.qtdEstimada),
      historico: {
        numeroCompras: contagemPorItem.get(i.itemId) ?? 0,
        ultimaCompraEm: i.ultimaCompraEm,
        ultimoAjuste: ajustePorItem.get(i.itemId) ?? null,
      } satisfies LinhaHistorico,
    }));
  },
};
