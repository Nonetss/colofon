import { checkUserRemote, parseTrustedHosts } from "@nonete/content"
import { env } from "@nonete/env/server"

/** The internal git hosts the operator trusts for users' repositories. */
export function trustedGitHosts() {
  return parseTrustedHosts(env.TRUSTED_GIT_HOSTS)
}

/** `checkUserRemote` with the operator's trusted hosts. */
export function checkUserRemoteWithTrusted(url: string) {
  return checkUserRemote(url, undefined, trustedGitHosts())
}
