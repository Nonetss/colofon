## Purpose

Defines how the frontend draws charts: one shared, themed chart foundation so every chart follows the app's palette, light and dark themes, typography and accessibility rules instead of each screen hand-building its own marks.

## ADDED Requirements

### Requirement: Single shared chart foundation

Every chart in the frontend SHALL be rendered through one shared chart primitive built on a single charting library. Feature code SHALL NOT draw chart marks by hand (styled `div`/`span` bars, ad-hoc SVG) nor bring in a second charting library.

#### Scenario: A feature needs a chart

- **WHEN** a feature adds a chart to a screen
- **THEN** it SHALL render it through the shared chart primitive, supplying data, marks and an accessible name, without importing another charting package

### Requirement: Charts follow the design tokens and the active theme

Charts SHALL take their categorical colors from the app's chart color tokens, which SHALL provide at least six distinct colors in both the light and the dark theme, and SHALL take their text, axis and grid colors and their typography from the surrounding surface. Switching between light and dark theme SHALL recolor every visible chart without reloading the page or rebuilding the chart.

#### Scenario: Categorical series use the chart tokens

- **WHEN** a chart colors its series or categories without an explicit paint
- **THEN** the first six categories SHALL use the chart color tokens in order, each a distinct color

#### Scenario: User switches theme with a chart on screen

- **WHEN** a user toggles between light and dark theme while a chart is visible
- **THEN** the chart's colors, text and gridlines SHALL switch to the new theme immediately, without a reload

#### Scenario: Status colors keep their meaning

- **WHEN** a chart encodes a semantic state (for example a failed run)
- **THEN** it SHALL use the same semantic token the rest of the UI uses for that state, in both themes

### Requirement: Charts are accessible

Every chart SHALL expose an accessible name that summarizes what it shows. Interactive charts SHALL be reachable with the keyboard, SHALL let the user move focus between data points with the arrow keys, and SHALL show the focused point's details in a tooltip that is also announced to assistive technology. Chart tooltips SHALL match the appearance of the app's other tooltips in both themes.

#### Scenario: Screen reader reaches a chart

- **WHEN** a screen-reader user reaches a chart
- **THEN** the chart SHALL be announced with its accessible name

#### Scenario: Keyboard user inspects a chart

- **WHEN** a keyboard user tabs into an interactive chart and presses the arrow keys
- **THEN** focus SHALL move between data points and a tooltip SHALL show the focused point's details

### Requirement: Charts fit their container

A chart SHALL take the width of its container and SHALL redraw at the new width when the container resizes, keeping a height chosen by the screen. A chart SHALL NOT cause horizontal page scroll at phone width.

#### Scenario: Container narrows

- **WHEN** the container of a chart becomes narrower (window resize, sidebar toggle or phone width)
- **THEN** the chart SHALL redraw to fit the new width without overflowing it
