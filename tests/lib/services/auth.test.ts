import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  registerUser,
  createPasswordResetToken,
  resetPasswordWithToken,
} from "@/lib/services/auth";
import bcrypt from "bcryptjs";

describe("registerUser", () => {
  it("creates a user with a hashed password and USER role", async () => {
    const user = await registerUser({ name: "Ana", email: "ana@example.com", password: "senha123" });
    expect(user.role).toBe("USER");
    expect(user.passwordHash).not.toBe("senha123");
    expect(await bcrypt.compare("senha123", user.passwordHash)).toBe(true);
  });

  it("rejects a duplicate email", async () => {
    await registerUser({ name: "Ana", email: "ana@example.com", password: "senha123" });
    await expect(
      registerUser({ name: "Outra Ana", email: "ana@example.com", password: "outrasenha" })
    ).rejects.toThrow("Este email já está cadastrado");
  });
});

describe("password reset flow", () => {
  it("generates a token and allows resetting the password", async () => {
    const user = await registerUser({ name: "Bia", email: "bia@example.com", password: "senhaAntiga" });

    const token = await createPasswordResetToken("bia@example.com");
    expect(token).toBeTruthy();

    await resetPasswordWithToken(token as string, "senhaNova123");

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(await bcrypt.compare("senhaNova123", updated!.passwordHash)).toBe(true);
  });

  it("returns null for an email that doesn't exist", async () => {
    const token = await createPasswordResetToken("naoexiste@example.com");
    expect(token).toBeNull();
  });

  it("rejects an expired token", async () => {
    const user = await registerUser({ name: "Caio", email: "caio@example.com", password: "senha123" });
    const expiredToken = await prisma.passwordResetToken.create({
      data: { token: "expired-token", userId: user.id, expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(resetPasswordWithToken(expiredToken.token, "novaSenha")).rejects.toThrow(
      "Link de redefinição inválido ou expirado"
    );
  });
});
