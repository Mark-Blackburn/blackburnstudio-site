# Contact retention live validation — 22 October 2026

## Deployed revision

Function deployment [39678731121](https://github.com/Mark-Blackburn/blackburnstudio-site/actions/runs/39678731121)
deployed merge commit `3f8f6bd5b4e8d9fea3253419c9246231685c6dd5` (PR #40).
The operator ran the validation from Azure Cloud Shell using a checkout of that
exact commit, its locked Functions dependencies and Node 22.23.2. Results below
are operator-provided command output and Application Insights screenshots.

## Isolated Azure Table results

A temporary table, `ContactRetentionValidation20261022`, was created in
`stblackburnstudiodata`. The operator's signed-in user received temporary
Storage Table Data Contributor access scoped only to that table. Production
runtime permissions were not changed.

The compiled `retainContactRateLimits` function used a real TableClient and
AzureCliCredential. A clock advanced by 25 hours was passed only to this isolated
test invocation; the production clock and timer were unchanged. Four fixture
rows represented an expired row, an expired candidate updated before deletion,
an active attempt relative to the test clock, and malformed timestamp JSON.

- Dry-run: four scanned, two eligible, none deleted, two skipped.
- Delete: four scanned, two eligible, one deleted, one conflict, two skipped,
  with `limitReached: false`.
- The test updated the concurrent candidate after enumeration and before its
  conditional delete. The cleanup recorded the ETag conflict and a subsequent
  read confirmed the updated attempts remained.
- The unchanged expired row was absent; active and malformed rows remained.

The temporary role assignment was removed. After RBAC propagation, table reads
were denied. The actual compiled retention handler then rejected with
`Contact rate-limit retention failed`, and its captured application log contained
only `[contact-retention] Maintenance failed`. No SDK error details were logged.
The handler test did not assert the underlying HTTP status; the CLI separately
confirmed authorization denial.

After restoring the same table-scoped permission, reads returned all three
preserved rows. The handler completed in dry-run using the real clock, with all
counts zero, and a separate enumeration confirmed all three fixtures remained.
Finally, the restored temporary assignment and the entire temporary table were
deleted successfully.

## Contact-handler validation — 23 October follow-up

A separate temporary table, `ContactHandlerValidation20261023`, was used
with the same pinned revision and Node version. The compiled contact handler
used the real Azure Table adapter and CLI credential, with an injected fake
email sender. No real email was sent and production settings and runtime
permissions were unchanged.

- Missing or invalid limiter configuration returned generic 503 responses;
  the fake sender was not called.
- An admitted baseline request created one pseudonymous row with one attempt.
  An initial test assertion failed because SDK `getEntity` responses include
  `odata.metadata`. Excluding that response metadata corrected the temporary
  test assertion; no application code changed.
- After the operator's temporary table permission was removed and denial had
  propagated, the SDK returned 403. The actual contact handler returned its
  generic 503, did not call the sender, and logged only
  `[contact-api] Rate limiter failed`, without SDK error details.
- After restoring access, a freshly built recovery check returned 200 and
  called the fake sender once. The original row's timestamps and ETag were
  unchanged, and both enumerated rows contained only the expected pseudonymous
  identifiers, timestamps and service metadata.

Cloud Shell session replacement lost the original temporary script and test
HMAC secret. Recovery therefore used a fresh synthetic identity and HMAC key;
it did not demonstrate same-process cached-credential recovery. These checks
exercise the compiled handler against live storage, not denied access through
the deployed HTTP host. The restored temporary role assignment and table were
subsequently deleted successfully.

## Production observations

Trigger synchronization registered both `contact` and
`contactRateLimitRetention`. A scheduled dry-run completed at
2026-10-21 22:15 UTC (22 October 09:15 Melbourne), with all counters zero.
The operator then verified the saved retention mode was `delete`.

Screenshots confirmed successful delete-mode completions at 2026-10-22
04:15 and 05:15 UTC (15:15 and 16:15 Melbourne). Both had zero scanned,
eligible, deleted, conflicts and skipped records; neither reached the cap.
A later production trace at 2026-10-22 11:15:00.291 UTC (22:15 Melbourne)
recorded three scanned, three eligible and three deleted, with zero conflicts
or skips and `limitReached: false`. Subsequent visible hourly runs through
21:15 UTC returned zero counters without visible failures or review warnings.
This establishes actual scheduled production deletion. Preservation of active
attempts was demonstrated in the isolated test, not by those production traces.

An audit of the pinned Functions production dependencies using
`npm audit --omit=dev` reported zero vulnerabilities. The full install reported
four development-inclusive findings (two moderate and two high); those findings
have not been investigated or remediated in this validation.

## Monitoring configuration

The dedicated enabled action group `ag-blackburnstudio-operations` has a direct
email receiver at `hello@theblackburn.studio`, using the common alert schema.
The existing role-based Smart Detection group was left unchanged.

The enabled scheduled-query rule `alert-blackburnstudio-retention-health`
targets Application Insights `func-blackburnstudio-api`, has severity 2 and
evaluates every 15 minutes. Its query covers two hours (explicit query-time
override over a one-hour window). It returns a problem row if there are no
delete-mode completion messages, any maintenance failures, or any maintenance
review warnings. The latter covers skipped rows and scan-cap warnings.
The rule uses Count greater than zero, one failing evaluation and automatic
resolution.

A manual query returned two completions, zero failures, zero review warnings
and `NeedsAttention: false`. Azure accepted the alert rule. An action-group
Log Alert V2 sample email arrived in Outlook at 21:58 Melbourne on 22 October.
The operator also verified the saved production rule settings.

A temporary clone, `alert-blackburnstudio-retention-validation`, used severity 3
and five-minute evaluation. Its query appended a synthetic problem row to the
production health query; it did not disrupt contact or cleanup. The scheduled
rule fired at 2026-10-22 20:14:14 UTC (23 October 07:14:14 Melbourne), and its
email arrived. Restoring the clone's criteria from the production rule removed
the synthetic condition. The same alert automatically resolved at 20:45:12 UTC
(07:45:12 Melbourne), with a resolution email. The temporary rule was deleted.

This verifies real scheduled evaluation, notification and automatic resolution
using the temporary clone. The permanent health rule was unchanged and was not
deliberately triggered by a production failure.
The rule detects missing completion telemetry as well as missing cleanup runs;
a query-service outage is a separate monitoring failure mode.

## Remaining release evidence

- Inspect production stored data for the intended pseudonymous-only schema.
- Verify contact failure/rate-limit monitoring, ingress/abuse controls and cost
  controls, plus remaining static artifact and rollback gates in
  [the cutover guide](static-site-cutover.md).
- Investigate the development dependency audit findings.

These results do not complete all website cutover gates; cutover remains a
separate coordinated deployment step. No static runtime switch, SWA backend
linking, private gallery authentication or private asset delivery was performed
as part of these tests.
