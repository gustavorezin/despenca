import { z } from "zod";
import { CATEGORIAS } from "@/modules/item/domain/categorias";
import { UNIDADES } from "@/modules/item/domain/unidades";

/**
 * Contrato compartilhado de registrar e editar Compra (ADR-021/ADR-022).
 * Uma Compra tem ao menos 1 item; descrição e data são opcionais (data ausente
 * = hoje). A data trafega como "YYYY-MM-DD" para não sofrer shift de fuso; as
 * regras do cabeçalho (data futura proibida) vivem em domain/cabecalho.ts.
 */
export const entradaCompraSchema = z.object({
  descricao: z.string().trim().max(80, "Descrição muito longa.").optional(),
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
    .optional(),
  itens: z
    .array(
      z.object({
        nome: z.string().trim().min(1, "Item sem nome."),
        quantidade: z.number().int().min(1).max(999),
        unidade: z.enum(UNIDADES).optional(),
        categoria: z.enum(CATEGORIAS).optional(),
      }),
    )
    .min(1, "Adicione ao menos um item."),
});

export type EntradaCompra = z.infer<typeof entradaCompraSchema>;
