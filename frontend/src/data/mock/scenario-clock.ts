export interface ScenarioClock {
  now(): Date
}

export function createScenarioClock(instant: string | Date): ScenarioClock {
  const fixed = new Date(instant)
  if (Number.isNaN(fixed.getTime())) throw new Error('Scenario clock requires a valid timestamp.')
  return { now: () => new Date(fixed.getTime()) }
}

export const DEFAULT_SCENARIO_CLOCK = createScenarioClock('2026-11-02T08:00:00.000Z')
