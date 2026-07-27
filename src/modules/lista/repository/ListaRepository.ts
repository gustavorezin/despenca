import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { MotivoSugestao } from "@/modules/aprendizado/domain/motor";

/*
  Acesso a dados da Lista (ListaItem). Único a tocar Prisma. Métodos usados no
  recálculo (dentro da transação de Compra/Ajuste) aceitam um cliente `db`.
*/
export const ListaRepository = {
  /** Remove as Sugestões vigentes; o recálculo as regenera (apaga + regenera). */
  async apagarSugestoesAtivas({
    db = prisma,
    casaId,
  }: {
    db?: Prisma.TransactionClient;
    casaId: string;
  }) {
    await db.listaItem.deleteMany({
      where: { casaId, origem: "SUGESTAO", status: "ATIVO" },
    });
  },

  /** Materializa as Sugestões de um recálculo numa escrita só. */
  async criarSugestoes({
    db = prisma,
    casaId,
    sugestoes,
  }: {
    db?: Prisma.TransactionClient;
    casaId: string;
    sugestoes: { itemId: string; motivo: MotivoSugestao; qtdSugerida: number }[];
  }) {
    if (sugestoes.length === 0) return;
    await db.listaItem.createMany({
      data: sugestoes.map((s) => ({
        casaId,
        itemId: s.itemId,
        origem: "SUGESTAO" as const,
        motivo: s.motivo,
        qtdSugerida: s.qtdSugerida,
        status: "ATIVO" as const,
      })),
    });
  },

  /**
   * Aceite implícito (ADR-026): editar a quantidade de uma Sugestão ativa a
   * torna ACEITO — o recálculo deixa de apagá-la/regenerá-la, preservando a
   * quantidade escolhida. Devolve se havia uma Sugestão ativa para aceitar.
   */
  async aceitarSugestao({
    casaId,
    id,
    qtdSugerida,
  }: {
    casaId: string;
    id: string;
    qtdSugerida: number;
  }): Promise<{ aceitou: boolean }> {
    const { count } = await prisma.listaItem.updateMany({
      where: { id, casaId, origem: "SUGESTAO", status: "ATIVO" },
      data: { status: "ACEITO", qtdSugerida },
    });
    return { aceitou: count > 0 };
  },

  async criarManual({
    casaId,
    itemId,
    qtdSugerida,
  }: {
    casaId: string;
    itemId: string;
    qtdSugerida: number;
  }) {
    // Se o Item já está ativo na Lista, não duplica (ex.: já é Sugestão/manual).
    const existente = await prisma.listaItem.findFirst({
      where: { casaId, itemId, status: { in: ["ATIVO", "ACEITO"] } },
      select: { id: true },
    });
    if (existente) {
      await prisma.listaItem.update({
        where: { id: existente.id },
        data: { origem: "MANUAL", motivo: "MANUAL", status: "ATIVO", qtdSugerida },
      });
      return;
    }
    await prisma.listaItem.create({
      data: {
        casaId,
        itemId,
        origem: "MANUAL",
        motivo: "MANUAL",
        qtdSugerida,
        status: "ATIVO",
      },
    });
  },

  /** Itens ativos da Lista (Sugestões vigentes + manuais + aceitos). */
  async listarAtivos({ casaId }: { casaId: string }) {
    return prisma.listaItem.findMany({
      where: { casaId, status: { in: ["ATIVO", "ACEITO"] } },
      orderBy: { criadoEm: "asc" },
      select: {
        id: true,
        itemId: true,
        origem: true,
        motivo: true,
        status: true,
        qtdSugerida: true,
        item: {
          select: { nomeCanonico: true, unidadePadrao: true, categoria: true },
        },
      },
    });
  },

  /**
   * Contexto para o recálculo: Itens já comprometidos na Lista (não duplicar
   * Sugestão) e a data do descarte mais recente por Item (sinal negativo).
   */
  async bloqueadosEDispensados({
    db = prisma,
    casaId,
  }: {
    db?: Prisma.TransactionClient;
    casaId: string;
  }) {
    const [comprometidos, dispensados] = await Promise.all([
      db.listaItem.findMany({
        where: {
          casaId,
          OR: [
            { status: "ATIVO", origem: "MANUAL" },
            { status: "ACEITO" },
          ],
        },
        select: { itemId: true },
      }),
      db.listaItem.findMany({
        where: { casaId, status: "DISPENSADO" },
        orderBy: { atualizadoEm: "desc" },
        select: { itemId: true, atualizadoEm: true },
      }),
    ]);

    const bloqueados = new Set(comprometidos.map((c) => c.itemId));
    const mapaDispensados = new Map<string, Date>();
    for (const d of dispensados) {
      if (!mapaDispensados.has(d.itemId)) {
        mapaDispensados.set(d.itemId, d.atualizadoEm);
      }
    }
    return { bloqueados, dispensados: mapaDispensados };
  },

  async obter({ casaId, id }: { casaId: string; id: string }) {
    return prisma.listaItem.findFirst({
      where: { id, casaId },
      select: { id: true, origem: true, status: true },
    });
  },

  async definirStatus({
    casaId,
    id,
    status,
  }: {
    casaId: string;
    id: string;
    status: "ACEITO" | "DISPENSADO" | "COMPRADO";
  }) {
    await prisma.listaItem.updateMany({ where: { id, casaId }, data: { status } });
  },

  async atualizarQtd({
    casaId,
    id,
    qtdSugerida,
  }: {
    casaId: string;
    id: string;
    qtdSugerida: number;
  }) {
    await prisma.listaItem.updateMany({
      where: { id, casaId },
      data: { qtdSugerida },
    });
  },

  async remover({ casaId, id }: { casaId: string; id: string }) {
    await prisma.listaItem.deleteMany({ where: { id, casaId } });
  },

  /** Ao registrar Compra, os Itens comprados saem da Lista (viram COMPRADO). */
  async marcarComprados({
    db = prisma,
    casaId,
    itemIds,
  }: {
    db?: Prisma.TransactionClient;
    casaId: string;
    itemIds: string[];
  }) {
    if (itemIds.length === 0) return;
    await db.listaItem.updateMany({
      where: { casaId, itemId: { in: itemIds }, status: { in: ["ATIVO", "ACEITO"] } },
      data: { status: "COMPRADO" },
    });
  },
};
