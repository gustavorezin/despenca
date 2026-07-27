"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GrupoMercado } from "@/modules/lista/services/itensDoMercado";
import {
  agruparPorCategoria,
  comoCategoria,
  type Categoria,
} from "@/modules/item/domain/categorias";
import { comoUnidade, type Unidade } from "@/modules/item/domain/unidades";
import { registrarCompraAction } from "../registrar/actions";
import { FormularioCompra, type ChipCompra } from "../registrar/FormularioCompra";
import { SheetAdicionarItem } from "@/shared/ui/SheetAdicionarItem";
import type { ItemBusca } from "@/shared/ui/useBuscaItens";
import {
  IconeX,
  IconeChevronEsquerda,
  IconeCheck,
  IconeMais,
  IconeMenos,
} from "@/shared/ui/icones";

type Passo = "marcar" | "confirmar";

type ItemChecklist = {
  chave: string;
  nome: string;
  quantidade: number;
  unidade?: Unidade;
  categoria?: Categoria;
  marcado: boolean;
};

/**
 * Modo Mercado (ADR-015): fullscreen sobre o shell (sem tab bar/FAB). Passo
 * "marcar" — checklist por categoria (ordem de prateleira), começa vazia; o
 * usuário marca o que pega, ajusta a quantidade e pode adicionar itens que não
 * estavam na Lista. Passo "confirmar" — reusa o FormularioCompra pré-preenchido
 * com os marcados (via do Marco 6), onde dá nome/data e registra a Compra.
 */
