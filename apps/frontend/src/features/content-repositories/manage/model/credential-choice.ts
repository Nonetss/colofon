import type { AppRouterClient } from "@nonete/api/router"

type GitCredentialClient = AppRouterClient["v1"]["gitCredential"]

export type GitCredentials = Awaited<ReturnType<GitCredentialClient["list"]>>

export type GitCredential = GitCredentials["credentials"][number]

export type SaveGitCredentialInput = Parameters<GitCredentialClient["save"]>[0]

/** What the form clones with: no login, a saved one, or one typed now. */
export type CredentialChoice =
  | { kind: "none" }
  | { kind: "saved"; id: string }
  | { kind: "new" }

/** The host (with its port) of a typed URL, or `undefined` while it isn't one. */
export function hostOfUrl(url: string): string | undefined {
  try {
    return new URL(url).host
  } catch {
    return undefined
  }
}

/** The credentials that are for the host of `url`, most recently saved first. */
export function credentialsForUrl(
  credentials: GitCredential[],
  url: string
): GitCredential[] {
  const host = hostOfUrl(url)
  if (host === undefined) return []
  return credentials
    .filter((credential) => credential.host === host)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/**
 * The choice before the user touches the select: the credential the edited
 * repository already uses, else the latest one saved for the URL's host, else
 * none.
 */
export function defaultChoice(
  matching: GitCredential[],
  current: string | null
): CredentialChoice {
  if (current !== null && matching.some((each) => each.id === current)) {
    return { kind: "saved", id: current }
  }
  const [latest] = matching
  if (latest !== undefined) return { kind: "saved", id: latest.id }
  return { kind: "none" }
}

/** The select's value of a choice. */
export function choiceValue(choice: CredentialChoice): string {
  if (choice.kind === "saved") return choice.id
  return choice.kind
}

/** The choice of a select value: `none`, `new` or a credential id. */
export function choiceOfValue(value: string): CredentialChoice {
  if (value === "none") return { kind: "none" }
  if (value === "new") return { kind: "new" }
  return { kind: "saved", id: value }
}

/**
 * The credential id a branches or folders read sends: the saved one chosen.
 * Only a typed URL carries it; a stored repository reads with its own.
 */
export function readCredentialId(choice: CredentialChoice): string | undefined {
  if (choice.kind === "saved") return choice.id
  return undefined
}
