/**
 * A link set inside a line of product copy ("¿No tienes cuenta? Regístrate",
 * "Consulta la API en /scalar"): ink over a faint underline that firms up on
 * hover or focus, so it reads as a link without spending the accent, which
 * stays for here / act / alive. It inherits the size of the surrounding
 * `Text` role; links inside rendered Markdown keep their own style.
 */
export const inlineLinkClass =
  "font-medium text-foreground underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:decoration-foreground"
