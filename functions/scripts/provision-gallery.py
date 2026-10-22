"""Prepare gallery resources through the operator's Azure CLI session.

Explicit --apply is required. Does not enable gallery routes or deploy code.
Never prints a secret, storage key, bearer link or app-setting values.
"""
import argparse
import json
import re
import secrets
import subprocess
import tempfile
from pathlib import Path

SUBSCRIPTION = "05c3168d-4b17-4a13-99db-69b66106a5a4"
GROUP = "rg-markblackburn-web"
ACCOUNT = "stblackburnstudiodata"
VAULT = "kv-blackburnstudio01"
BASE = f"/subscriptions/{SUBSCRIPTION}/resourceGroups/{GROUP}"
STORAGE = BASE + f"/providers/Microsoft.Storage/storageAccounts/{ACCOUNT}"
TABLE = STORAGE + "/tableServices/default/tables/ClientGalleries"
CONTAINER = STORAGE + "/blobServices/default/containers/client-galleries"


def az(*args):
    result = subprocess.run(
        ["az", *args, "--subscription", SUBSCRIPTION, "--only-show-errors"],
        text=True, capture_output=True, check=True, timeout=180,
    )
    return json.loads(result.stdout) if result.stdout.strip() else None


def grant(principal, kind, role, scope):
    existing = az("role", "assignment", "list", "--scope", scope, "--output", "json")
    if any(r.get("principalId") == principal and r.get("roleDefinitionName") == role for r in existing):
        return
    az("role", "assignment", "create", "--assignee-object-id", principal,
       "--assignee-principal-type", kind, "--role", role, "--scope", scope, "--output", "none")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--operator-object-id", required=True)
    args = parser.parse_args()
    if not re.fullmatch(r"[a-fA-F0-9-]{36}", args.operator_object_id):
        raise ValueError("Invalid operator identity")
    if not args.apply:
        print("Plan: private gallery container, gallery table, scoped runtime/operator roles, dedicated key and settings. Add --apply to execute.")
        return
    principal = az("identity", "show", "--resource-group", GROUP,
                   "--name", "func-blackburnstudio-api-uami", "--query", "principalId", "--output", "json")
    az("rest", "--method", "put", "--url", f"https://management.azure.com{TABLE}?api-version=2025-06-01",
       "--body", '{"properties":{}}', "--output", "none")
    az("rest", "--method", "put", "--url", f"https://management.azure.com{CONTAINER}?api-version=2025-06-01",
       "--body", '{"properties":{"publicAccess":"None"}}', "--output", "none")
    grant(principal, "ServicePrincipal", "Storage Table Data Contributor", TABLE)
    grant(principal, "ServicePrincipal", "Storage Blob Data Reader", CONTAINER)
    grant(args.operator_object_id, "User", "Storage Table Data Contributor", TABLE)
    grant(args.operator_object_id, "User", "Storage Blob Data Contributor", CONTAINER)

    try:
        # Captured only in memory. Validate an existing key; never rotate it here.
        value = az("keyvault", "secret", "show", "--vault-name", VAULT,
                   "--name", "gallery-access-hmac-key", "--query", "value", "--output", "json")
        if not isinstance(value, str) or not re.fullmatch(r"[a-fA-F0-9]{64}", value):
            raise ValueError("Existing gallery key is invalid; no rotation performed")
    except subprocess.CalledProcessError as error:
        if "SecretNotFound" not in error.stderr:
            raise
        with tempfile.TemporaryDirectory(prefix="bbs-gallery-key-") as directory:
            key_file = Path(directory) / "key"
            key_file.write_text(secrets.token_hex(32))
            key_file.chmod(0o600)
            az("keyvault", "secret", "set", "--vault-name", VAULT,
               "--name", "gallery-access-hmac-key", "--file", str(key_file),
               "--encoding", "utf-8", "--output", "none")

    az("functionapp", "config", "appsettings", "set", "--resource-group", GROUP,
       "--name", "func-blackburnstudio-api", "--settings",
       f"GALLERY_TABLE_ENDPOINT=https://{ACCOUNT}.table.core.windows.net",
       "GALLERY_TABLE_NAME=ClientGalleries", "GALLERY_PUBLIC_ORIGIN=https://www.theblackburn.studio",
       f"GALLERY_BLOB_ENDPOINT=https://{ACCOUNT}.blob.core.windows.net", "GALLERY_BLOB_CONTAINER=client-galleries",
       f"GALLERY_ACCESS_HMAC_KEY=@Microsoft.KeyVault(SecretUri=https://{VAULT}.vault.azure.net/secrets/gallery-access-hmac-key)",
       "--output", "none")
    print("Gallery storage, scoped roles and configuration prepared. Existing keys preserved. Gallery enablement unchanged.")
    print("After deploying the Function package, enable gallery API and delivery as described in client-gallery-delivery.md.")


if __name__ == "__main__":
    try:
        main()
    except (subprocess.SubprocessError, ValueError, OSError):
        raise SystemExit("Gallery provisioning stopped. Check Azure permissions/configuration; no secret or CLI error details printed. Successful earlier steps may remain; rerun after correcting the issue.")
