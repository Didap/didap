// Chi ci ha messo le mani: i cinque di Didap. Una scheda prodotto li
// elenca per chiave nel frontmatter (`team`); le illustrazioni di
// Vitantonio sono in public/team/illustrations/<chiave>.svg.

export const TEAM = {
  barbara: 'Barbara',
  william: 'William',
  cristiano: 'Cristiano',
  alessandro: 'Alessandro',
  vitantonio: 'Vitantonio',
} as const

export type TeamMember = keyof typeof TEAM
export const TEAM_MEMBERS = Object.keys(TEAM) as [TeamMember, ...TeamMember[]]
