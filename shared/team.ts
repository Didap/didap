// Chi ci ha messo le mani: i cinque di Didap. Una scheda prodotto li
// elenca per chiave nel frontmatter (`team`); le illustrazioni di
// Vitantonio sono in public/team/illustrations/<chiave>.svg.
// width: larghezza dell'illustrazione sul riquadro (193.3 di base).

export const TEAM = {
  barbara: { name: 'Barbara', bg: 'bg-banana', width: 'w-[75%]' },
  william: { name: 'William', bg: 'bg-green', width: 'w-[64.1%]' },
  cristiano: { name: 'Cristiano', bg: 'bg-red', width: 'w-[66.7%]' },
  alessandro: { name: 'Alessandro', bg: 'bg-blush', width: 'w-[64.7%]' },
  vitantonio: { name: 'Vitantonio', bg: 'bg-ink', width: 'w-[68.3%]' },
} as const

export type TeamMember = keyof typeof TEAM
export const TEAM_MEMBERS = Object.keys(TEAM) as [TeamMember, ...TeamMember[]]
