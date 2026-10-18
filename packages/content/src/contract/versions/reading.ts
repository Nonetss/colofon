import { CONFIG_FILE } from "#contract/read/files"
import type { ContentProblem } from "#contract/read/problems"
import { isRecord } from "#contract/read/records"
import {
  type ContractReading,
  translateContract1,
} from "#contract/versions/contract-1"
import { CONTRACT_1_KEY, CONTRACT_1_VALUE } from "#contract/versions/detect"

// Reading a file under the repository's contract version: a version 2 file
// as it is, a version 1 file translated to the version 2 names first, with
// each version 2 key it holds reported, and its version checked.

/**
 * `data` under the version 2 names: as it is for a version 2 repository,
 * translated for a version 1 one, whose version 2 keys are reported.
 */
export function asContract2(
  data: unknown,
  file: string,
  reading: ContractReading,
  problems: ContentProblem[]
): unknown {
  if (reading.contract === "2") return data
  const translated = translateContract1(reading.file, data)
  for (const at of translated.foreign) {
    problems.push({ file, message: foreignKeyMessage(at) })
  }
  return translated.data
}

/** The problem of a version 2 key in a version 1 file. */
export function foreignKeyMessage(at: readonly PropertyKey[]): string {
  const key = String(at.at(-1))
  return `${at.join(".")}: \`${key}\` es una clave del contrato 2, y este repositorio sigue el contrato 1 (\`${CONTRACT_1_KEY}: "${CONTRACT_1_VALUE}"\`)`
}

/** Version 1 says its version as `plataforma: "1"`, between quotes. */
export function checkContract1Version(
  config: unknown,
  problems: ContentProblem[]
) {
  if (!isRecord(config)) return
  if (config[CONTRACT_1_KEY] === CONTRACT_1_VALUE) return
  problems.push({
    file: CONFIG_FILE,
    message: `${CONTRACT_1_KEY}: \`${CONTRACT_1_KEY}\` es la versión del contrato, entre comillas: "${CONTRACT_1_VALUE}"`,
  })
}
