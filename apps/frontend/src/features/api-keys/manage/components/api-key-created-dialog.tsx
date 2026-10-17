import { getIcon } from "@/lib/icon-registry"

const ShieldAlert = getIcon("security", "warning")

import { createHighlighter } from "@tanstack/highlight/core"
import { json } from "@tanstack/highlight/languages/json"
import { markdown } from "@tanstack/highlight/languages/markdown"
import { plaintext } from "@tanstack/highlight/languages/plaintext"
import { shell } from "@tanstack/highlight/languages/shell"
import { toml } from "@tanstack/highlight/languages/toml"
import { Text, textVariants } from "@/components/shared/brand/typography"
import { HighlightedTokens } from "@/components/shared/data-display/highlighted-tokens"
import { CopyButton } from "@/components/shared/form/copy-button"
import { FormField } from "@/components/shared/form/field-label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  type AgentSetup,
  agentSetups,
} from "@/features/api-keys/manage/model/agent-setups"
import { cn } from "@/lib/utils"

export type ApiKeyCreatedDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fullKey: string | null
}

export function ApiKeyCreatedDialog({
  open,
  onOpenChange,
  fullKey,
}: ApiKeyCreatedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="gap-1.5 border-b px-6 py-5 text-left">
          <DialogTitle className={textVariants({ role: "display" })}>
            API key creada
          </DialogTitle>
          <DialogDescription
            className={cn(textVariants({ role: "compact" }), "leading-relaxed")}
          >
            Copia la clave ahora, no podrás volver a verla.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {fullKey ? (
            <FormField label="Clave" htmlFor="api-key-value">
              <div className="flex items-stretch gap-2">
                <Input
                  id="api-key-value"
                  readOnly
                  value={fullKey}
                  className={cn(
                    textVariants({ role: "data" }),
                    "h-auto min-w-0 flex-1 select-all break-all py-2.5 leading-relaxed"
                  )}
                />
                <CopyButton
                  text={fullKey}
                  label="Copiar clave"
                  copiedLabel="Copiada"
                  showSuccessToast
                  onError="No se pudo copiar la clave"
                  size="icon"
                  variant="outline"
                  className="shrink-0"
                />
              </div>
            </FormField>
          ) : null}

          {fullKey ? (
            <FormField label="Conecta tu IA">
              <AgentSetupTabs
                setups={agentSetups(window.location.origin, fullKey)}
              />
            </FormField>
          ) : null}

          <Text
            as="div"
            variant="compact"
            tone="muted"
            className="flex items-start gap-2 border-t pt-4 leading-relaxed"
            role="note"
          >
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Por seguridad, esta clave no se volverá a mostrar. Guárdala en un
              lugar seguro.
            </p>
          </Text>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Only the languages the setups are written in. */
const setupHighlighter = createHighlighter({
  languages: [markdown, shell, toml, json, plaintext],
})

/** One tab per agent client, each with its text to copy and where it goes. */
function AgentSetupTabs({ setups }: { setups: AgentSetup[] }) {
  return (
    <Tabs defaultValue={setups[0]?.id}>
      <TabsList variant="line" className="w-full justify-start">
        {setups.map((setup) => (
          <TabsTrigger key={setup.id} value={setup.id} className="flex-none">
            {setup.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {setups.map((setup) => (
        <TabsContent key={setup.id} value={setup.id} className="space-y-2">
          <div className="flex items-start gap-2">
            <pre
              id={`api-key-setup-${setup.id}`}
              className={cn(
                textVariants({ role: "data" }),
                "max-h-48 min-w-0 flex-1 overflow-auto rounded-md border bg-muted/40 px-3 py-2.5 text-foreground/90 leading-relaxed whitespace-pre-wrap break-all"
              )}
            >
              <HighlightedTokens
                tokens={
                  setupHighlighter.tokenize(setup.text, {
                    lang: setup.language,
                  }).tokens
                }
              />
            </pre>
            <CopyButton
              text={setup.text}
              label={`Copiar para ${setup.label}`}
              copiedLabel="Copiado"
              showSuccessToast
              onError="No se pudo copiar"
              size="icon"
              variant="outline"
              className="shrink-0"
            />
          </div>
          <Text as="p" variant="meta" tone="muted">
            {setup.hint}
          </Text>
        </TabsContent>
      ))}
    </Tabs>
  )
}
