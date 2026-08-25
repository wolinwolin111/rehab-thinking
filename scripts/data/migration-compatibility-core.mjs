const DESTRUCTIVE_SQL = /\b(DROP\s+(TABLE|COLUMN|INDEX)|TRUNCATE\s+TABLE|ALTER\s+TABLE\s+\S+\s+RENAME|ALTER\s+COLUMN)\b/i;
const ADD_NOT_NULL = /ALTER\s+TABLE\s+\S+\s+ADD\s+\S+\s+[^;]*\bNOT\s+NULL\b/i;

export function inspectAdditiveMigration(id, sql) {
  const issues = [];
  if (DESTRUCTIVE_SQL.test(sql)) issues.push({ id, code: "destructive-sql" });
  for (const statement of sql.split(/-->[\s-]*statement-breakpoint[\s;]*/i)) {
    if (ADD_NOT_NULL.test(statement) && !/\bDEFAULT\b/i.test(statement)) {
      issues.push({ id, code: "not-null-without-default" });
    }
  }
  return issues;
}
