// jsonc-parser's `main` is a UMD build whose `require`s of its own files the
// backend bundle cannot follow (it fails at start with "Cannot find module
// './impl/format'"), so the ESM build is imported directly.
import {
  type ParseError,
  parse as parseJsonText,
  printParseErrorCode,
} from "jsonc-parser/lib/esm/main.js"
import type { ContentProblem } from "#contract/read/problems"

/** What each JSON syntax error means, in the words the platform reports. */
const JSON_ERRORS: Partial<
  Record<ReturnType<typeof printParseErrorCode>, string>
> = {
  InvalidSymbol: "hay un carácter que no es JSON",
  InvalidNumberFormat: "un número mal escrito",
  PropertyNameExpected: "falta el nombre de una clave, entre comillas dobles",
  ValueExpected:
    "falta un valor (¿una coma de más al final de una lista o un objeto?)",
  ColonExpected: "falta `:` tras el nombre de una clave",
  CommaExpected: "falta una coma entre dos elementos",
  CloseBraceExpected: "falta cerrar un objeto con `}`",
  CloseBracketExpected: "falta cerrar una lista con `]`",
  EndOfFileExpected: "sobra texto tras el final",
  InvalidCommentToken: "JSON no admite comentarios",
  UnexpectedEndOfComment: "JSON no admite comentarios",
  UnexpectedEndOfString: "un texto sin cerrar",
  UnexpectedEndOfNumber: "un número sin terminar",
  InvalidUnicode: "un carácter \\u mal escrito",
  InvalidEscapeCharacter: "un carácter con \\ mal escrito",
  InvalidCharacter: "un carácter de control en un texto",
}

/**
 * Strict JSON (no comments, no trailing commas), with the line and column
 * of the first syntax error; `undefined` when it is not valid or is empty.
 */
export function parseJson(
  text: string,
  file: string,
  problems: ContentProblem[]
): unknown {
  if (text.trim() === "") {
    problems.push({ file, message: "Está vacío" })
    return undefined
  }
  const errors: ParseError[] = []
  const data: unknown = parseJsonText(text, errors, {
    disallowComments: true,
    allowTrailingComma: false,
    allowEmptyContent: false,
  })
  const [first] = errors
  if (first === undefined) return data
  const { line, column } = positionOf(text, first.offset)
  const reason = jsonErrorReason(first)
  problems.push({
    file,
    message: `JSON no válido en la línea ${line}, columna ${column}: ${reason}`,
  })
  return undefined
}

function jsonErrorReason(error: ParseError): string {
  const code = printParseErrorCode(error.error)
  const known = JSON_ERRORS[code]
  if (known !== undefined) return known
  return code
}

/** The 1-based line and column of `offset` in `text`. */
function positionOf(
  text: string,
  offset: number
): { line: number; column: number } {
  const before = text.slice(0, offset).split("\n")
  const last = before.at(-1) ?? ""
  return { line: before.length, column: last.length + 1 }
}
