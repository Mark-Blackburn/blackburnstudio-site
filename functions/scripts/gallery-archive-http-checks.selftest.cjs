// Offline verification of the Azure HTTP trial's assertions. No Azure access.
const assert = require('node:assert/strict');
const { checkHttpTrial } = require('./gallery-archive-azure-test.cjs');

async function scenario(fault) {
  const bytes = Buffer.from('0123456789abcdef'.repeat(32));
  let revoked = false;
  let mutations = 0;
  const headers = { 'Cache-Control': 'no-store' };
  const reply = (body, status, extra = {}) => new Response(body, { status, headers: { ...headers, ...extra } });
  const run = () => checkHttpTrial({
    archiveBytes: bytes.length, expected: [], jobPath: '/api/galleries/g_fixture/archives/z_fixture',
    selection: { variant: 'full', assetIds: ['a_fixture'], assetListRevision: 'a_fixture' },
    verify: () => {},
    revoke: async () => { mutations++; if (fault !== 'revocation') revoked = true; },
    request: async (path, options = {}) => {
      if (options.authenticated === false || options.tampered || revoked) {
        if (fault !== 'authentication' || revoked) return reply('{}', 404);
      }
      if (options.method === 'POST') return reply('{}', options.badOrigin ? 403 : 400);
      if (!path.endsWith('/download')) return reply(JSON.stringify({ status: 'ready' }), 200);
      const extra = { 'Content-Type': 'application/zip', 'Content-Length': String(bytes.length),
        'Content-Disposition': 'attachment; filename="gallery.zip"' };
      if (options.method === 'HEAD') return reply(null, 200, extra);
      const range = options.headers?.Range;
      if (range && fault !== 'ignored-range') {
        const [, left, right] = /^bytes=(\d*)-(\d*)$/.exec(range);
        const start = left ? Number(left) : bytes.length - Number(right);
        const end = left ? (right ? Number(right) : bytes.length - 1) : bytes.length - 1;
        if (start >= bytes.length) return reply(null, 416, { 'Content-Range': `bytes */${bytes.length}` });
        return reply(bytes.subarray(start, end + 1), 206, { ...extra,
          'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${bytes.length}` });
      }
      const body = Buffer.from(bytes);
      if (fault === 'corrupted-resume') body[0] ^= 255;
      return reply(body, 200, extra);
    },
  });
  if (fault) {
    await assert.rejects(run, assert.AssertionError);
    if (fault !== 'revocation') assert.equal(mutations, 0, 'Failed protocol must not revoke the fixture');
  } else {
    await run();
    assert.equal(mutations, 1);
  }
}

(async () => {
  const log = console.log;
  console.log = () => {};
  try {
    await scenario();
    for (const fault of ['authentication', 'ignored-range', 'corrupted-resume', 'revocation']) await scenario(fault);
  } finally { console.log = log; }
  console.log('PASS: HTTP trial accepts valid delivery and rejects auth leaks, ignored ranges, corruption and failed revocation');
})().catch(error => { console.error(error); process.exitCode = 1; });
