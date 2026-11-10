import { query } from "./db";
import type { SessionUser } from "./auth";

// Records an audit entry. Never throws: logging must not break the action.
export async function audit(
  user: SessionUser,
  action: string,
  entity: string,
  entityId?: string | number | null,
  detail?: string
) {
  try {
    await query(
      "insert into audit_logs (user_id, user_name, action, entity, entity_id, detail) values ($1,$2,$3,$4,$5,$6)",
      [user.id, `${user.name} (${user.role})`, action, entity, entityId == null ? null : String(entityId), detail ?? null]
    );
  } catch (e) {
    console.error("audit failed", e);
  }
}
