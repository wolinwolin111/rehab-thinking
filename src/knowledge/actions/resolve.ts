import { ACTION_TERMS } from "./terms.ts";
import type { Register } from "./types.ts";

export function termText(key: string, register: Register): string {
  const term = (ACTION_TERMS as Record<string, { plain: string; pro: string }>)[key];
  if (!term) throw new Error(`unknown action term: ${key}`);
  return term[register];
}

/** 把 {heel-raise-standing} 换成对应语域的叫法；{dose.xxx} 原样留给 fillTemplate。 */
export function renderHow(_actions: string[], template: string, register: Register): string {
  const text = template.replace(/\{(?!dose\.)([^}]+)\}/g, (_whole, token: string) => termText(token, register));
  const leftover = text.replace(/\{dose\.[^}]+\}/g, "").match(/\{[^}]+\}/);
  if (leftover) throw new Error(`unresolved token "${leftover[0]}" in: ${template}`);
  return text;
}

/** 把 {dose.sets} 之类换成剂量值。必须在 renderHow 之后调用。 */
export function fillTemplate(template: string, dose: Record<string, string | number>): string {
  return template.replace(/\{dose\.([^}]+)\}/g, (_whole, token: string) => {
    const value = dose[token];
    if (value === undefined) throw new Error(`missing dose: ${token}`);
    return String(value);
  });
}
