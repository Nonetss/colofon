import { useEffect, useState } from "react"
import { useGitCredentialSave } from "@/features/content-repositories/manage/hooks/use-git-credentials"
import { urlWithAccess } from "@/features/content-repositories/manage/model/access"
import {
  type CredentialChoice,
  credentialsForUrl,
  defaultChoice,
  type GitCredentials,
  hostOfUrl,
  readCredentialId,
} from "@/features/content-repositories/manage/model/credential-choice"

interface RepositoryAccessOptions {
  open: boolean
  /** The stored repository's credential and masked URL, when editing. */
  repository: { credentialId: string | null; url: string } | null
  /** The credentials the user has saved, once read. */
  credentials: GitCredentials | undefined
  /** The URL field as typed. */
  url: string
}

/** What a submit sends for the repository's address and login. */
export type PreparedAccess = {
  url: string
  /** `undefined` leaves the login as it is; `null` removes it. */
  credentialId: string | null | undefined
}

/**
 * The login of a repository form: which saved credential it clones with, or
 * the username and token to save as a new one. Without a server that can
 * store credentials, those go inside the URL.
 */
export function useRepositoryAccess({
  open,
  repository,
  credentials,
  url,
}: RepositoryAccessOptions) {
  const save = useGitCredentialSave()
  const [picked, setPicked] = useState<CredentialChoice | null>(null)
  const [user, setUser] = useState("")
  const [token, setToken] = useState("")

  useEffect(() => {
    if (!open) return
    setPicked(null)
    setUser("")
    setToken("")
  }, [open])

  const saving = credentials?.enabled === true
  // While editing with the URL left empty, the stored repository's host.
  const hostUrl = url.trim() === "" ? (repository?.url ?? "") : url.trim()
  const matching = credentialsForUrl(credentials?.credentials ?? [], hostUrl)
  const current = repository?.credentialId ?? null
  const choice = picked ?? defaultChoice(matching, current)
  const typing = !saving || choice.kind === "new"

  /** The URL as the branches and folders reads take it. */
  const readUrl = typing
    ? urlWithAccess(url.trim(), user.trim(), token)
    : url.trim()

  async function prepare(): Promise<PreparedAccess> {
    const trimmed = url.trim()
    if (!saving) {
      return {
        url: urlWithAccess(trimmed, user.trim(), token),
        credentialId: undefined,
      }
    }
    if (choice.kind === "saved") {
      return { url: trimmed, credentialId: choice.id }
    }
    if (choice.kind === "none") return { url: trimmed, credentialId: null }
    const host = hostOfUrl(trimmed)
    if (host === undefined) return { url: trimmed, credentialId: undefined }
    const saved = await save.mutateAsync({
      host,
      username: user.trim(),
      token,
    })
    return { url: trimmed, credentialId: saved.id }
  }

  return {
    saving,
    matching,
    choice,
    choose: setPicked,
    user,
    setUser,
    token,
    setToken,
    /** Whether the form must be given a URL: a new login needs its host. */
    needsUrl: token !== "" || choice.kind === "new",
    readUrl,
    readCredentialId: readCredentialId(choice),
    prepare,
    isPending: save.isPending,
  }
}
