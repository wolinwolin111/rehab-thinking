export type ProfessionalNoteRecord = {
  noteId: string;
  caseId: string;
  problemThreadId: string;
  sessionId: string;
  authorType: "professional" | "owner";
  text: string;
  createdAt: string;
  updatedAt: string;
  supersedesNoteId?: string;
};

type NoteSnapshotInput = {
  localCaseId?: string;
  problemThreadId?: string;
  sessionId?: string;
  professionalNotes?: string;
  assessmentRevision?: number;
};

function noteId(input: NoteSnapshotInput, text: string) {
  const digest = text.trim().replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, "-").slice(0, 80) || "empty";
  return `note:${input.sessionId ?? "legacy-session"}:${input.assessmentRevision ?? 0}:${digest}`;
}

/** Notes are auditable annotations only; they never become findings or candidates. */
export function buildProfessionalNoteRecords(input: NoteSnapshotInput, recordedAt = new Date().toISOString()): ProfessionalNoteRecord[] {
  const text = input.professionalNotes?.trim() ?? "";
  if (!text) return [];
  return [{
    noteId: noteId(input, text),
    caseId: input.localCaseId ?? "legacy-case",
    problemThreadId: input.problemThreadId ?? "legacy-thread",
    sessionId: input.sessionId ?? "legacy-session",
    authorType: "professional",
    text,
    createdAt: recordedAt,
    updatedAt: recordedAt,
  }];
}

export function mergeProfessionalNoteRecords(previous: ProfessionalNoteRecord[], current: ProfessionalNoteRecord[]) {
  const merged = [...previous];
  for (const next of current) {
    const same = merged.find((entry) => entry.noteId === next.noteId);
    if (same) continue;
    const priorIndex = merged.findIndex((entry) => entry.sessionId === next.sessionId && entry.authorType === next.authorType && !entry.supersedesNoteId);
    if (priorIndex >= 0) {
      const prior = merged[priorIndex];
      merged[priorIndex] = { ...prior, supersedesNoteId: next.noteId };
      merged.push({ ...next, supersedesNoteId: prior.noteId });
    } else {
      merged.push(next);
    }
  }
  return merged;
}
