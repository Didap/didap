import { describe, expect, it, vi } from 'vitest'
import type { GrantDraft } from '#shared/grant-draft'
import { createGrantDraftEditor, holdsDraft, shownGrant, type DraftEditorDeps, type DraftState } from '../app/utils/grantDraftEditor'

// L'editor della bozza nel pannello con finte API: niente testo perso con un
// salvataggio in corso, una lettura in ritardo o un salvataggio rifiutato

const draft = (content: string, version: number): GrantDraft =>
  ({ content, version, savedAt: '2026-10-27T13:05:00Z', savedBy: 'Ale', byClaude: false })

// Una promessa che il test risolve o rifiuta quando vuole
function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setup(state: DraftState = { draft: null, hasFolder: false }) {
  const reads: ReturnType<typeof deferred<DraftState>>[] = []
  const writes: { body: { content: string, baseVersion: number | null }, d: ReturnType<typeof deferred<{ draft: GrantDraft }>> }[] = []
  let first = true
  const deps: DraftEditorDeps = {
    read: () => {
      if (first) {
        first = false
        return Promise.resolve(state)
      }
      const d = deferred<DraftState>()
      reads.push(d)
      return d.promise
    },
    write: (_id, body) => {
      const d = deferred<{ draft: GrantDraft }>()
      writes.push({ body, d })
      return d.promise
    },
    notify: vi.fn(),
    errorText: () => 'errore',
    onFolder: vi.fn(),
  }
  return { editor: createGrantDraftEditor(deps), deps, reads, writes }
}

const tick = () => new Promise(r => setTimeout(r, 0))

describe('editor della bozza', () => {
  it('scartare durante un salvataggio torna al testo in viaggio: finito, l\'editor mostra quello salvato', async () => {
    const { editor, writes, deps } = setup()
    await editor.open('A')
    editor.text = 'Prima stesura'
    const saving = editor.save()
    expect(editor.saving).toBe(true)
    editor.text = 'Prima stesura e altro'
    editor.discard()
    expect(editor.text).toBe('Prima stesura')
    writes[0]!.d.resolve({ draft: draft('Prima stesura', 1) })
    await saving
    expect(editor.saved?.version).toBe(1)
    expect(editor.text).toBe('Prima stesura')
    expect(editor.dirty).toBe(false)
    expect(deps.onFolder).toHaveBeenCalledWith('A')
  })

  it('una lettura che torna durante il salvataggio non cambia testo né versione', async () => {
    const { editor, writes, reads } = setup()
    await editor.open('A')
    editor.text = 'Nuova'
    const saving = editor.save()
    // La scheda si rimonta e rilegge: la risposta è di prima del salvataggio
    const reading = editor.open('A')
    reads[0]!.resolve({ draft: null, hasFolder: false })
    await reading
    expect(editor.text).toBe('Nuova')
    writes[0]!.d.resolve({ draft: draft('Nuova', 1) })
    await saving
    expect(editor.text).toBe('Nuova')
    expect(editor.dirty).toBe(false)
    expect(editor.hasFolder).toBe(true)
  })

  it('scritto durante il salvataggio: resta da salvare, dalla versione nuova', async () => {
    const { editor, writes } = setup({ draft: draft('v1', 1), hasFolder: true })
    await editor.open('A')
    editor.text = 'v2'
    const saving = editor.save()
    expect(writes[0]!.body).toEqual({ content: 'v2', baseVersion: 1 })
    editor.text = 'v2 e altro'
    writes[0]!.d.resolve({ draft: draft('v2', 2) })
    await saving
    expect(editor.dirty).toBe(true)
    const again = editor.save()
    expect(writes[1]!.body).toEqual({ content: 'v2 e altro', baseVersion: 2 })
    writes[1]!.d.resolve({ draft: draft('v2 e altro', 3) })
    await again
  })

  it('409: il testo scritto resta, col riquadro; "Ricarica" lo sostituisce', async () => {
    const { editor, writes, reads, deps } = setup({ draft: draft('v1', 1), hasFolder: true })
    await editor.open('A')
    editor.text = 'mia versione'
    const saving = editor.save()
    writes[0]!.d.reject({ statusCode: 409, data: { data: { version: 2, savedAt: '2026-10-27T13:05:00Z', savedBy: 'Ale', byClaude: true } } })
    await saving
    expect(editor.text).toBe('mia versione')
    expect(editor.dirty).toBe(true)
    expect(editor.conflict).toContain('Ale via Claude')
    expect(deps.notify).not.toHaveBeenCalled()
    const reloading = editor.load(true)
    reads[0]!.resolve({ draft: draft('di Claude', 2), hasFolder: true })
    await reloading
    expect(editor.text).toBe('di Claude')
    expect(editor.saved?.version).toBe(2)
    expect(editor.conflict).toBeNull()
    expect(editor.dirty).toBe(false)
  })

  it('stesso bando: le modifiche restano; un altro bando riparte da zero', async () => {
    const { editor, reads } = setup()
    await editor.open('A')
    editor.text = 'da tenere'
    const reading = editor.open('A')
    reads[0]!.resolve({ draft: draft('di Claude', 1), hasFolder: true })
    await reading
    expect(editor.text).toBe('da tenere')
    expect(editor.saved).toBeNull()
    void editor.open('B')
    await tick()
    expect(editor.grantId).toBe('B')
    expect(editor.text).toBe('')
    expect(editor.loaded).toBe(false)
  })
})

describe('bando aperto con la bozza da tenere', () => {
  const A = { id: 'A' }
  const B = { id: 'B' }

  it('holdsDraft: modifiche o salvataggio in corso, solo per il bando della bozza', () => {
    expect(holdsDraft({ grantId: 'A', dirty: true, saving: false }, 'A')).toBe(true)
    expect(holdsDraft({ grantId: 'A', dirty: false, saving: true }, 'A')).toBe(true)
    expect(holdsDraft({ grantId: 'A', dirty: false, saving: false }, 'A')).toBe(false)
    expect(holdsDraft({ grantId: 'A', dirty: true, saving: false }, 'B')).toBe(false)
    expect(holdsDraft({ grantId: 'A', dirty: true, saving: false }, null)).toBe(false)
  })

  it('shownGrant: fuori dall\'elenco (ricerca, moduli) resta aperto solo se la bozza va tenuta', () => {
    const find = (id: string) => (id === 'A' ? A : null)
    expect(shownGrant('B', [B], false, find)).toBe(B)
    expect(shownGrant('A', [B], true, find)).toBe(A)
    expect(shownGrant('A', [B], false, find)).toBeNull()
    expect(shownGrant('C', [B], true, find)).toBeNull()
    expect(shownGrant(null, [B], true, find)).toBeNull()
  })
})
