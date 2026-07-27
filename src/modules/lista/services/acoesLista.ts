import { z } from "zod";
import { ListaRepository } from "@/modules/lista/repository/ListaRepository";
import { ItemRepository } from "@/modules/item/repository/ItemRepository";

/**
 * Descartar da Lista. Numa Sugestão (ativa ou aceita), vira DISPENSADO — sinal
 * negativo que a suprime até uma nova Compra (ADR-013); num item manual,
 * remove de vez.
 */
export async function descartarItem({
  casaId,
  listaItemId,
}: {
  casaId: string;
  listaItemId: string;
}) {
  const item = await ListaRepository.obter({ casaId, id: listaItemId });
  if (!item) return;

  const ehSugestaoVigente =
    item.origem === "SUGESTAO" &&
    (item.status === "ATIVO" || item.status === "ACEITO");

  if (ehSugestaoVigente) {
    await ListaRepository.definirStatus({ casaId, id: listaItemId, status: "DISPENSADO" });
  } else {
    await ListaRepository.remover({ casaId, id: listaItemId });
  }
}

/**
 * Editar a quantidade. Numa Sugestão ativa, este é o gesto de aceite (ADR-026):
 * ela vira ACEITO e o recálculo passa a respeitar a quantidade escolhida.
 */
export async function editarQtd({
  casaId,
  listaItemId,
  qtd,
}: {
  casaId: string;
  listaItemId: string;
  qtd: number;
}) {
  const quantidade = z.number().int().min(1).max(999).parse(qtd);
  const { aceitou } = await ListaRepository.aceitarSugestao({
    casaId,
    id: listaItemId,
    qtdSugerida: quantidade,
  });
  if (!aceitou) {
    // Item manual ou Sugestão já aceita: só a quantidade muda.
    await ListaRepository.atualizarQtd({ casaId, id: listaItemId, qtdSugerida: quantidade });
  }
}

const adicionarSchema = z.object({
  nome: z.string().trim().min(1, "Item sem nome."),
  qtd: z.number().int().min(1).max(999).default(1),
});

/** Adicionar item manual à Lista (ADR-003): resolve/cria o Item e cria o ListaItem. */
export async function adicionarManual({
  casaId,
  entrada,
}: {
  casaId: string;
  entrada: { nome: string; qtd?: number };
}) {
  const { nome, qtd } = adicionarSchema.parse(entrada);
  const item = await ItemRepository.acharOuCriar({ casaId, nome });
  await ListaRepository.criarManual({ casaId, itemId: item.id, qtdSugerida: qtd });
}
