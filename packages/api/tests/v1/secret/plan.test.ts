import { describe, expect, test } from "bun:test"
import { type SecretRow, secretRow } from "@nonete/db/testing"
import type { SecretValues } from "#v1/secret/cipher"
import {
  loggedUrl,
  type PlanResult,
  planRequest,
  type RequestInput,
} from "#v1/secret/request/plan"

const komodo = secretRow({
  name: "komodo",
  fieldNames: ["key", "secret"],
  origins: ["https://komodo.casa.lan"],
})
const pangolin = secretRow({
  id: "00000000-0000-4000-8000-000000000002",
  name: "pangolin",
  fieldNames: ["token"],
  origins: ["http://10.0.0.5:3003"],
})
const wildcard = secretRow({
  id: "00000000-0000-4000-8000-000000000003",
  name: "cloud",
  fieldNames: ["token"],
  origins: ["https://*.example.com"],
})

const VALUES: Record<string, SecretValues> = {
  komodo: { key: "komodo-key-value", secret: "komodo-secret-value" },
  pangolin: { token: "pangolin-token" },
  cloud: { token: "cloud-token" },
}

function valuesOf(row: SecretRow): SecretValues | null {
  return VALUES[row.name] ?? null
}

function plan(
  input: RequestInput,
  secrets: SecretRow[] = [komodo, pangolin, wildcard],
  values: (row: SecretRow) => SecretValues | null = valuesOf
): PlanResult {
  return planRequest(input, secrets, values)
}

function refusal(result: PlanResult): string {
  if (result.ok) throw new Error("expected a refusal")
  return result.refusal.reason
}

function rendered(result: PlanResult) {
  if (!result.ok) throw new Error(`refused: ${result.refusal.reason}`)
  const values = new Map<string, SecretValues>()
  for (const row of result.plan.secrets) {
    const rowValues = valuesOf(row)
    if (rowValues !== null) values.set(row.name, rowValues)
  }
  return result.plan.render(values)
}

const komodoHeaders = {
  "X-Api-Key": "{{komodo.key}}",
  "X-Api-Secret": "{{komodo.secret}}",
}

