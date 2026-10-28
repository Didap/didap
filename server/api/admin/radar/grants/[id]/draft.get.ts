// Bozza della candidatura (null: non c'è ancora) e se il bando ha la cartella
// (senza, il pannello avvisa che salvando la si crea)
export default defineEventHandler(async event => readDraftState(await useDb(), uuidParam(event)))
