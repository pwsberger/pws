"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";

function adminHash(value: string) {
  const secret = process.env.ADMIN_COOKIE_SECRET ?? "local-dev-secret";
  return createHash("sha256").update(`${value}:${secret}`).digest("hex");
}

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || password !== expected) {
    redirect("/admin?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set("pws_admin", adminHash(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect("/admin");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete("pws_admin");
  redirect("/admin");
}

export async function isAdminAuthenticated() {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const cookieStore = await cookies();
  return cookieStore.get("pws_admin")?.value === adminHash(expected);
}
