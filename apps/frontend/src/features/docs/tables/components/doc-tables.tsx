import { useEffect, useState } from "react"
import { DocTable } from "@/features/docs/tables/components/doc-table"
import {
  type DomTable,
  prepareTables,
} from "@/features/docs/tables/model/table-dom"

// The tables of a documentation page, made interactive over the server's
// HTML. Each one is a TanStack table (`useDocTable`) whose rows are the
// server's `tr` elements, sorted, filtered and paged in place
// (`table-dom.ts`); the controls are React from the design system, rendered
// through portals into the slots `prepareTables` leaves. Mounted once per
// page in `doc-body.astro`.

/** Every table of the page's body, each with its own state and controls. */
export function DocTables() {
  const [tables, setTables] = useState<DomTable[]>([])
  useEffect(() => {
    setTables(prepareTables(document))
  }, [])
  return (
    <>
      {tables.map((dom) => (
        <DocTable key={dom.id} dom={dom} />
      ))}
    </>
  )
}
