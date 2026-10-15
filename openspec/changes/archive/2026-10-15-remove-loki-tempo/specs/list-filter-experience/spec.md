## MODIFIED Requirements

### Requirement: Narrow viewports filter through an action bar and a bottom sheet

Below the medium breakpoint (768 px), a list page with filters SHALL NOT show the inline filter panel and SHALL instead show a fixed bottom action bar with a "Filtros" control that reads "Filtros · N" when N filters are active, plus the list's sort control when the page supplies one. The bar SHALL respect the device bottom safe area, SHALL slide out of view while the user scrolls down past the top 48 px (ignoring movements under 8 px) and SHALL slide back in while scrolling up or when back near the top. "Filtros" SHALL open a bottom sheet titled "Filtros" holding one labelled section per filter, a "Limpiar" action when the list can clear filters, and a confirm button. Categorical (facet) sections SHALL be edited as a draft that is applied only when the user confirms and discarded when the sheet is dismissed; the other filter kinds SHALL apply as the user edits them. At the medium breakpoint and above the page SHALL keep the inline panel and apply every change immediately. The admin lists that filter from their table's column headers (`/admin/users`, `/admin/sessions`) SHALL use the same action bar and sheet below the medium breakpoint, the sheet holding the page's own filters, when it has any, followed by one button per filtered column, every change applying as it is made. Their ordering SHALL move to the bar as well: an "Ordenar" button beside "Filtros" SHALL open a bottom sheet titled "Ordenar" listing the sortable columns and the two directions ("Ascendente", "Descendente", unavailable until a column is picked), each pick applying at once. The page content SHALL keep clear of the bar instead of running under it. Other pages whose list filters from its table's column headers (`/crons`) have no filter panel, action bar or bottom sheet: their compact layout offers the same column filters above the rows.

#### Scenario: Opening the sheet from the action bar

- **WHEN** a user on a 390 px wide viewport with two active filters taps "Filtros · 2" on a list page
- **THEN** a bottom sheet titled "Filtros" SHALL open with a section per filter

#### Scenario: The confirm button shows the resulting count

- **WHEN** the sheet is open and the current filter combination matches 12 items
- **THEN** the confirm button SHALL read "Ver 12 resultados"
- **AND** it SHALL read "Ver 1 resultado" for one item, "Sin resultados" for zero items, "Cargando…" while the count is not yet known, and "Ver resultados" on a list that can't count its results

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

#### Scenario: An admin table-filtered page filters through the action bar

- **WHEN** an administrator opens `/admin/users` on a 390 px wide viewport
- **THEN** the page SHALL show the "Filtros" action bar instead of the column filters above the rows, and its sheet SHALL offer those column filters

#### Scenario: A table-filtered page has no action bar

- **WHEN** a user opens `/crons` on a 390 px wide viewport
- **THEN** the page SHALL NOT show the "Filtros" action bar, and SHALL offer the "Nombre", "Etiqueta" and "Estado" column filters above the rows
