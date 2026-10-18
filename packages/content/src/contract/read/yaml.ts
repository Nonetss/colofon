import { parse, YAMLParseError } from "yaml"
import type { ContentProblem } from "#contract/read/problems"

// YAML as the platform reads it: an empty file and a syntax error are each
// one problem, with the line and column and, for the usual mistake of an
// unquoted text with ": ", how to fix it.

export function parseYaml(
  text: string,
  file: string,
  problems: ContentProblem[]
): unknown {
  try {
    const data: unknown = parse(text)
    if (data === null) {
      problems.push({ file, message: "Está vacío" })
      return undefined
    }
    return data
  } catch (error) {
    if (!(error instanceof YAMLParseError)) throw error
    problems.push({ file, message: yamlErrorMessage(error) })
    return undefined
  }
}

function yamlErrorMessage(error: YAMLParseError): string {
  const position = error.linePos?.[0]
  const reason = yamlErrorReason(error)
  if (position === undefined) return `YAML no válido: ${reason}`
  return `YAML no válido en la línea ${position.line}, columna ${position.col}: ${reason}`
}

export function yamlErrorReason(error: YAMLParseError): string {
  if (error.code === "BLOCK_AS_IMPLICIT_KEY") {
    return 'un texto con ": " dentro tiene que ir entre comillas'
  }
  const [firstLine = ""] = error.message.split("\n")
  return firstLine.replace(/ at line \d+, column \d+:?$/, "")
}
