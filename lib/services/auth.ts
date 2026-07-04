import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function registerUser(data: { name: string; email: string; password: string }) {
  const email = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Este email já está cadastrado");

  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: { name: data.name, email, passwordHash, role: "USER" },
  });
}

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return null;

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt } });
  return token;
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  // Same message for "not found" and "expired" deliberately — avoids telling an attacker
  // which case applies (no token-guessing or expiry oracle).
  if (!resetToken || resetToken.expiresAt < new Date()) {
    throw new Error("Link de redefinição inválido ou expirado");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } });
  await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
}
