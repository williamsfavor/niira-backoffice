export type AdminRole = "super_admin" | "ops_admin" | "content_editor" | "support_agent" | "nira_liaison";

export type Permission =
  | "applications:read"
  | "centers:read"
  | "centers:write"
  | "services:read"
  | "services:write"
  | "appointments:read"
  | "appointments:write"
  | "faqs:read"
  | "faqs:write"
  | "tickets:read"
  | "tickets:write"
  | "reports:read"
  | "audit:read"
  | "settings:read"
  | "settings:write";

const readAll: Permission[] = [
  "applications:read", "centers:read", "services:read", "appointments:read",
  "faqs:read", "tickets:read", "reports:read", "settings:read",
];

export const rolePermissions: Record<AdminRole, Permission[]> = {
  super_admin: [...readAll, "centers:write", "services:write", "appointments:write", "faqs:write", "tickets:write", "audit:read", "settings:write"],
  ops_admin: [...readAll, "centers:write", "services:write", "appointments:write", "faqs:write", "tickets:write", "audit:read"],
  content_editor: ["applications:read", "centers:read", "centers:write", "services:read", "faqs:read", "faqs:write", "tickets:read", "reports:read"],
  support_agent: ["applications:read", "centers:read", "services:read", "appointments:read", "faqs:read", "tickets:read", "tickets:write"],
  nira_liaison: readAll,
};

export function can(role: AdminRole, permission: Permission) {
  return rolePermissions[role].includes(permission);
}

export function roleLabel(role: AdminRole) {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
