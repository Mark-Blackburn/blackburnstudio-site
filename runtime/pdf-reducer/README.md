# Blackburn Studio PDF Reducer Runtime

This directory owns the browser-local PDF Reducer 1.0.0 runtime foundation. Blackburn builds qpdf itself so the exact upstream version, compiler, memory policy, command surface, image policy, and same-origin assets are auditable and reproducible. The public experience is available at `/tools/pdf-reducer` and `/tools/pdf-reducer/app`; the UI consumes this qualified runtime without duplicating its processing logic.

## Modes

- `optimize`: generates object streams, recompresses Flate streams at compression level 9, and performs no deliberate lossy image work.
- `reduce-images`: applies the qualified 200 DPI, JPEG quality 75 effective-DPI policy and area-box resampler, then performs the same structural output pass.

The runtime accepts only these two modes. It does not accept arbitrary qpdf arguments, DPI, JPEG quality, or resampler controls.

## Qualified image subset

Image mutation is limited to indirect Image XObjects with a sole `/DCTDecode` filter, 8-bit `/DeviceRGB`, positive dimensions, and no `/Decode`, `/DecodeParms`, `/SMask`, `/Mask`, or `/ImageMask`. Placement analysis preserves inherited resources, `q`/`Q` graphics state, `cm`, `Do`, nested Form resources and matrices, cycle detection, a recursion limit of 16, `UserUnit`, indirect identity, and shared-image maximum placement requirements.

DeviceGray, DeviceCMYK, ICCBased, Indexed, JPX/JPEG2000, JBIG2, CCITT, inline images, masks, and ambiguous images are intentionally left unchanged. Candidates are replaced only when the final JPEG is strictly smaller.

## Limits

- Optimize source: 25 MiB.
- Reduce images source: 15 MiB.
- Image width and height: at most 6000 each.
- Image pixels: at most 24,000,000.
- Decoded image RGB: at most 72,000,000 bytes.

Source caps are enforced in the typed adapter before Worker creation and again in the Worker. Image guards run before JPEG decode and allocation.

Effective-DPI targets must remain finite, positive, and representable as an integer; one unsafe placement leaves the entire shared image unchanged. JPEG header dimensions and component count must match the PDF dictionary and pass the same image limits before decompression starts. A narrow C-style libjpeg recovery boundary converts fatal decode errors or corruption warnings into an unchanged image without unwinding across C++ objects.

## Browser architecture and privacy

Each operation gets a fresh module Worker. The input and output `ArrayBuffer` values are transferred, not cloned; MEMFS necessarily copies between browser and WASM memory. Cancellation terminates the Worker. A subsequent operation creates a fresh Worker, and stale responses are ignored. The public UI creates the runtime only after the user deliberately starts processing, so the Worker and WASM are not fetched by the landing page or an idle app page.

No PDF bytes, filenames, text, metadata, or diagnostics leave the browser. Native diagnostics are not exposed as user messages. Runtime MJS/WASM fetching is same-origin from `/runtime/pdf-reducer/1.0.0/` and occurs only after a future consumer imports and invokes the adapter.

## Acceptance and errors

The native runtime writes output, reopens it through a fresh `QPDFJob`, runs the qpdf `--check` path, and accepts only exact exit status 0. Warning or malformed output is deleted and reported as `VALIDATION_FAILED`. Result metadata includes input/output byte counts so a consumer can recommend the original whenever output is not smaller.

Encrypted and password-protected PDFs are rejected. No password is accepted or retained.

> **DO NOT ENABLE PDF ENCRYPTION WITH THIS RUNTIME.** The qualified qpdf WASM configuration uses insecure fallback randomness because browser OS randomness was unavailable to that build. This is acceptable only while V1 rejects encrypted input and never creates encryption. Encryption or other cryptographic output features require browser-backed cryptographically secure randomness and requalification first.

## Source qualification boundary

The exact qualified prototype was recovered at SHA-256 `0adb605ea18bef3cc0f71b4d2c989c4ed1e28307346c0804d94113817c7daf5a`. Its traversal, eligibility, guards, area-box implementation, JPEG settings, replacement policy, and structural writer are preserved. Production changes constrain the entrypoint to two modes, add encrypted-input rejection, safe typed status output, and independent qpdf output validation. Because these entrypoint changes alter MJS/WASM hashes, the distributed build receives focused runtime smoke requalification.

See [BUILD.md](BUILD.md) for rebuilding and verification. Distributed dependency terms are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
