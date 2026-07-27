import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizarNome } from "@/modules/item/domain/normalizacao";

const VIOLACAO_UNICIDADE = "P2002";

function ehViolacaoUnicidade(erro: unknown): boolean {
  return (
    erro instanceof Prisma.PrismaClientKnownRequestError &&
    erro.code === VIOLACAO_UNICIDADE
  );
}

export const ItemRepository = {
  /**
   * Autocomplete: Itens da Casa cujo nome contém o termo (ADR-005). Prioriza
   * os já comprados (mais linhas de Compra primeiro), como pede o ADR; o
   * desempate alfabético mantém a ordem estável.
   */
  async buscarPorTermo({ casaId, termo }: { casaId: string; termo: string }) {
    return prisma.item.findMany({
      where: {
        casaId,
        nomeCanonico: { contains: termo, mode: "insensitive" },
      },
      orderBy: [{ compraItens: { _count: "desc" } }, { nomeCanonico: "asc" }],
      take: 7,
      select: {
        id: true,
        nomeCanonico: true,
        categoria: true,
        unidadePadrao: true,
      },
    });
  },

  /**
   * Atualiza a classificação de um Item da Casa — só os campos informados.
   * Quando o usuário informa, sobrescreve o valor anterior: a última palavra é
   * dele (ADR-022). `undefined` não toca no campo; `null` limpa. Devolve se o
   * Item existia na Casa (o filtro por casaId é a guarda multi-tenant).
   */
  async atualizarClassificacao({
    db = prisma,
    casaId,
    itemId,
    categoria,
    unidadePadrao,
  }: {
    db?: Prisma.TransactionClient;
    casaId: string;
    itemId: string;
    categoria?: string | null;
    unidadePadrao?: string | null;
  }): Promise<{ encontrado: boolean }> {
    if (categoria === undefined && unidadePadrao === undefined) {
      return { encontrado: true };
    }
    const { count } = await db.item.updateMany({
      where: { id: itemId, casaId },
      data: { categoria, unidadePadrao },
    });
    return { encontrado: count > 0 };
  },

  /**
   * Resolve o Item canônico da Casa a partir de um texto: reaproveita o
   * existente ou cria um novo (registrando o texto bruto como ApelidoItem).
   */
  async acharOuCriar({ casaId, nome }: { casaId: string; nome: string }) {
    const nomeCanonico = normalizarNome(nome);
    const textoBruto = nome.trim();

    // get-or-create idempotente sob concorrência. O upsert do Prisma via driver
    // adapter (pg) faz find+create — não é atômico — então tratamos a violação
    // de unicidade (P2002) relendo o registro que a outra transação criou.
    const item =
      (await prisma.item.findUnique({
        where: { casaId_nomeCanonico: { casaId, nomeCanonico } },
        select: { id: true },
      })) ?? (await this.criarItem({ casaId, nomeCanonico }));

    // Registra o texto digitado como apelido (normalização/OCR futuros).
    if (textoBruto) await this.registrarApelido(item.id, textoBruto);

    return item;
  },

  async criarItem({
    casaId,
    nomeCanonico,
  }: {
    casaId: string;
    nomeCanonico: string;
  }) {
    try {
      return await prisma.item.create({
        data: { casaId, nomeCanonico },
        select: { id: true },
      });
    } catch (erro) {
      if (ehViolacaoUnicidade(erro)) {
        return prisma.item.findUniqueOrThrow({
          where: { casaId_nomeCanonico: { casaId, nomeCanonico } },
          select: { id: true },
        });
      }
      throw erro;
    }
  },

  async registrarApelido(itemId: string, textoBruto: string) {
    try {
      await prisma.apelidoItem.create({ data: { itemId, textoBruto } });
    } catch (erro) {
      // Já registrado (mesmo texto para o mesmo Item): nada a fazer.
      if (!ehViolacaoUnicidade(erro)) throw erro;
    }
  },
};
