import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/jwt.js', import.meta.url), 'utf8');
const sandbox = { atob, btoa, TextDecoder, console };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const JWT = sandbox.JWTDecode;
assert.ok(JWT, 'JWTDecode should be exposed on globalThis');

const b64url = (value) => Buffer
  .from(JSON.stringify(value), 'utf8')
  .toString('base64')
  .replace(/=+$/, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

const makeToken = (header, payload, signature = 'signature') =>
  `${b64url(header)}.${b64url(payload)}.${signature}`;

// Canonical example from jwt.io.
const SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

test('decodes the jwt.io sample token', () => {
  const result = JWT.parse(SAMPLE);
  assert.equal(result.ok, true);
  assert.equal(result.encrypted, false);
  assert.equal(result.parts, 3);
  assert.equal(result.header.alg, 'HS256');
  assert.equal(result.header.typ, 'JWT');
  assert.equal(result.payload.sub, '1234567890');
  assert.equal(result.payload.name, 'John Doe');
  assert.equal(result.payload.iat, 1516239022);
  assert.ok(result.signature.length > 10);
  assert.equal(result.token, SAMPLE);
});

test('accepts whitespace, quotes and a Bearer prefix', () => {
  assert.equal(JWT.parse(`  ${SAMPLE}\n`).token, SAMPLE);
  assert.equal(JWT.parse(`"${SAMPLE}"`).token, SAMPLE);
  assert.equal(JWT.parse(`'${SAMPLE}'`).token, SAMPLE);
  assert.equal(JWT.parse(`Bearer ${SAMPLE}`).token, SAMPLE);
  assert.equal(JWT.parse(`bearer ${SAMPLE}`).token, SAMPLE);
});

test('finds the token inside a larger selection', () => {
  const result = JWT.parse(`Authorization: Bearer ${SAMPLE}.`);
  assert.equal(result.ok, true);
  assert.equal(result.token, SAMPLE);
});

test('decodes UTF-8 payload values', () => {
  const token = makeToken(
    { alg: 'HS256', typ: 'JWT' },
    { name: 'José Álvarez', city: 'São Paulo', note: '日本語 🎉' }
  );
  const result = JWT.parse(token);
  assert.equal(result.ok, true);
  assert.equal(result.payload.name, 'José Álvarez');
  assert.equal(result.payload.note, '日本語 🎉');
});

test('handles unsigned tokens', () => {
  const trailing = JWT.parse(makeToken({ alg: 'none' }, { sub: 'demo' }, ''));
  assert.equal(trailing.ok, true);
  assert.equal(trailing.signature, '');
  assert.equal(trailing.parts, 3);

  const two = JWT.parse(`${b64url({ alg: 'none' })}.${b64url({ sub: 'demo' })}`);
  assert.equal(two.ok, true);
  assert.equal(two.signature, '');
  assert.equal(two.parts, 2);
});

test('reads time claims', () => {
  const token = makeToken(
    { alg: 'HS256' },
    { sub: 'demo', iat: 1700000000, exp: 1700003600, nbf: 1700000000 }
  );
  const result = JWT.parse(token);
  assert.equal(result.ok, true);
  assert.ok(JWT.claimDate(result.payload.exp).getTime() > 0);
  assert.ok(JWT.formatDate(result.payload.exp, 'en').length > 0);
  assert.ok(JWT.formatRelative(result.payload.exp, 'en').length > 0);
});

test('reads the header of an encrypted JWE', () => {
  const jwe = [
    b64url({ alg: 'RSA-OAEP', enc: 'A256GCM', cty: 'JWT' }),
    'hF2sL0fakeEncryptedKey',
    'Ax9fakeIv',
    'Bx8fakeCiphertext',
    'Cx7fakeTag'
  ].join('.');

  const result = JWT.parse(jwe);
  assert.equal(result.ok, true);
  assert.equal(result.encrypted, true);
  assert.equal(result.payload, null);
  assert.equal(result.header.alg, 'RSA-OAEP');
  assert.equal(result.header.enc, 'A256GCM');
});

test('rejects values that are not tokens', () => {
  assert.equal(JWT.parse('').code, 'notJwt');
  assert.equal(JWT.parse('hello world').code, 'notJwt');
  assert.equal(JWT.parse('https://example.com/a.b').code, 'notJwt');
  assert.equal(JWT.parse('esto.no.es.un.jwt').code, 'notJwt');
});

test('rejects an invalid number of segments', () => {
  const four = JWT.parse('aaaaaaaA.bbbbbbbb.cccccccc.dddddddd');
  assert.equal(four.ok, false);
  assert.equal(four.code, 'segments');
  assert.equal(four.count, 4);
});

test('reports unreadable header and payload segments', () => {
  const badHeader = `${Buffer.from('helloworld').toString('base64url')}.${Buffer.from('{"a":1}').toString('base64url')}.sig`;
  const headerResult = JWT.parse(badHeader);
  assert.equal(headerResult.ok, false);
  assert.equal(headerResult.code, 'header');
  assert.equal(headerResult.reason, 'json');

  const badPayload = makeToken({ alg: 'HS256' }, {});
  const brokenPayload = [badPayload.split('.')[0], Buffer.from('nope').toString('base64url'), 'sig'].join('.');
  const payloadResult = JWT.parse(brokenPayload);
  assert.equal(payloadResult.ok, false);
  assert.equal(payloadResult.code, 'payload');
  assert.equal(payloadResult.reason, 'json');

  const numberPayload = [badPayload.split('.')[0], Buffer.from('123').toString('base64url'), 'sig'].join('.');
  const objectResult = JWT.parse(numberPayload);
  assert.equal(objectResult.ok, false);
  assert.equal(objectResult.code, 'payload');
  assert.equal(objectResult.reason, 'object');
});

test('rejects tokens that are too long', () => {
  const token = `${'a'.repeat(JWT.MAX_TOKEN_LENGTH + 1)}.e30.sig`;
  const result = JWT.parse(token);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'tooLong');
});

test('formats JSON with two-space indentation', () => {
  const output = JWT.formatJson({ a: 1, b: { c: [true, null] } });
  assert.equal(output, '{\n  "a": 1,\n  "b": {\n    "c": [\n      true,\n      null\n    ]\n  }\n}');
});