export function ModoMercado({ grupos }: { grupos: GrupoMercado[] }) {
  const router = useRouter();
  const [passo, setPasso] = useState<Passo>("marcar");
  const [itens, setItens] = useState<ItemChecklist[]>(() =>
    grupos.flatMap((g) => g.itens).map((i) => ({
      chave: i.itemId,
      nome: i.nome,
      quantidade: i.quantidade,
      unidade: i.unidade,
      categoria: i.categoria,
      marcado: false,
    })),
  );
  const [addOpen, setAddOpen] = useState(false);

  const total = itens.length;
  const n = itens.filter((i) => i.marcado).length;
  const gruposRender = useMemo(() => agruparPorCategoria(itens), [itens]);

  const chipsMarcados: ChipCompra[] = itens
    .filter((i) => i.marcado)
    .map(({ nome, quantidade, unidade, categoria }) => ({
      nome,
      quantidade,
      unidade,
      categoria,
    }));

  function alternar(chave: string) {
    setItens((is) =>
      is.map((i) => (i.chave === chave ? { ...i, marcado: !i.marcado } : i)),
    );
  }

  function ajustarQtd(chave: string, delta: number) {
    setItens((is) =>
      is.map((i) =>
        i.chave === chave
          ? { ...i, quantidade: Math.max(1, i.quantidade + delta) }
          : i,
      ),
    );
  }

  // Item novo entra na sua categoria (ou "Sem categoria"), desmarcado — o
  // usuário marca ao pegar da prateleira. Se já está na checklist, soma +1.
  function adicionar(nome: string, item?: ItemBusca) {
    setAddOpen(false);
    setItens((is) => {
      const idx = is.findIndex(
        (i) => i.nome.toLowerCase() === nome.toLowerCase(),
      );
      if (idx >= 0) {
        return is.map((i, k) =>
          k === idx ? { ...i, quantidade: i.quantidade + 1 } : i,
        );
      }
      return [
        ...is,
        {
          chave: item?.id ?? `novo:${nome}`,
          nome,
          quantidade: 1,
          unidade: comoUnidade(item?.unidadePadrao),
          categoria: comoCategoria(item?.categoria),
          marcado: false,
        },
      ];
    });
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-fundo">
      {/* Mesma coluna do shell: estreita no mobile, larga no desktop. */}
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col md:max-w-3xl">
        <div className="flex items-center gap-2.5 px-4.5 pb-2 pt-14">
          <button
            type="button"
            onClick={() =>
              passo === "confirmar" ? setPasso("marcar") : router.push("/lista")
            }
            aria-label={passo === "confirmar" ? "Voltar" : "Fechar"}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-[#f4efe7] text-tinta"
          >
            {passo === "confirmar" ? (
              <IconeChevronEsquerda tamanho={20} />
            ) : (
              <IconeX tamanho={18} />
            )}
          </button>
          <span className="text-[15px] font-bold text-suave">
            {passo === "confirmar" ? "Registrar Compra" : "Modo Mercado"}
          </span>
        </div>

        {passo === "marcar" ? (
          <>
            <div className="px-5.5 pt-2.5">
              <div className="mb-1.5 flex items-baseline justify-between">
                <h1 className="text-[26px] font-extrabold tracking-tight text-tinta">
                  No mercado
                </h1>
                <span className="text-[13px] font-bold text-suave">
                  {n} de {total} marcados
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#eee8df]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: total ? `${(n / total) * 100}%` : "0%",
                    background: "var(--color-acento)",
                  }}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5.5 pt-1">
              {gruposRender.map((grupo) => (
                <div key={grupo.categoria} className="mt-5">
                  <div className="mb-2.5 pl-0.5 text-[12.5px] font-bold uppercase tracking-wide text-suave-2">
                    {grupo.categoria}
                  </div>
                  <div className="overflow-hidden rounded-[18px] border border-borda bg-superficie">
                    {grupo.itens.map((item, idx) => (
                      <div
                        key={item.chave}
                        className="flex items-center gap-3 p-3.5"
                        style={{
                          borderBottom:
                            idx === grupo.itens.length - 1
                              ? "none"
                              : "1px solid #f4efe8",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => alternar(item.chave)}
                          aria-pressed={item.marcado}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span
                            className="flex h-[28px] w-[28px] flex-none items-center justify-center rounded-[9px] text-white transition-colors"
                            style={{
                              background: item.marcado
                                ? "var(--color-acento)"
                                : "#fff",
                              border: item.marcado
                                ? "2px solid var(--color-acento)"
                                : "2px solid #d8d0c4",
                            }}
                          >
                            {item.marcado && <IconeCheck tamanho={17} />}
                          </span>
                          <span
                            className="min-w-0 truncate text-[15.5px] font-bold text-tinta"
                            style={{
                              opacity: item.marcado ? 0.55 : 1,
                              textDecoration: item.marcado
                                ? "line-through"
                                : "none",
                            }}
                          >
                            {item.nome}
                          </span>
                        </button>
                        <div className="flex flex-none items-center rounded-xl bg-[#f6f1ea]">
                          <button
                            type="button"
                            onClick={() => ajustarQtd(item.chave, -1)}
                            aria-label="menos"
                            className="flex h-8 w-8 items-center justify-center text-[#6e665d]"
                          >
                            <IconeMenos tamanho={14} />
                          </button>
                          <span className="min-w-[46px] text-center text-[13px] font-bold text-tinta">
                            {item.quantidade}
                            {item.unidade ? ` ${item.unidade}` : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => ajustarQtd(item.chave, 1)}
                            aria-label="mais"
                            className="flex h-8 w-8 items-center justify-center text-[#6e665d]"
                          >
                            <IconeMais tamanho={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-superficie px-4 py-3.5 text-[14.5px] font-bold text-acento"
                style={{
                  border:
                    "1.5px dashed color-mix(in srgb, var(--color-acento) 35%, #fff)",
                }}
              >
                <IconeMais tamanho={16} strokeWidth={2.4} />
                Adicionar item
              </button>
              <div className="h-2" />
            </div>

            <div className="border-t border-[#eee8df] bg-fundo px-5.5 pb-7 pt-3">
              <button
                type="button"
                onClick={() => setPasso("confirmar")}
                disabled={n === 0}
                className="w-full rounded-2xl px-4 py-4 text-[16px] font-bold text-white transition-colors"
                style={{
                  background: n === 0 ? "#cfc7bb" : "var(--color-acento)",
                }}
              >
                {n === 0 ? "Marque o que comprou" : `Continuar · ${n}`}
              </button>
            </div>
          </>
        ) : (
          <FormularioCompra
            inicial={{ itens: chipsMarcados }}
            rotuloConfirmar="Registrar Compra"
            rotuloEnviando="Registrando…"
            aoConfirmar={registrarCompraAction}
          />
        )}
      </div>

      {/* Adicionar item que não estava na Lista (ADR-005) */}
      <SheetAdicionarItem
        aberto={addOpen}
        aoFechar={() => setAddOpen(false)}
        aoAdicionar={adicionar}
      />
    </div>
  );
}
