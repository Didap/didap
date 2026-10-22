# Didap project conventions

## Writing style

- Never use em dashes (Unicode U+2014) or en dashes (U+2013) in any text: chat responses, code comments, commit messages, copy, content, anything. Use a hyphen-minus (`-`, U+002D) at most, or rephrase into separate sentences.
- This applies to every artifact in the repo and to direct conversation with the user.

## Copy layout (sbandieramento)

Full rules in `docs/copy/sbandieramento.md`. In short:

- Text fills its column: no `max-w-*` on text blocks, no `text-wrap: balance` or `pretty`.
- Every visible text puts each sentence on its own line: write `\n` after the full stop in `i18n/locales/*.json` and give the element `whitespace-pre-line`. Only alt text and SEO descriptions keep flowing.
- Never end a line on a short word, never split a number from its unit, never leave a single word on the last line. `typeset()` in `shared/typeset.ts` does this for every translated string; text from content files goes through `typesetLines()` in the template.
- `test/typeset.test.ts` fails if a translated text has two sentences on one line.
