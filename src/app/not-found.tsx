import Link from "next/link";

/**
 * 404 global (ADR-012: estado vazio sempre com saída). Cobre rotas
 * inexistentes e os `notFound()` de recursos fora da Casa (ex.: detalhe de
 * Compra de outro tenant).
 */
export default function NaoEncontrada() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center px-8 py-16 text-center md:max-w-3xl">
      <div
        className="mb-6 flex items-center justify-center rounded-[32px] text-[52px]"
        style={{
          width: 108,
          height: 108,
          background: "color-mix(in srgb, var(--color-acento) 10%, #fff)",
        }}
      >
        🔍
      </div>
      <h1 className="mb-2 text-[21px] font-extrabold tracking-tight text-tinta">
        Não encontrei esta página
      </h1>
      <p className="mb-7 max-w-[300px] text-[15px] leading-normal text-suave">
        O endereço pode ter mudado, ou o conteúdo não pertence à sua Casa.
      </p>
      <Link
        href="/lista"
        className="w-full rounded-2xl bg-acento px-4 py-4 text-[16px] font-bold text-white"
        style={{
          boxShadow:
            "0 10px 22px color-mix(in srgb, var(--color-acento) 30%, transparent)",
        }}
      >
        Ir para a Lista
      </Link>
    </main>
  );
}
