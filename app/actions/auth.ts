"use server";

import { redirect } from "next/navigation";
import { createBackofficeSession, clearBackofficeSession } from "@/lib/backoffice-auth";

export async function login(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!process.env.BACKOFFICE_ADMIN_EMAIL || !process.env.BACKOFFICE_ADMIN_PASSWORD || !process.env.AUTH_SECRET) redirect("/login?error=config");
  if (email !== process.env.BACKOFFICE_ADMIN_EMAIL.toLowerCase() || password !== process.env.BACKOFFICE_ADMIN_PASSWORD) redirect("/login?error=invalid");
  await createBackofficeSession(email); redirect("/");
}

export async function logout() { await clearBackofficeSession(); redirect("/login"); }
