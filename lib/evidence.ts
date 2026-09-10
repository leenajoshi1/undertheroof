import { z } from 'zod';

export type Evidence = {
  id: string;
  sourceType: string;
  sourceName: string;
  content: string;
  sourceUrl?: string;
  timestamp: string;
  synthetic: boolean;
};

const text = z.string().trim().min(1).max(2000);
export const findingSchema = z.object({
  id: text,
  title: text,
  severity: z.enum(['important', 'investigate', 'informational']),
  fact: text,
  inference: text,
  evidenceIds: z.array(text).min(1).max(12),
  supportingQuotes: z.array(z.object({ evidenceId: text, quote: text }).strict()).min(1).max(12),
  confidence: z.enum(['low', 'medium', 'high']),
  recommendedAction: text,
}).strict();
export const submissionSchema = z.object({ findings: z.array(findingSchema).max(5) }).strict();
export type Finding = z.infer<typeof findingSchema>;
export type GroundingError = {
  type: 'GROUNDING_ERROR'; finding_id: string; error: string;
  statement: string; required_correction: string; available_evidence: Evidence[];
};

export function validateFindings(input: unknown, evidence: Evidence[]) {
  const parsed = submissionSchema.safeParse(input);
  const errors: GroundingError[] = [];
  const fail = (id: string, code: string, statement: string, correction: string) => {
    errors.push({ type: 'GROUNDING_ERROR', finding_id: id, error: code, statement,
      required_correction: correction, available_evidence: evidence });
  };
  if (!parsed.success) {
    fail('submission', 'INVALID_STRUCTURE', parsed.error.message, 'Return the required schema with distinct fact and inference fields and supporting evidence.');
    return { ok: false as const, errors };
  }
  const ids = new Set<string>();
  for (const f of parsed.data.findings) {
    if (ids.has(f.id)) fail(f.id, 'DUPLICATE_ID', f.id, 'Use unique finding IDs.');
    ids.add(f.id);
    const cited = evidence.filter(e => f.evidenceIds.includes(e.id));
    if (f.evidenceIds.some(id => !evidence.some(e => e.id === id)))
      fail(f.id, 'UNKNOWN_EVIDENCE', f.fact, 'Cite only evidence returned by tools in this investigation.');
    if (f.supportingQuotes.some(q => !f.evidenceIds.includes(q.evidenceId) || !cited.some(e => e.id === q.evidenceId && e.content.includes(q.quote))))
      fail(f.id, 'UNSUPPORTED_QUOTE', f.fact, 'Copy exact, complete source sentences from the cited evidence.');
    if (f.evidenceIds.some(id => !f.supportingQuotes.some(q => q.evidenceId === id)))
      fail(f.id, 'CITATION_WITHOUT_QUOTE', f.fact, 'Include a supporting quote for every cited source.');
    // Facts are deliberately extractive in P0; free-form synthesis belongs in inference.
    const groundedFact = f.supportingQuotes.map(q => `[${q.evidenceId}] ${q.quote}`).join('\n');
    if (f.fact !== groundedFact)
      fail(f.id, 'UNSUPPORTED_ASSERTION', f.fact, 'Set fact to supportingQuotes mapped to "[evidenceId] quote", joined by a newline. Put interpretations in inference.');
    const absence = cited.some(e => /no matching permit|no permit found/i.test(e.content));
    const accusation = /\bunpermitted\b|\billegal(?:ly)?\b|without (?:a )?permit|\bfraud\b|\bconceal(?:ed|ment)\b/i.test(`${f.title} ${f.inference} ${f.recommendedAction}`);
    if (absence && accusation)
      fail(f.id, 'ABSENCE_IS_NOT_PROOF', f.inference, 'Absence of a matching permit does not prove wrongdoing. Describe the search limitation and ask the buyer to verify documentation; avoid legal accusations.');
  }
  return errors.length ? { ok: false as const, errors } : { ok: true as const, findings: parsed.data.findings };
}
