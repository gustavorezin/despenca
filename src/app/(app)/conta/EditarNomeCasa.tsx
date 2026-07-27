"use client";

import { useState, useTransition } from "react";
import { atualizarNomeCasaAction } from "./actions";

// Card da Casa com edição inline do nome, mesmo padrão do perfil (EditarNome).
// Em repouso mostra o rótulo + nome; ao "Editar", troca por input + Salvar.
export default function EditarNomeCasa({ nomeAtual }: { nomeAtual: string }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nomeAtual);
  const [salvando, iniciar] = useTransition();

  const exibicao = nomeAtual || "Minha casa";

  function salvar() {
    const nome = valor.trim();
    if (!nome) return;
    iniciar(async () => {
      await atualizarNomeCasaAction(nome);
      setEditando(false);
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-borda bg-superficie p-4">
      <span
        className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-[19px]"
        style={{
          background: "color-mix(in srgb, var(--color-acento) 9%, #fff)",
        }}
      >
        🏠
      </span>

      {editando ? (
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Nome da Casa"
            maxLength={40}
            autoFocus
            className="min-w-0 flex-1 rounded-xl border-[1.5px] border-borda-forte bg-superficie px-3 py-2 text-[15.5px] font-semibold text-tinta outline-none focus:border-acento"
          />
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || !valor.trim()}
            className="flex-none rounded-xl bg-acento px-3.5 py-2 text-[14px] font-bold text-white disabled:opacity-50"
          >
            {salvando ? "…" : "Salvar"}
          </button>
        </span>
      ) : (
        <>
          <span className="flex-1">
            <span className="block text-[12px] font-semibold text-suave-2">
              Nome da Casa
            </span>
            <span className="mt-px block text-[15.5px] font-bold text-tinta">
              {exibicao}
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              setValor(nomeAtual);
              setEditando(true);
            }}
            className="flex-none rounded-xl border border-borda px-3 py-2 text-[13.5px] font-bold text-suave"
          >
            Editar
          </button>
        </>
      )}
    </div>
  );
}
