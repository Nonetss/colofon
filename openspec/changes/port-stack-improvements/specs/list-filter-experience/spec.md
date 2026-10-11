## MODIFIED Requirements

### Requirement: Narrow viewports filter through an action bar and a bottom sheet

Below the medium breakpoint (768 px), a list page with filters SHALL NOT show the inline filter panel and SHALL instead show a fixed bottom action bar with a "Filtros" control that reads "Filtros · N" when N filters are active, plus the list's sort control when the page supplies one. The bar SHALL respect the device bottom safe area, SHALL slide out of view while the user scrolls down past the top 48 px (ignoring movements under 8 px) and SHALL slide back in while scrolling up or when back near the top. "Filtros" SHALL open a bottom sheet titled "Filtros" holding one labelled section per filter, a "Limpiar" action when the list can clear filters, and a confirm button. Categorical (facet) sections SHALL be edited as a draft that is applied only when the user confirms and discarded when the sheet is dismissed; the other filter kinds SHALL apply as the user edits them. At the medium breakpoint and above the page SHALL keep the inline panel and apply every change immediately. A page whose list filters from its table's column headers (`/crons`) has no filter panel, action bar or bottom sheet: its compact layout offers the same column filters above the rows.

#### Scenario: Opening the sheet from the action bar

- **WHEN** a user on a 390 px wide viewport with two active filters taps "Filtros · 2" on the activity log page
- **THEN** a bottom sheet titled "Filtros" SHALL open with a section per filter

#### Scenario: The confirm button shows the resulting count

- **WHEN** the sheet is open and the current filter combination matches 12 items
- **THEN** the confirm button SHALL read "Ver 12 resultados"
- **AND** it SHALL read "Ver 1 resultado" for one item, "Sin resultados" for zero items, and "Cargando…" while the count is not yet known

#### Scenario: A draft with no results can still be applied

- **WHEN** the draft facet selection matches no items
- **THEN** the confirm button SHALL read "Sin resultados" and pressing it SHALL apply the draft and close the sheet

#### Scenario: Dismissing discards the facet draft

- **WHEN** a user changes facet options in the sheet and closes it without confirming
- **THEN** the active facet filters SHALL be those that were active before opening it
- **AND** reopening the sheet SHALL show those live values

#### Scenario: Clearing from the sheet

- **WHEN** a user taps "Limpiar" in the sheet
- **THEN** every filter SHALL be cleared and the sheet SHALL close

#### Scenario: The bar hides while reading down

- **WHEN** a user scrolls a long list down past the top of the page
- **THEN** the action bar SHALL slide out below the viewport
- **AND** scrolling up SHALL bring it back

#### Scenario: Wide viewport keeps the inline panel

- **WHEN** the same page is shown at 1024 px wide
- **THEN** no action bar or sheet SHALL render and the collapsible inline filter panel SHALL be shown

#### Scenario: A table-filtered page has no action bar

- **WHEN** a user opens `/crons` on a 390 px wide viewport
- **THEN** the page SHALL NOT show the "Filtros" action bar, and SHALL offer the "Nombre", "Etiqueta" and "Estado" column filters above the rows

### Requirement: Active filters are shown as removable chips

A list page with any active filter SHALL show each active filter value as a chip above the list at every width, labelled "<dimension>: <value>" (an excluded facet option reads "<dimension>: no <value>" and is styled as destructive), together with a "Limpiar" action when the list can clear filters. Removing a chip SHALL remove only that value. When no filter is active no chip row SHALL render. A page whose list filters from its table's column headers (`/crons`) SHALL show no chip row: the highlighted filter icon of each filtered column and the empty-table message carry the active filters instead.

#### Scenario: Removing one chip

- **WHEN** role filter `admin` and search `ana` are active and the user removes the search chip
- **THEN** only the role filter SHALL remain active

#### Scenario: Clearing all filters

- **WHEN** the user activates the chips' "Limpiar"
- **THEN** every filter SHALL be removed and the chip row SHALL disappear

#### Scenario: Chip controls are accessible

- **WHEN** a chip is rendered
- **THEN** its remove control SHALL have the accessible name "Quitar filtro: <chip label>" and a touch target of at least 44 px

#### Scenario: A table-filtered page shows no chips

- **WHEN** the "Etiqueta" column of `/crons` keeps only "informes"
- **THEN** no chip row SHALL render, and the "Etiqueta" header's filter icon SHALL be highlighted
