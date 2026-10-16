import type { Entity } from "#contract/catalog"
import { CATALOG_PATH } from "#contract/load"

// The page paths of the generated catalog pages: `catalogo`, then
// `catalogo/<type>` for each type and `catalogo/<type>/<id>` for each entity.

/** The page path of a catalog type's generated page. */
export function catalogTypePath(typeId: string): string {
  return `${CATALOG_PATH}/${typeId}`
}

/** The page path of an entity's generated page. */
export function entityPath(typeId: string, id: string): string {
  return `${catalogTypePath(typeId)}/${id}`
}

/**
 * Where an entity links: its page (the first `ficha` field set) or, when it
 * has none, its generated catalog page.
 */
export function entityPagePath(entity: Entity): string {
  if (entity.page !== null) return entity.page
  return entityPath(entity.type, entity.id)
}

/** Whether a page path is one of the generated catalog pages. */
export function isCatalogPath(pagePath: string): boolean {
  return pagePath === CATALOG_PATH || pagePath.startsWith(`${CATALOG_PATH}/`)
}
