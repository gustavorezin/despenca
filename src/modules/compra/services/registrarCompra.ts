import { prisma } from "@/lib/prisma";
import { ItemRepository } from "@/modules/item/repository/ItemRepository";
import { CompraRepository } from "@/modules/compra/repository/CompraRepository";
import { aplicarCompraNaDespensa } from "@/modules/despensa/services/aplicarCompraNaDespensa";
import { ListaRepository } from "@/modules/lista/repository/ListaRepository";
import { recalcularSugestoes } from "@/modules/lista/services/recalcularSugestoes";
import { resolverCabecalho } from "@/modules/compra/domain/cabecalho";
import {
  entradaCompraSchema,
  type EntradaCompra,
} from "@/modules/compra/services/entradaCompra";

/**
 * Caso de uso: registrar uma Compra manual. Resolve/cria cada Item da Casa,
 * persiste Compra + CompraItem, rederiva a Despensa e recalcula as Sugestões —
 * tudo na mesma transação (§4.2/§4.3/§4.5). Itens comprados saem da Lista.
 */
export async function registrarCompra({
  casaId,
  usuarioId,
  entrada,
}: {
  casaId: string;
  usuarioId: string;
  entrada: EntradaCompra;
}) {
  const dados = entradaCompraSchema.parse(entrada);
  const { descricao, data } = resolverCabecalho(dados);

  const linhas = await Promise.all(
    dados.itens.map(async (linha) => {
      const item = await ItemRepository.acharOuCriar({
        casaId,
        nome: linha.nome,
      });
      return {
        itemId: item.id,
        quantidade: linha.quantidade,
        unidade: linha.unidade,
        categoria: linha.categoria,
      };
    }),
  );

  // Compra + derivação da Despensa nascem na MESMA transação: ou as duas
  // acontecem, ou nenhuma (§4.2/§4.3). Evita Compra persistida com Despensa
  // desatualizada e o risco de reenvio/duplicação num passo pós-commit.
  return prisma.$transaction(async (tx) => {
    const compraId = await CompraRepository.criarComItens({
      db: tx,
      casaId,
      usuarioId,
      descricao,
      data,
      itens: linhas,
    });

    // Classificação informada no chip sobrescreve a do Item (ADR-022).
    for (const linha of linhas) {
      await ItemRepository.atualizarClassificacao({
        db: tx,
        casaId,
        itemId: linha.itemId,
        categoria: linha.categoria,
        unidadePadrao: linha.unidade,
      });
    }

    // Soma por Item (uma Compra pode, em tese, repetir o mesmo Item em duas
    // linhas) — a Despensa soma o que foi comprado agora ao que já havia
    // (§4.3: Compra é reabastecimento, nunca sinal de consumo — ADR-013).
    const quantidadePorItem = new Map<string, number>();
    for (const l of linhas) {
      quantidadePorItem.set(l.itemId, (quantidadePorItem.get(l.itemId) ?? 0) + l.quantidade);
    }
    const itemIds = [...quantidadePorItem.keys()];

    await aplicarCompraNaDespensa({
      db: tx,
      casaId,
      itens: itemIds.map((itemId) => ({
        itemId,
        dataAntiga: null,
        qtdAntiga: 0,
        dataNova: data,
        qtdNova: quantidadePorItem.get(itemId)!,
      })),
    });

    // Itens comprados saem da Lista; em seguida o motor regenera as Sugestões.
    await ListaRepository.marcarComprados({ db: tx, casaId, itemIds });
    await recalcularSugestoes({ db: tx, casaId });

    return compraId;
  });
}
