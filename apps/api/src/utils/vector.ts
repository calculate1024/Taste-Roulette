/** Cosine distance between two vectors. Returns 1.0 for zero/empty vectors. */
export function cosineDistance(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 1.0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 1.0;
  return 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
