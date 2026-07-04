import { createHash } from "crypto";

/** Parse "Paslon 02 - Raihan & Rosyid" → "02" */
export function parsePaslonId(pilihan: string): string {
  const match = pilihan.match(/paslon\s*0*(\d+)/i);
  if (match) {
    return match[1].padStart(2, "0");
  }
  return "unknown";
}

/** Stable vote ID from email + timestamp */
export function voteIdFromRow(email: string, timestamp: string): string {
  return createHash("sha256")
    .update(`${email.trim().toLowerCase()}|${timestamp.trim()}`)
    .digest("hex")
    .slice(0, 32);
}

export function cell(row: string[], index: number): string {
  return (row[index] ?? "").trim();
}
