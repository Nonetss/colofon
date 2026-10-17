import { createHighlighter } from "@tanstack/highlight/core"
import { markdown } from "@tanstack/highlight/languages/markdown"
import { Text, textVariants } from "@/components/shared/brand/typography"
import { HighlightedTokens } from "@/components/shared/data-display/highlighted-tokens"
import { CopyButton } from "@/components/shared/form/copy-button"
import { PageHero } from "@/components/shared/layout/page-hero"
import { KEY_PLACEHOLDER, skillsPrompt } from "@/features/api-keys/manage"
import { cn } from "@/lib/utils"

/** Only Markdown, the language the instructions are written in. */
const promptHighlighter = createHighlighter({ languages: [markdown] })

/**
 * The instructions a user pastes into their AI so it installs the site's
 * Agent Skills from `/.well-known/agent-skills/`, next to the keys it needs.
 */
export function ProfileAgentSkillsContent() {
  const prompt = skillsPrompt(window.location.origin)

  return (
    <div className="flex flex-col gap-6">
      <PageHero surface="profile-skills" />
      <div className="flex flex-col gap-3">
        <Text as="p" variant="compact" tone="muted">
          Pega este texto en tu IA y se configurará sola: instalará las skills
          que le enseñan a usar esta documentación, a escribirla y de qué trata
          cada proyecto que puedes leer, y conectará el MCP si se lo pides.
          Cambia{" "}
          <Text as="span" variant="data">
            {KEY_PLACEHOLDER}
          </Text>{" "}
          por una de tus API keys, o copia el texto con la clave ya puesta al
          crear una.
        </Text>
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
      </div>
    </div>
  )
}
