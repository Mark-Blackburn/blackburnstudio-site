# Runtime tests

Unit tests beside the typed adapter validate protocol/lifecycle behavior. `publication.test.ts` exercises complete staging, verification failure, rollback, and stale-file removal. `smoke.mjs` performs focused browser qualification against the distributed Worker/MJS/WASM, including extreme numeric placements and hostile JPEG headers/entropy, using generated synthetic fixtures; no customer or benchmark PDF is stored here.
