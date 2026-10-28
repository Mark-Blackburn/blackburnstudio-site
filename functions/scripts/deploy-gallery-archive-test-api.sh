#!/usr/bin/env bash
# Deploy only the isolated test API. No production target is accepted.
set -euo pipefail
[[ $(node -p 'process.versions.node.split(".")[0]') == 22 ]] || { echo 'Use Node 22'; exit 1; }
az account set --subscription 05c3168d-4b17-4a13-99db-69b66106a5a4
cd "$(dirname "${BASH_SOURCE[0]}")/.."
npm ci
npm run build
ARCHIVE_PACKAGE_DIR=$(mktemp -d)
ARCHIVE_PACKAGE_ZIP=$(mktemp --suffix=.zip)
cp -R dist "$ARCHIVE_PACKAGE_DIR/dist"
cp host.json package.json package-lock.json "$ARCHIVE_PACKAGE_DIR/"
(cd "$ARCHIVE_PACKAGE_DIR" && npm ci --omit=dev)
python3 - "$ARCHIVE_PACKAGE_DIR" "$ARCHIVE_PACKAGE_ZIP" <<'PY'
import pathlib,sys,zipfile
root=pathlib.Path(sys.argv[1])
assert (root/'host.json').is_file()
assert (root/'dist/functions/src/index.js').is_file()
assert not (root/'local.settings.json').exists()
with zipfile.ZipFile(sys.argv[2],'w',compression=zipfile.ZIP_DEFLATED) as archive:
 for file in sorted(root.rglob('*')):
  if file.is_file(): archive.write(file,file.relative_to(root).as_posix())
print('Built isolated Function runtime package.')
PY
node scripts/gallery-archive-azure-test.cjs deploy-api "$ARCHIVE_PACKAGE_ZIP"
echo 'Deployment complete. Next run the helper with http-test to verify real HTTP delivery.'
