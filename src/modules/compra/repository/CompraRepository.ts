import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type LinhaResolvida = {
  itemId: string;
  quantidade: number;
  unidade?: string | null;
};

/** Quantidade de um Item numa Compra — soma de linhas, se houver mais de uma. */
type ItemNaCompra = { itemId: string; quantidade: number };

function somarPorItem(
  itens: { itemId: string; quantidade: Prisma.Decimal | number }[],
): ItemNaCompra[] {
  const porItem = new Map<string, number>();
  for (const i of itens) {
    porItem.set(i.itemId, (porItem.get(i.itemId) ?? 0) + Number(i.quantidade));
  }
  return [...porItem].map(([itemId, quantidade]) => ({ itemId, quantidade }));
}

export const CompraRepository = {
  /**
   * Cria a Compra e suas linhas. Resolve o Morador autor (criadaPorId). Aceita
   * um cliente de transação (`db`) para que a Compra e a derivação da Despensa
   * nasçam atomicamente no caso de uso (§4.2/§4.3).
   */
  async criarComItens({
    db = prisma,
    casaId,
    usuarioId,
    descricao = null,
    data = new Date(),
    itens,
  }: {
    db?: Prisma.TransactionClient;
    casaId: string;
    usuarioId: string;
    descricao?: string | null;
    data?: Date;
    itens: LinhaResolvida[];
  }) {
    const morador = await db.morador.findUnique({
      where: { usuarioId_casaId: { usuarioId, casaId } },
      select: { id: true },
    });
    const compra = await db.compra.create({
      data: {
        casaId,
        data,
        descricao,
        criadaPorId: morador?.id ?? null,
        itens: {
          create: itens.map((i) => ({
            itemId: i.itemId,
            quantidade: i.quantidade,
            unidade: i.unidade ?? null,
          })),
        },
      },
      select: { id: true },
    });
    return compra.id;
  },

  /**
   * Substitui o cabeçalho e as linhas de uma Compra da Casa (troca total das
   * linhas — sem diff; o volume é minúsculo). Devolve a data e os itens de
   * ANTES da troca (data e quantidade por Item), para o ajuste pontual da
   * Despensa desfazer a contribuição antiga e refazer a nova (ADR-023).
   */
  async atualizarComItens({
    db = prisma,
    casaId,
    compraId,
    descricao,
    data,
    itens,
  }: {
    db?: Prisma.TransactionClient;
    casaId: string;
    compraId: string;
    descricao: string | null;
    data: Date;
    itens: LinhaResolvida[];
  }): Promise<{ dataAntiga: Date; itensAntigos: ItemNaCompra[] }> {
    // Guard multi-tenant: só edita Compra da própria Casa.
    const compra = await db.compra.findFirst({
      where: { id: compraId, casaId },
      select: { data: true, itens: { select: { itemId: true, quantidade: true } } },
    });
    if (!compra) throw new Error("Compra não encontrada.");

    await db.compraItem.deleteMany({ where: { compraId } });
    await db.compra.update({
      where: { id: compraId },
      data: {
        descricao,
        data,
        itens: {
          create: itens.map((i) => ({
            itemId: i.itemId,
            quantidade: i.quantidade,
            unidade: i.unidade ?? null,
          })),
        },
      },
      select: { id: true },
    });

    return { dataAntiga: compra.data, itensAntigos: somarPorItem(compra.itens) };
  },

  /**
   * Exclui uma Compra da Casa (cascade apaga as linhas). Devolve a data e os
   * itens que ela continha (data e quantidade por Item), para o ajuste
   * pontual da Despensa desfazer a contribuição dela (ADR-023).
   */
  async excluir({
    db = prisma,
    casaId,
    id,
  }: {
    db?: Prisma.TransactionClient;
    casaId: string;
    id: string;
  }): Promise<{ data: Date; itens: ItemNaCompra[] }> {
    const compra = await db.compra.findFirst({
      where: { id, casaId },
      select: { data: true, itens: { select: { itemId: true, quantidade: true } } },
    });
    if (!compra) throw new Error("Compra não encontrada.");

    await db.compra.delete({ where: { id }, select: { id: true } });

    return { data: compra.data, itens: somarPorItem(compra.itens) };
  },

  /** Histórico da Casa, mais recente primeiro, com a contagem de itens. */
  async listarPorCasa({ casaId }: { casaId: string }) {
    return prisma.compra.findMany({
      where: { casaId },
      orderBy: [{ data: "desc" }, { criadaEm: "desc" }],
      select: {
        id: true,
        data: true,
        descricao: true,
        _count: { select: { itens: true } },
      },
    });
  },

  /** Detalhe de uma Compra da Casa (nulo se não pertencer à Casa). */
  async obterPorId({ casaId, id }: { casaId: string; id: string }) {
    return prisma.compra.findFirst({
      where: { id, casaId },
      select: {
        id: true,
        data: true,
        descricao: true,
        itens: {
          orderBy: { item: { nomeCanonico: "asc" } },
          select: {
            id: true,
            itemId: true,
            quantidade: true,
            unidade: true,
            item: { select: { nomeCanonico: true, categoria: true } },
          },
        },
      },
    });
  },
};
