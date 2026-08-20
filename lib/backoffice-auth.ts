import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const cookieName = "nira-backoffice-session";
const secret = () => process.env.AUTH_SECRET ?? "";
const signature = (email: string) => createHmac("sha256", secret()).update(email).digest("hex");

export async function requireBackofficeUser() {
  const value = (await cookies()).get(cookieName)?.value;
  if (!value || !secret()) redirect("/login");
  const [encodedEmail, receivedSignature] = value.split(".");
  const email = encodedEmail ? Buffer.from(encodedEmail, "base64url").toString("utf8") : "";
  const expectedSignature = signature(email ?? "");
  if (!email || !receivedSignature || receivedSignature.length !== expectedSignature.length || !timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature))) redirect("/login");
  return email;
}

export async function createBackofficeSession(email: string) {
  const encodedEmail = Buffer.from(email).toString("base64url");
  (await cookies()).set(cookieName, `${encodedEmail}.${signature(email)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/" });
}

export async function clearBackofficeSession() { (await cookies()).delete(cookieName); }
