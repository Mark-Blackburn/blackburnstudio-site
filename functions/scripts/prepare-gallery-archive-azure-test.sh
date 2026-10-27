#!/usr/bin/env bash
# Run from this repository under Node 22. Never starts an execution.
set -euo pipefail

ARCHIVE_SUBSCRIPTION=05c3168d-4b17-4a13-99db-69b66106a5a4
ARCHIVE_GROUP=rg-blackburn-archive-test
ARCHIVE_ACCOUNT=stbsarchtest05c3168d

[[ $(node -p 'process.versions.node.split(".")[0]') == 22 ]] || {
  echo 'Run with: npm exec --yes --package=node@22 -- bash functions/scripts/prepare-gallery-archive-azure-test.sh'
  exit 1
}
command -v az >/dev/null
command -v python3 >/dev/null
az account set --subscription "$ARCHIVE_SUBSCRIPTION"

ARCHIVE_STORAGE_ID=$(az storage account show -g "$ARCHIVE_GROUP" -n "$ARCHIVE_ACCOUNT" --query id -o tsv)
ARCHIVE_OPERATOR=$(az ad signed-in-user show --query id -o tsv)
ARCHIVE_WORKER=$(az identity show -g "$ARCHIVE_GROUP" -n id-blackburn-archive-test --query principalId -o tsv)

for ARCHIVE_ROLE in 'Storage Blob Data Contributor' 'Storage Table Data Contributor'; do
  az role assignment create --assignee-object-id "$ARCHIVE_OPERATOR" --assignee-principal-type User \
    --role "$ARCHIVE_ROLE" --scope "$ARCHIVE_STORAGE_ID" --output none
done

cd "$(dirname "${BASH_SOURCE[0]}")/.."
npm ci
npm run build
node scripts/gallery-archive-azure-test.cjs seed

az role assignment create --assignee-object-id "$ARCHIVE_WORKER" --assignee-principal-type ServicePrincipal \
  --role 'Storage Blob Data Reader' \
  --scope "$ARCHIVE_STORAGE_ID/blobServices/default/containers/archive-test-images" --output none
az role assignment create --assignee-object-id "$ARCHIVE_WORKER" --assignee-principal-type ServicePrincipal \
  --role 'Storage Blob Data Contributor' \
  --scope "$ARCHIVE_STORAGE_ID/blobServices/default/containers/archive-test-zips" --output none
az role assignment create --assignee-object-id "$ARCHIVE_WORKER" --assignee-principal-type ServicePrincipal \
  --role 'Storage Table Data Contributor' --scope "$ARCHIVE_STORAGE_ID" --output none

node scripts/gallery-archive-azure-test.cjs configure
node scripts/gallery-archive-azure-test.cjs status
echo 'Preparation complete. No execution started. Ready for the three-photo worker trial.'
