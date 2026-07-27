"use client";

import { useState, useTransition } from "react";
import { atualizarNomeUsuarioAction } from "./actions";

// Card de perfil com edição inline do nome. Em repouso mostra nome + email
// (fallback "Você" só para exibição); ao "Editar", troca por input + Salvar.
export default function EditarNome({
  nomeAtual,
  email,
}: {
  nomeAtual: string;
  email: string;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nomeAtual);
  const [salvando, iniciar] = useTransition();

  const exibicao = nomeAtual || "Você";
  const inicial = exibicao.charAt(0).toUpperCase();

  function salvar() {
    const nome = valor.trim();
    if (!nome) return;
    iniciar(async () => {
      await atualizarNomeUsuarioAction(nome);
      setEditando(false);
    });
  }

  return (
    <div className="flex items-center gap-3.5 rounded-[20px] border border-borda bg-superficie p-4.5">
      <span className="flex h-14 w-14 flex-none items-center justify-center rounded-[18px] bg-acento text-[23px] font-extrabold text-white">
        {inicial}
      </span>

      {editando ? (
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Seu nome"
            maxLength={40}
            autoFocus
            className="min-w-0 flex-1 rounded-xl border-[1.5px] border-borda-forte bg-superficie px-3 py-2 text-[16px] font-semibold text-tinta outline-none focus:border-acento"
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
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-extrabold text-tinta">
              {exibicao}
            </span>
            {email && (
              <span className="mt-px block truncate text-[13.5px] text-suave">
                {email}
              </span>
            )}
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