describe("planRequest", () => {
  test("renders two headers with the stored values", () => {
    const { request } = rendered(
      plan({
        method: "GET",
        url: "https://komodo.casa.lan/read/stacks",
        headers: komodoHeaders,
      })
    )

    expect(request.url).toBe("https://komodo.casa.lan/read/stacks")
    expect(request.headers.get("x-api-key")).toBe("komodo-key-value")
    expect(request.headers.get("x-api-secret")).toBe("komodo-secret-value")
    expect(request.body).toBeUndefined()
  })

  test("sends to a private address its secret lists", () => {
    const result = plan({
      method: "GET",
      url: "http://10.0.0.5:3003/v1/sites",
      headers: { Authorization: "Bearer {{pangolin.token}}" },
    })

    expect(rendered(result).request.headers.get("authorization")).toBe(
      "Bearer pangolin-token"
    )
  })

  test("refuses an origin the secret doesn't list, naming its origins", () => {
    const reason = refusal(
      plan({
        method: "GET",
        url: "https://evil.example/collect",
        headers: komodoHeaders,
      })
    )

    expect(reason).toContain('"komodo"')
    expect(reason).toContain("https://komodo.casa.lan")
    expect(reason).not.toContain("komodo-key-value")
  })

  test("with two secrets, the origin must be allowed by both", () => {
    const reason = refusal(
      plan({
        method: "GET",
        url: "https://komodo.casa.lan/x",
        headers: { A: "{{komodo.key}}", B: "{{pangolin.token}}" },
      })
    )

    expect(reason).toContain('"pangolin"')
  })

  test("a wildcard origin covers subdomains, not the bare host", () => {
    const headers = { Authorization: "Bearer {{cloud.token}}" }

    expect(
      plan({ method: "GET", url: "https://api.example.com/x", headers }).ok
    ).toBe(true)
    expect(
      plan({ method: "GET", url: "https://example.com/x", headers }).ok
    ).toBe(false)
  })

  test("refuses a write method on a secret without allowWrite", () => {
    const reason = refusal(
      plan({
        method: "DELETE",
        url: "http://10.0.0.5:3003/v1/sites/1",
        headers: { Authorization: "Bearer {{pangolin.token}}" },
      })
    )

    expect(reason).toContain("only allows reading methods")
  })

  test("allows a write method on a secret with allowWrite", () => {
    const writable = { ...komodo, allowWrite: true }

    expect(
      plan(
        {
          method: "POST",
          url: "https://komodo.casa.lan/execute",
          headers: komodoHeaders,
          body: { type: "DeployStack" },
        },
        [writable]
      ).ok
    ).toBe(true)
  })

  test("refuses a placeholder in the body unless the secret allows it", () => {
    const input: RequestInput = {
      method: "POST",
      url: "https://komodo.casa.lan/login",
      body: { secret: "{{komodo.secret}}" },
    }
    const writable = { ...komodo, allowWrite: true }

    expect(refusal(plan(input, [writable]))).toContain(
      "can't be used in the body"
    )
    expect(plan(input, [{ ...writable, allowInBody: true }]).ok).toBe(true)
  })

  test("refuses a placeholder in the URL unless the secret allows it", () => {
    const input: RequestInput = {
      method: "GET",
      url: "https://komodo.casa.lan/read?token={{komodo.key}}",
    }

    expect(refusal(plan(input))).toContain("can't be used in the URL")
    expect(
      rendered(plan(input, [{ ...komodo, allowInUrl: true }])).request.url
    ).toBe("https://komodo.casa.lan/read?token=komodo-key-value")
  })

  test("refuses a placeholder in the origin", () => {
    expect(
      refusal(plan({ method: "GET", url: "https://{{komodo.key}}/api" }))
    ).toContain("scheme, host or port")
  })

  test("refuses a request without any placeholder", () => {
    expect(
      refusal(plan({ method: "GET", url: "https://example.com" }))
    ).toContain("only sends requests that use one of your secrets")
  })

  test("refuses an unknown secret or field", () => {
    expect(
      refusal(
        plan({
          method: "GET",
          url: "https://komodo.casa.lan",
          headers: { A: "{{grafana.token}}" },
        })
      )
    ).toContain('no secret named "grafana"')
    expect(
      refusal(
        plan({
          method: "GET",
          url: "https://komodo.casa.lan",
          headers: { A: "{{komodo.token}}" },
        })
      )
    ).toContain('no field "token"')
  })

  test("refuses a secret that can't be decrypted", () => {
    const message = refusal(
      plan(
        {
          method: "GET",
          url: "https://komodo.casa.lan",
          headers: komodoHeaders,
        },
        [komodo],
        () => null
      )
    )
    expect(message).toContain("can't be decrypted")
    expect(message).toContain("/me/secrets")
  })

  test.each(["Host", "content-length", "Transfer-Encoding"])(
    "refuses the %p header",
    (name) => {
      expect(
        refusal(
          plan({
            method: "GET",
            url: "https://komodo.casa.lan",
            headers: { [name]: "intranet.casa.lan", A: "{{komodo.key}}" },
          })
        )
      ).toContain(name.toLowerCase())
    }
  )

  test("refuses a body on a GET", () => {
    expect(
      refusal(
        plan({
          method: "GET",
          url: "https://komodo.casa.lan",
          headers: komodoHeaders,
          body: "x",
        })
      )
    ).toContain("takes no body")
  })

  test("a malformed placeholder is refused, quoted", () => {
    expect(
      refusal(
        plan({
          method: "GET",
          url: "https://komodo.casa.lan",
          headers: { A: "{{komodo}}" },
        })
      )
    ).toContain("{{komodo}}")
  })

  test("a JSON body gets its string leaves substituted, templates kept, and a JSON content type", () => {
    const writable = { ...komodo, allowWrite: true, allowInBody: true }
    const { request } = rendered(
      plan(
        {
          method: "POST",
          url: "https://komodo.casa.lan/execute",
          body: {
            auth: { key: "{{komodo.key}}" },
            list: ["{{komodo.secret}}", 3],
            note: "{{ $labels.instance }}",
          },
        },
        [writable]
      )
    )

    expect(request.headers.get("content-type")).toBe("application/json")
    expect(JSON.parse(request.body ?? "")).toEqual({
      auth: { key: "komodo-key-value" },
      list: ["komodo-secret-value", 3],
      note: "{{ $labels.instance }}",
    })
  })

  test("lists each rendered placeholder for masking", () => {
    const { placeholders } = rendered(
      plan({
        method: "GET",
        url: "https://komodo.casa.lan",
        headers: komodoHeaders,
      })
    )

    expect(placeholders).toEqual([
      { label: "komodo.key", text: "komodo-key-value" },
      { label: "komodo.secret", text: "komodo-secret-value" },
    ])
  })
})

describe("loggedUrl", () => {
  test("drops the query and fragment and keeps placeholders as written", () => {
    expect(
      loggedUrl("https://komodo.casa.lan/read/stacks?token={{komodo.key}}")
    ).toBe("https://komodo.casa.lan/read/stacks")
    expect(loggedUrl("https://a.b/{{x.y}}#frag")).toBe("https://a.b/{{x.y}}")
  })
})
