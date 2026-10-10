#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import readline from "node:readline";

const prisma = new PrismaClient();

async function promptPassword(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const usernameIndex = args.indexOf("--username");
  const passwordIndex = args.indexOf("--password");
  const envPasswordIndex = args.indexOf("--env-password");

  if (usernameIndex === -1 || args[usernameIndex + 1] === undefined) {
    console.error("Usage: tsx scripts/setup-password.ts --username <username> [--password <pass> | --env-password <ENV_VAR>]");
    process.exit(1);
  }

  const username = args[usernameIndex + 1];

  let password: string;
  if (passwordIndex !== -1 && args[passwordIndex + 1]) {
    password = args[passwordIndex + 1];
  } else if (envPasswordIndex !== -1 && args[envPasswordIndex + 1]) {
    const envVar = args[envPasswordIndex + 1];
    password = process.env[envVar] || "";
    if (!password) {
      console.error(`Environment variable ${envVar} tidak ditemukan atau kosong`);
      process.exit(1);
    }
  } else {
    password = await promptPassword(`Password baru untuk ${username}: `);
  }

  if (password.length < 8) {
    console.error("Password minimal 8 karakter");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.error(`User ${username} tidak ditemukan`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  console.log(`✓ Password untuk ${username} berhasil diubah`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error:", err);
  prisma.$disconnect();
  process.exit(1);
});
