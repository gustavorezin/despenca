"use client";

import { BottomSheet } from "./BottomSheet";
import { IconeLupa, IconeMais } from "./icones";
import { useBuscaItens, type ItemBusca } from "./useBuscaItens";

/**
 * Bottom sheet "Adicionar item" com autocomplete (ADR-005), compartilhado pela
 * Lista e pelo Modo Mercado. Busca nos Itens da Casa; sem resultado, oferece
 * criar o termo digitado como novo Item.
 */
export function SheetAdicionarItem({
  aberto,
  aoFechar,
  aoAdicionar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  /** `item` presente quando a escolha veio do autocomplete. */
  aoAdicionar: (nome: string, item?: ItemBusca) => void;
}) {
  const { termo, setTermo, sugestoes, limpar } = useBuscaItens(aberto);

  const semResultados = termo.trim().length >= 2 && sugestoes.length === 0;

  function fechar() {
    limpar();
    aoFechar();
  }

  function adicionar(nome: string, item?: ItemBusca) {
    const limpo = nome.trim();
    if (!limpo) return;
    limpar();
    aoAdicionar(limpo, item);
  }

  return (
    <BottomSheet aberto={aberto} aoFechar={fechar} ariaLabel="Adicionar item">
      <h2 className="mb-3.5 text-[20px] font-extrabold tracking-tight text-tinta">
        Adicionar item
      </h2>
      <div className="flex items-center gap-2.5 rounded-[15px] border-[1.5px] border-borda-forte bg-superficie px-3.5 py-3 focus-within:border-acento">
        <span className="text-suave-2">
          <IconeLupa tamanho={19} />
        </span>
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Buscar item…"
          autoFocus
          className="flex-1 bg-transparent text-[16px] text-tinta outline-none"
        />
      </div>
      <div className="mt-3 max-h-[46vh] overflow-y-auto">
        {termo.trim().length < 2 && (
          <div className="py-6 text-center text-[13.5px] text-suave-2">
            Digite ao menos 2 letras para buscar.
          </div>
        )}
        {sugestoes.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => adicionar(s.nomeCanonico, s)}
            className="mb-2 flex w-full items-center justify-between gap-2.5 rounded-[14px] border border-borda bg-superficie p-3.5 text-left"
          >
            <span>
              <span className="block text-[15px] font-bold text-tinta">
                {s.nomeCanonico}
              </span>
              {s.categoria && (
                <span className="mt-px block text-[12px] text-suave-2">
                  {s.categoria}
                </span>
              )}
            </span>
            <span className="flex text-acento">
              <IconeMais tamanho={20} strokeWidth={2.3} />
            </span>
          </button>
        ))}
        {semResultados && (
          <button
            type="button"
            onClick={() => adicionar(termo)}
            className="flex w-full items-center gap-2.5 rounded-[14px] bg-superficie p-3.5 text-left text-[14.5px] font-bold text-acento"
            style={{
              border:
                "1.5px dashed color-mix(in srgb, var(--color-acento) 32%, #fff)",
            }}
          >
            <IconeMais tamanho={18} strokeWidth={2.3} />
            Adicionar “{termo.trim()}”
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
