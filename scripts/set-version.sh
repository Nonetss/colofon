#!/usr/bin/env bash
# Sets APP_VERSION in packages/api/src/shared/releases.ts to a release's
# version, so the running app names the GitHub release it was built from.
# The /tag command runs it before tagging.
#
# Usage: scripts/set-version.sh <version>   (0.5.0 or v0.5.0)
set -euo pipefail
cd "$(dirname "$0")/.."

version="${1:-}"
version="${version#v}"
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Usage: $0 <major.minor.patch>  (e.g. 0.5.0 or v0.5.0)" >&2
  exit 1
fi

constant=packages/api/src/shared/releases.ts
sed -i "s/^export const APP_VERSION = \"[^\"]*\"$/export const APP_VERSION = \"$version\"/" "$constant"
grep -q "^export const APP_VERSION = \"$version\"$" "$constant" || { echo "Could not set $constant" >&2; exit 1; }
echo "Version set to $version"
