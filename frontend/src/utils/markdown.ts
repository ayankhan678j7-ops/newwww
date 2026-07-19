/**
 * Strip Markdown formatting symbols from AI-generated text at display time.
 *
 * Removes ONLY:
 *   - Heading markers at the start of a line: '#', '##', '###', etc.
 *   - Bold delimiters: '**'
 *   - Bullet-point hyphens at the start of a line: '- '
 *
 * Preserves everything else, including hyphens inside words (e.g. "step-by-step")
 * and URLs. Content and formatting semantics (paragraphs, spacing) are left intact.
 */
export function stripMarkdown(input: string): string {
  if (!input) return input;
  let out = input;
  // Bold **...** → drop the delimiters, keep the wrapped text.
  out = out.replace(/\*\*/g, '');
  // Line-start Markdown heading markers ('# ', '## ', '### ', ...) → drop.
  out = out.replace(/^[ \t]*#{1,6}[ \t]+/gm, '');
  // Line-start Markdown bullet dashes ('- item') → drop the leading '- '.
  out = out.replace(/^[ \t]*-[ \t]+/gm, '');
  return out;
}
