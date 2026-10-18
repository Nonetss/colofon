// What the browser may import from this slice: the navigation and scope
// models, without the server-rendered card or the icon loader.
export { isMissing } from "@/features/docs/shared/model/missing"
export {
  type CardBlock,
  cardBlocks,
  currentHref,
  type DocsNav,
  type DocsNavGroup,
  type DocsNavLink,
  type DocsNavNode,
  type DocsRepository,
  pagesMeta,
  sectionsAbove,
} from "@/features/docs/shared/model/nav"
export {
  ALL_SCOPE,
  DOCS_SCOPE_COOKIE,
  type DocsScope,
  inScope,
  readScopeCookie,
  resolveScope,
  SCOPE_COOKIE_MAX_AGE,
  scopeAfterVisit,
  scopeCookie,
  scopeToStore,
  scopeValue,
} from "@/features/docs/shared/model/scope"
