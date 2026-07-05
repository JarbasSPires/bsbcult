import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations";
import { createPasswordResetToken } from "@/lib/services/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const token = await createPasswordResetToken(parsed.data.email);
  // Modo dev: sem provedor de email configurado, retornamos o link diretamente
  // na resposta. Em produção, plugar um provedor (Resend/SendGrid) aqui e
  // parar de retornar o token no corpo da resposta.
  return NextResponse.json({ resetLink: token ? `/redefinir-senha?token=${token}` : null });
}
