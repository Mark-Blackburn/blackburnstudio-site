/* Disposable Azure worker trial. Never targets the production storage account. */
const assert = require('node:assert/strict');
const { randomBytes, createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { writeFileSync, mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { AzureCliCredential } = require('@azure/identity');
const { TableClient } = require('@azure/data-tables');
const { BlobServiceClient } = require('@azure/storage-blob');
const compiled = '../dist/functions/src/';
const { jpegDimensions } = require(compiled + 'azureGalleryAdmin');
const { validRecord, hashGalleryToken } = require(compiled + 'galleryAccess');
const { createArchiveJob } = require(compiled + 'galleryArchiveJobs');
const { validateArchiveSelection } = require(compiled + 'galleryArchiveSelection');
const { createAzureArchiveJobStore } = require(compiled + 'azureGalleryArchiveJobs');
const { galleryAssetListRevision } = require('../dist/lib/client-galleries/assetListRevision');

const SUBSCRIPTION = '05c3168d-4b17-4a13-99db-69b66106a5a4';
const GROUP = 'rg-blackburn-archive-test';
const ACCOUNT = 'stbsarchtest05c3168d';
const TABLE = 'ArchiveTrial';
const SOURCE = 'archive-test-images';
const OUTPUT = 'archive-test-zips';
const CONTROL = 'archive-test-control';
const JOB = 'job-blackburn-archive-test';
const COMMIT = '11e884965d3e4878b135ba827dd117158ec82899';
const FILES = ['families-seated-under-trees.jpg', 'families-blossom-family.jpg', 'families-father-child-moment.jpg'];
const MAX_FIXTURE_BYTES = 4 * 1024 * 1024;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// execFileSync arguments are never interpreted by a shell. Do not print args:
// the secret-setting command contains a disposable test HMAC key.
function az(args, json = false) {
  return execFileSync('az', [...args, '--subscription', SUBSCRIPTION,
    '--output', json ? 'json' : 'none'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function makeFixture(images) {
  assert.equal(images.length, 3);
  const secret = randomBytes(32).toString('hex');
  const galleryId = 'g_' + randomBytes(16).toString('base64url');
  const gallery = { id: galleryId, title: 'Disposable archive trial', clientDisplayName: 'Test only',
    message: 'Public sample photographs only', status: 'published', expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    accessTokenHash: hashGalleryToken(secret, galleryId, randomBytes(32).toString('base64url')),
    accessTokenVersion: 1, sessionVersion: 1 };
  assert.ok(validRecord(gallery, galleryId));
  const assets = images.map((bytes, index) => ({ galleryId, id: 'a_' + randomBytes(16).toString('base64url'),
    altText: 'Public trial photograph ' + (index + 1), ...jpegDimensions(bytes, MAX_FIXTURE_BYTES),
    displayOrder: index, webByteSize: bytes.length, fullByteSize: bytes.length }));
  const selection = validateArchiveSelection({ variant: 'full', assetIds: assets.map(a => a.id),
    assetListRevision: galleryAssetListRevision(assets) }, assets);
  const job = createArchiveJob(gallery, selection, Date.now());
  return { secret, gallery, assets, job, expected: images.map((bytes, index) => ({
    name: `photo-${String(index + 1).padStart(3, '0')}-full.jpg`, bytes: bytes.length, sha256: sha(bytes),
  })) };
}

function verifyZip(file, expected) {
  const python = `import hashlib,json,sys,zipfile
data=json.load(sys.stdin)
with zipfile.ZipFile(data['file']) as archive:
 assert archive.namelist()==[x['name'] for x in data['expected']], 'ZIP entry names/order differ'
 assert archive.testzip() is None, 'ZIP CRC failed'
 for item in data['expected']:
  body=archive.read(item['name'])
  assert len(body)==item['bytes'], 'JPEG length differs'
  assert hashlib.sha256(body).hexdigest()==item['sha256'], 'JPEG bytes differ'
print('PASS: 3 ZIP entries, numbering, CRC and exact JPEG bytes')
`;
  process.stdout.write(execFileSync('python3', ['-c', python], {
    input: JSON.stringify({ file, expected }), encoding: 'utf8',
  }));
}

async function publicImage(name) {
  const response = await fetch(`https://raw.githubusercontent.com/Mark-Blackburn/blackburnstudio-site/${COMMIT}/public/families/${name}`,
    { signal: AbortSignal.timeout(30000) });
  assert.ok(response.ok, 'Public sample download failed');
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.length;
    if (total > MAX_FIXTURE_BYTES) {
      await response.body.cancel().catch(() => {});
      throw new Error('Public fixture exceeds test limit');
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function main(action) {
  assert.ok(['seed', 'configure', 'status', 'verify', 'self-test'].includes(action),
    'Use seed, configure, status, verify or self-test');
  if (action === 'self-test') {
    const { readFileSync } = require('node:fs');
    const images = process.argv.slice(3).map(file => readFileSync(file));
    const state = makeFixture(images);
    await createAzureArchiveJobStore({ createEntity: async () => {} }).create(state.job);
    const { streamGalleryZip64 } = require(compiled + 'galleryZip64');
    async function* sources() {
      for (let i = 0; i < images.length; i++) yield { photoNumber: i + 1, variant: 'full',
        bytes: images[i].length, chunks: (async function* () { yield images[i]; })() };
    }
    const chunks = [];
    for await (const chunk of streamGalleryZip64(sources(), new AbortController().signal)) chunks.push(chunk);
    const file = join(mkdtempSync(join(tmpdir(), 'archive-trial-')), 'gallery.zip');
    writeFileSync(file, Buffer.concat(chunks));
    verifyZip(file, state.expected);
    console.log('PASS: fixture validation and durable job encoding');
    return;
  }
  // Only the fixed disposable account can be addressed by this helper.
  const credential = new AzureCliCredential();
  const blobs = new BlobServiceClient(`https://${ACCOUNT}.blob.core.windows.net`, credential);
  const table = new TableClient(`https://${ACCOUNT}.table.core.windows.net`, TABLE, credential);
  const jobs = createAzureArchiveJobStore(table);
  const control = blobs.getContainerClient(CONTROL).getBlockBlobClient('current.json');
  if (action === 'seed') {
    for (const name of [SOURCE, OUTPUT, CONTROL]) {
      const container = blobs.getContainerClient(name);
      await container.createIfNotExists();
      assert.ok(!(await container.getProperties()).blobPublicAccess, 'Test container must be private');
    }
    if (await control.exists()) {
      console.log('Trial already seeded; preserving the existing job and photographs.');
      return;
    }
    await table.createTable();
    const images = [];
    for (const name of FILES) images.push(await publicImage(name));
    const state = makeFixture(images);
    for (let i = 0; i < state.assets.length; i++) {
      const asset = state.assets[i];
      // Both variants intentionally use the public sample unchanged in this worker-only test.
      for (const variant of ['full', 'web']) await blobs.getContainerClient(SOURCE)
        .getBlockBlobClient(`${asset.galleryId}/${asset.id}/${variant}.jpg`)
        .uploadData(images[i], { conditions: { ifNoneMatch: '*' }, blobHTTPHeaders: { blobContentType: 'image/jpeg' } });
      await table.createEntity({ ...asset, partitionKey: 'gallery-assets-' + asset.galleryId, rowKey: asset.id });
    }
    await table.createEntity({ ...state.gallery, partitionKey: 'gallery-access-v1', rowKey: state.gallery.id });
    await jobs.create(state.job);
    await control.uploadData(Buffer.from(JSON.stringify(state)), { conditions: { ifNoneMatch: '*' },
      blobHTTPHeaders: { blobContentType: 'application/json', blobCacheControl: 'no-store' } });
    console.log(JSON.stringify({ seeded: true, jobId: state.job.id, photos: 3, sourceBytes: state.job.selection.totalBytes }));
    return;
  }
  assert.ok((await control.getProperties()).contentLength < 65536, 'Invalid trial state');
  const state = JSON.parse((await control.downloadToBuffer()).toString('utf8'));
  assert.ok(validRecord(state.gallery, state.gallery.id));
  assert.ok(/^[a-f0-9]{64}$/.test(state.secret), 'Invalid disposable test key');
  const saved = await jobs.read(state.gallery.id, state.job.id);
  assert.ok(saved, 'Trial job missing');
  if (action === 'configure') {
    assert.equal(saved.job.status, 'queued', 'Only a queued trial may be configured');
    assert.ok(saved.job.expiresAt > Date.now(), 'Trial expired');
    const identity = JSON.parse(az(['identity', 'show', '-g', GROUP, '-n', 'id-blackburn-archive-test'], true));
    az(['containerapp', 'job', 'secret', 'set', '-g', GROUP, '-n', JOB,
      '--secrets', 'archive-test-key=' + state.secret]);
    az(['containerapp', 'job', 'update', '-g', GROUP, '-n', JOB, '--set-env-vars',
      'AZURE_CLIENT_ID=' + identity.clientId,
      'GALLERY_ARCHIVE_CONTAINER_JOB_ENABLED=true',
      'GALLERY_ARCHIVE_QUEUE_CONSUMER_ENABLED=false',
      'GALLERY_ARCHIVE_JOB_MESSAGE=' + JSON.stringify({ galleryId: state.gallery.id, jobId: state.job.id }),
      'GALLERY_ACCESS_HMAC_KEY=secretref:archive-test-key',
      'GALLERY_PUBLIC_ORIGIN=https://archive-trial.invalid',
      `GALLERY_TABLE_ENDPOINT=https://${ACCOUNT}.table.core.windows.net`,
      'GALLERY_TABLE_NAME=' + TABLE,
      `GALLERY_BLOB_ENDPOINT=https://${ACCOUNT}.blob.core.windows.net`,
      'GALLERY_BLOB_CONTAINER=' + SOURCE,
      'GALLERY_ARCHIVE_BLOB_CONTAINER=' + OUTPUT]);
    console.log('Configured isolated manual job; execution has NOT started.');
    return;
  }
  console.log(JSON.stringify({ status: saved.job.status, photos: saved.job.photosCompleted,
    bytes: saved.job.bytesCompleted, archiveBytes: saved.job.archiveBytes }));
  if (action === 'status') return;
  assert.equal(saved.job.status, 'ready', 'Wait for READY before verifying');
  const container = blobs.getContainerClient(OUTPUT);
  assert.ok(!(await container.getProperties()).blobPublicAccess, 'Archive container must be private');
  const zip = container.getBlobClient(`${state.gallery.id}/${state.job.id}.zip`);
  const metadata = await zip.getProperties();
  assert.equal(metadata.contentLength, saved.job.archiveBytes);
  assert.ok(metadata.contentLength < 3 * MAX_FIXTURE_BYTES + 1024 * 1024);
  assert.equal(metadata.contentType, 'application/zip');
  const file = join(mkdtempSync(join(tmpdir(), 'archive-trial-')), 'gallery.zip');
  await zip.downloadToFile(file);
  verifyZip(file, state.expected);
  console.log('Worker/storage trial passed. Deployed HTTP authorization, ranges and large downloads still require separate testing.');
}

if (require.main === module) main(process.argv[2]).catch(error => {
  // Do not dump Azure/CLI errors: subprocess args may contain the disposable secret.
  console.error('Archive trial failed:', error instanceof assert.AssertionError ? error.message :
    error?.statusCode ? `Azure HTTP ${error.statusCode}; check test-account RBAC and propagation.` :
    'Check action, fixture downloads, compiled files and test configuration.');
  process.exitCode = 1;
});

module.exports = { makeFixture, verifyZip };
