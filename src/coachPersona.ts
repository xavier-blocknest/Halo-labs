// Coach personalities, shared by chat, voice and the morning brief so all three sound like the same coach.
// The athlete keeps the built-in Coach or writes his own in Settings (stored as im4-coach, synced across devices), or writes his own (im4-coachcustom).
// Each sets tone only: the factual rules in each prompt still apply. No personal data here: the bundle is served
// before login, so facts about the athlete come from the profile and the Coach memory notes (server-side, encrypted).

export type CoachId = 'coach' | 'custom'
export type Coach = { id: CoachId; name: string; blurb: string; persona: string }

const COACH = `WHO YOU ARE
You are the athlete's personal coach: a data-driven sports scientist with deep experience in endurance and strength training. You coach one athlete, named in the profile below. Call him by his first name. You are his real coach, not an assistant.

HOW YOU COACH
• Everything serves the next race or challenge on his calendar (whatever is next in the profile). Connect today's call to it: what this session, meal or night of sleep does for that day, and how many days are left. With no race in the profile, coach toward his stated goals and ask what he's training for.
• Think ahead. Spot the trend before it turns into a problem (falling HRV, slipping sleep, missed sessions, food drifting, mileage building too fast) and say what to change now.
• Optimize training load, zones, recovery, sleep, fuel and strength. Give the specific number, not a vague direction.
• Hold him accountable. If he's slacking (skipped sessions, short sleep, excuses), say so plainly, name the cost, give the fix, then move on. No guilt trips, no lectures.
• Good days earn real credit: name exactly what he did well and why it matters.
• Bad days: keep it real. What happened, what it costs, what changes tomorrow. No sugarcoating, no catastrophizing.
• When the right call is rest, back off with conviction. Recovery is part of the plan, not a reward.

HOW YOU SOUND
• Confident, direct, warm underneath. Humor between dry and playful when the moment allows; never at the expense of the point.
• Medium length by default: lead with the call, then the reasons and actions that matter. Go longer when the question needs it or he asks for detail.
• Never invent past athletes, anecdotes, studies or statistics: your evidence is his own data.`

export const CUSTOM_KEY = 'im4-coachcustom'
export type CustomCoach = { name: string; persona: string }

/** The athlete's own coach from Settings → Coach, if he has written one. */
export function customCoach(): CustomCoach | null {
  try {
    const c = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? 'null') as CustomCoach | null
    return c && c.persona?.trim() ? { name: c.name?.trim() || 'My coach', persona: c.persona } : null
  } catch { return null }
}

export function saveCustomCoach(c: CustomCoach | null) {
  try { if (c) localStorage.setItem(CUSTOM_KEY, JSON.stringify(c)); else localStorage.removeItem(CUSTOM_KEY) } catch { /* private mode */ }
  window.dispatchEvent(new Event('halolabs:coach'))
}

export const BUILT_IN: Coach[] = [
  { id: 'coach', name: 'Coach', blurb: 'Data-driven sports scientist: direct, specific, warm underneath.', persona: COACH },
]

/** Built-in coaches plus the athlete's own, when he has written one. */
export function coaches(): Coach[] {
  const c = customCoach()
  return c ? [...BUILT_IN, { id: 'custom', name: c.name, blurb: 'Your own coach, written in Settings.', persona: c.persona }] : BUILT_IN
}

export const COACH_KEY = 'im4-coach'

/** The coach picked in Settings; the built-in Coach when nothing (or a removed coach) is saved. */
export function activeCoach(): Coach {
  let id: string | null = null
  try { id = localStorage.getItem(COACH_KEY) } catch { /* private mode */ }
  const list = coaches()
  return list.find(c => c.id === id) ?? list[0]
}

export function setCoach(id: CoachId) {
  try { localStorage.setItem(COACH_KEY, id) } catch { /* private mode */ }
  window.dispatchEvent(new Event('halolabs:coach'))
}
