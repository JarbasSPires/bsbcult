import { execSync } from "child_process";
import { beforeAll, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { prisma } from "@/lib/prisma";

beforeAll(() => {
  execSync("npx prisma db push --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: "inherit",
  });
});

afterEach(async () => {
  await prisma.favorite.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.event.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
});
