import test from 'node:test';
import assert from 'node:assert';

test('node environment smoke test', () => {
  assert.strictEqual(typeof process.version, 'string');
  assert.ok(process.version.startsWith('v'));
});
