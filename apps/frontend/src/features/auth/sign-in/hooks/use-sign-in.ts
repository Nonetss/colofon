import { type SyntheticEvent, useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"
import { navigate } from "@/lib/navigate"

/** Credential state + submit lifecycle for the sign-in form. */
export function useSignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [oidcLoading, setOidcLoading] = useState(false)

  // A successful SSO start leaves the page for the issuer with the button
  // still loading; coming back with the browser's back button restores this
  // page from the back/forward cache in that state, so reset it.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) setOidcLoading(false)
    }
    window.addEventListener("pageshow", onPageShow)
    return () => window.removeEventListener("pageshow", onPageShow)
  }, [])

  async function signInWithOidc() {
    setError("")
    setOidcLoading(true)

    try {
      await authClient.signIn.social(
        { provider: "oidc", callbackURL: "/" },
        {
          onError: (ctx) => {
            setError(
              ctx.error.message ||
                "No hemos podido iniciar sesión con SSO. Inténtalo de nuevo."
            )
            setOidcLoading(false)
          },
        }
      )
    } catch {
      setError(
        "No se pudo iniciar sesión con SSO. Comprueba tu conexión e inténtalo de nuevo."
      )
      setOidcLoading(false)
    }
  }

  async function submit(e: SyntheticEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await authClient.signIn.email(
        { email, password },
        {
          onSuccess: () => {
            navigate("/")
          },
          onError: (ctx) => {
            setError(
              ctx.error.message ||
                "No hemos podido iniciar sesión. Revisa tu email y tu contraseña."
            )
          },
        }
      )
    } catch {
      setError(
        "No se pudo iniciar sesión. Comprueba tu conexión e inténtalo de nuevo."
      )
    } finally {
      setLoading(false)
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    loading,
    submit,
    oidcLoading,
    signInWithOidc,
  }
}
