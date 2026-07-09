/** Canonical metadata string when no document file is attached. Must match deploy seeds and issue flow. */
export function metadataHashInput(requestId: string, studentId: string, program: string): string {
  return `${requestId}:${studentId}:${program}`
}
