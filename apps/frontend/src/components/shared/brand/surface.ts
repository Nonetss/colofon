import { cva } from "class-variance-authority"

/**
 * The quiet box every block in the product sits in (a table, a tile, a
 * card, a state placeholder): a hairline `rounded-xl` frame over the card
 * tint, flat at rest. `interactive` is the box that is itself a link, or
 * holds a stretched one: it firms its border and takes the muted fill on
 * hover or keyboard focus, never a lift or a shadow. Works on Astro
 * `class:list` and React `className` alike; layout stays at the call site.
 */
export const surfaceVariants = cva("rounded-xl border bg-card/40", {
  variants: {
    interactive: {
      false: "",
      true: "outline-none transition-colors duration-200 hover:border-foreground/15 hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 has-focus-visible:border-foreground/15 has-focus-visible:bg-muted/40",
    },
  },
  defaultVariants: {
    interactive: false,
  },
})
