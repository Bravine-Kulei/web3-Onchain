export type SiweHealth = { ok: boolean; domainMatch: boolean }

export function getSiweHealth(
  sessionSecret: string | undefined,
  configuredDomain: string | undefined,
  expectedDomain: string | undefined,
): SiweHealth {
  const domainMatch = Boolean(configuredDomain && expectedDomain && configuredDomain === expectedDomain)
  return { ok: Boolean(sessionSecret) && domainMatch, domainMatch }
}
