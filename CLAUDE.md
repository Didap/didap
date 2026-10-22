# Didap project conventions

## Writing style

- Never use em dashes (Unicode U+2014) or en dashes (U+2013) in any text: chat responses, code comments, commit messages, copy, content, anything. Use a hyphen-minus (`-`, U+002D) at most, or rephrase into separate sentences.
- This applies to every artifact in the repo and to direct conversation with the user.

## Copy layout (sbandieramento)

Full rules in `docs/copy/sbandieramento.md`. In short:

- Text fills its column: no `max-w-*` on text blocks, no `text-wrap: balance`.
- Ragged right: left aligned, never justified, no hyphenation, `text-wrap: pretty` evens the rag (base styles in `app/assets/css/main.css`). Sentences flow in the same paragraph: never break the line after a full stop. A manual `\n` (with `whitespace-pre-line`) only where the design splits a title on purpose.
- Never end a line on a short word, never split a number from its unit, never start a line with the hyphen of an aside, never leave a single word on the last line. `typeset()` in `shared/typeset.ts` does this for every translated string and for text from content frontmatter in the template; markdown bodies go through `typesetBody()` in the `content:file:afterParse` hook.
- `test/typeset.test.ts` fails if a translated text breaks the line after a full stop.
