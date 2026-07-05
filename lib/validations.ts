import { z } from "zod";

export const CATEGORY_VALUES = ["SHOW", "FESTIVAL", "TEATRO", "EXPOSICAO", "CINEMA", "OUTRO"] as const;

export const registerSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const favoriteSchema = z.object({
  eventId: z.string().min(1, "eventId é obrigatório"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token é obrigatório"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const eventSchema = z.object({
  title: z.string().min(3, "Título muito curto"),
  description: z.string().min(10, "Descrição muito curta"),
  category: z.enum(CATEGORY_VALUES),
  imageUrl: z.string().url("URL de imagem inválida"),
  locationName: z.string().min(2),
  locationAddress: z.string().min(2),
  dateStart: z.string().min(1),
  dateEnd: z.string().min(1),
  price: z.number().nullable(),
  isFree: z.boolean(),
  organizer: z.string().min(2),
  tags: z.array(z.string()),
  featured: z.boolean(),
  status: z.enum(["ATIVO", "ENCERRADO", "EM_BREVE"]),
});

export const categorySchema = z.object({
  name: z.string().min(2),
  value: z.enum(CATEGORY_VALUES),
  icon: z.string().min(2),
  color: z.string().min(4),
  description: z.string().min(2),
});

export type EventInput = z.infer<typeof eventSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
