import { isRecord } from "#contract/read/records"

// The contract major versions the platform reads. Version 2 names every key
// and fixed value in English and is what the schemas describe; version 1 is
// the same contract with the Spanish names, read by translating its files
// to version 2 first (`#contract/versions/contract-1`). `doc.config.yaml` says which
// one a repository follows, and that decides how every file of it is read.

export type ContractVersion = "1" | "2"

/** The key that declares version 2 in `doc.config.yaml`. */
export const CONTRACT_KEY = "contract"
/** The key that declared version 1 in `doc.config.yaml`. */
export const CONTRACT_1_KEY = "plataforma"
/** The only value version 1 accepts for its key. */
export const CONTRACT_1_VALUE = "1"

/**
 * The version a parsed `doc.config.yaml` follows: `contract` means 2, only
 * `plataforma` means 1, and anything else is read as 2 so the missing key
 * reported is `contract`.
 */
export function contractVersionOf(config: unknown): ContractVersion {
  if (!isRecord(config)) return "2"
  if (Object.hasOwn(config, CONTRACT_KEY)) return "2"
  if (Object.hasOwn(config, CONTRACT_1_KEY)) return "1"
  return "2"
}
