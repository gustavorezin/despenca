import { z } from "zod";
import { ItemRepository } from "@/modules/item/repository/ItemRepository";
import { CATEGORIAS } from "@/modules/item/domain/categorias";
import { UNIDADES } from "@/modules/item/domain/unidades";

// Classificação avulsa de um Item (ADR-022), fora do registro de Compra —
// ex.: pela Despensa. `null` limpa o campo; ausente não mexe.
const classificarItemSchema = z.object({
  itemId: z.string().min(1),
  categoria: z.enum(CATEGORIAS).nullable().optional(),
  unidadePadrao: z.enum(UNIDADES).nullable().optional(),
});

export type ClassificarItemEntrada = z.infer<typeof classificarItemSchema>;

export async function classificarItem({
  casaId,
  entrada,
}: {
  casaId: string;
  entrada: ClassificarItemEntrada;
}): Promise<void> {
  const dados = classificarItemSchema.parse(entrada);

  // O filtro por casaId no repositório é a guarda multi-tenant: Item de outra
  // Casa não é encontrado, e a escrita não acontece.
  const { encontrado } = await ItemRepository.atualizarClassificacao({
    casaId,
    itemId: dados.itemId,
    categoria: dados.categoria,
    unidadePadrao: dados.unidadePadrao,
  });
  if (!encontrado) throw new Error("Item não encontrado.");
}
