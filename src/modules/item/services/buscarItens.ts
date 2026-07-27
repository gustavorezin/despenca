import { ItemRepository } from "@/modules/item/repository/ItemRepository";

// Nomes de Item têm ~40 caracteres no máximo na prática; o teto protege a
// consulta `contains` de entradas arbitrariamente longas vindas da URL.
const TAMANHO_MAXIMO_TERMO = 60;

/**
 * Caso de uso do autocomplete de registro manual (ADR-005): só busca a partir
 * do 2º caractere; abaixo disso não há consulta.
 */
export async function buscarItens({
  casaId,
  termo,
}: {
  casaId: string;
  termo: string;
}) {
  const limpo = termo.trim().slice(0, TAMANHO_MAXIMO_TERMO);
  if (limpo.length < 2) return [];
  return ItemRepository.buscarPorTermo({ casaId, termo: limpo });
}
