# PDF Reducer 1.0.0 Build Provenance

## Pinned inputs

| Input | Pin |
| --- | --- |
| qpdf | 12.4.1, tag `v12.4.1`, commit `c37f83ae468abb6cc741f43b2f6fdeb66e550ffb` |
| qpdf release archive SHA-256 | `f045aa277be2356ff53a89a8622945958291177d2483afc20ede7c8a8cd3873c` |
| zlib | 1.3.1, commit `51b7f2abdade71cd9bb0e7a373ef2610ec6f9daf` |
| libjpeg-turbo | 3.0.4, commit `f29eda648547b36aa594c4116c7764a6c8a079b9` |
| Emscripten | 4.0.17, `emscripten/emsdk:4.0.17` |
| Linux AMD64 image digest | `sha256:a424cb920e13a48547f71a87b992018d161e7415db984c88bcb99f9efa5e4e7e` |

The build downloads upstream source only inside Docker, verifies the qpdf archive hash, fetches the exact zlib/libjpeg commits, and statically links them. Upstream qpdf is unmodified. `runtime/pdf-reducer/src/blackburn_pdf_reducer.cpp` and the Worker are Blackburn-owned.

## Build

From the repository root with Docker available:

    npm run build:pdf-reducer

The wrapper forces two clean compiler layers, compares every distributed artifact byte-for-byte, and refuses publication on any difference. Successful output is staged at `public/runtime/pdf-reducer/1.0.0/` with a deterministic manifest. No developer-machine C/C++ libraries are used.

Publication copies and verifies the complete distribution in a sibling staging directory before moving the existing version. If activation fails, the previous known-good version is restored; stale files are not carried into a successful publication.

## Qualified compiler and memory flags

The final link uses C++17 and `-Oz -flto -fexceptions`, ES module modularization, `callMain` and `FS`, filesystem support, and enabled exception catching. Memory remains:

- `INITIAL_MEMORY=67108864` (64 MiB)
- `ALLOW_MEMORY_GROWTH=1`
- `MAXIMUM_MEMORY=536870912` (512 MiB)

qpdf, zlib, and libjpeg-turbo are static. Reduce Images uses libjpeg-turbo RGB output, JPEG quality 75, 4:2:0 sampling, optimized Huffman coding, and one final encode after area-box resize.

## Outputs

- `pdf-reducer-worker.mjs`
- `pdf-reducer.mjs`
- `pdf-reducer.wasm`
- `runtime-manifest.json`
- `THIRD_PARTY_NOTICES.md`

Verify a checked-in build without rebuilding:

    npm run verify:pdf-reducer

Verification recomputes SHA-256 and byte sizes and checks deterministic manifest formatting. The manifest does not contain timestamps or machine paths.

## Reproducibility expectation

MJS, WASM, Worker, and notices must be byte-identical across both clean builds. The production MJS/WASM hashes are expected to differ from the qualified prototype because the production entrypoint adds fixed modes, encrypted-input rejection, safe statuses, and an independent qpdf check. Algorithm policy changes are not permitted without requalification.

## Security boundary

> **DO NOT ENABLE PDF ENCRYPTION WITH THIS RUNTIME.**

The qualified qpdf configuration uses `SKIP_OS_SECURE_RANDOM=ON` and `USE_INSECURE_RANDOM=ON`. V1 rejects encrypted/password-protected inputs and never creates encryption. Any future encryption, password writing, secure ID, or cryptographic operation requiring randomness must first use browser-backed cryptographically secure randomness and be requalified.
