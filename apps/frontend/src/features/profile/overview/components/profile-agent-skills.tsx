import { createHighlighter } from "@tanstack/highlight/core"
import { markdown } from "@tanstack/highlight/languages/markdown"
import { Text, textVariants } from "@/components/shared/brand/typography"
import { HighlightedTokens } from "@/components/shared/data-display/highlighted-tokens"
import { CopyButton } from "@/components/shared/form/copy-button"
import { KEY_PLACEHOLDER, skillsPrompt } from "@/features/api-keys/manage"
import { cn } from "@/lib/utils"

/** Only Markdown, the language the instructions are written in. */
const promptHighlighter = createHighlighter({ languages: [markdown] })

/**
 * The instructions a user pastes into their AI so it installs the site's
 * Agent Skills from `/.well-known/agent-skills/`, next to the keys it needs.
 */
export function ProfileAgentSkills() {
  const prompt = skillsPrompt(window.location.origin)

  return (
    <section className="flex flex-col gap-3" aria-labelledby="agent-skills">
      <div className="min-w-0">
        <Text as="h2" id="agent-skills" variant="label" tone="muted">
          Skills para tu IA
        </Text>
        <Text as="p" variant="compact" tone="muted" className="mt-1">
          La plataforma publica skills que enseñan a tu IA a trabajar con esta
          documentación: las de la plataforma y las de cada proyecto que puedes
          leer. Pásale este texto para que las instale, cambiando{" "}
          <Text as="span" variant="data">
            {KEY_PLACEHOLDER}
          </Text>{" "}
          por una de tus API keys.
        </Text>
      </div>
      <div className="flex items-start gap-2">
        <pre
          className={cn(
            textVariants({ role: "data" }),
            "max-h-56 min-w-0 flex-1 overflow-auto rounded-md border bg-muted/40 px-3 py-2.5 text-foreground/90 leading-relaxed whitespace-pre-wrap wrap-break-word"
          )}
        >
          <HighlightedTokens
            tokens={
              promptHighlighter.tokenize(prompt, { lang: "markdown" }).tokens
            }
          />
        </pre>
        <CopyButton
          text={prompt}
          label="Copiar las instrucciones de las skills"
          copiedLabel="Copiado"
          showSuccessToast
          onError="No se pudo copiar"
          size="icon"
          variant="outline"
          className="shrink-0"
        />
      </div>
    </section>
  )
}
