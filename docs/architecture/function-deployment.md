# Function deployment

`.github/workflows/functions-deploy.yml` builds the isolated `functions` package
on Windows with the repository's Node 22 version. Pull requests affecting the
Function, shared contact modules, Node version, or workflow test the package but
cannot deploy. Deployment is manual: run **Blackburn Studio Function deployment**
from GitHub Actions with branch **main**. Merging does not deploy the Function.

The build uses `npm ci`, non-watch tests, typechecking and TypeScript compilation.
It stages only `dist`, `host.json`, `package.json` and `package-lock.json`, then
installs production dependencies in that staging directory. The ZIP contains
`host.json` at its root and includes the compiled shared contact modules.
Website files, local settings, tests and development dependencies are excluded.
The ZIP is the exact artifact passed to the deployment action; no remote build
is required. Windows packaging and Azure deployment require live CI validation.

## Deployment identity

Use a dedicated user-assigned managed identity, separate from
`func-blackburnstudio-api-uami`, which is the application's runtime identity.
Grant the deployment identity **Website Contributor** scoped to the Function
App resource only. Create a federated identity credential with:

- issuer: `https://token.actions.githubusercontent.com`
- subject: `repo:Mark-Blackburn/blackburnstudio-site:ref:refs/heads/main`
- audience: `api://AzureADTokenExchange`

Configure these GitHub repository Actions **variables** (identifiers, not secrets):

| Variable | Value |
| --- | --- |
| `AZURE_FUNCTIONS_DEPLOY_CLIENT_ID` | Dedicated deployment identity client ID |
| `AZURE_FUNCTIONS_DEPLOY_TENANT_ID` | `ae22e961-7b4e-471a-84e3-b0c5615853cc` |
| `AZURE_FUNCTIONS_DEPLOY_SUBSCRIPTION_ID` | `05c3168d-4b17-4a13-99db-69b66106a5a4` |

No GitHub environment is used: adding one changes the OIDC subject and requires
updating the federated credential. Keep main branch write access restricted to
trusted maintainers. The workflow grants OIDC token permission only to the deploy
job, and rejects manual runs on any branch other than main for deployment.

Leave the Azure Deployment Center wizard unsaved; it would add a second workflow
that builds the website root. This custom workflow uses OIDC without a publish
profile or basic deployment authentication.

## First deployment gates

Before running the deployment, check the Function App has its Node 22 runtime,
runtime identity, Table permissions, limiter settings and resolved Key Vault
reference configured as described in `contact-rate-limiter.md`. Do not copy
production email credentials merely to test deployment. Without configured email
transport the contact endpoint fails closed with 503 for otherwise valid requests.

After deployment, confirm the `contact` function is indexed and send an invalid
request to verify routing and validation without sending email. Then perform the
controlled live identity, shared-limiter and email tests in the limiter guide.
Deployment alone does not prove those integrations work. The browser contact
flow and existing Hybrid Static Web App are unchanged; do not link this API or
switch contact traffic until the separate static-export cutover is ready.
