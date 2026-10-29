import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { issueGateToken, matchesAdminCode, verifyGateToken } from './gate.ts';

Deno.test('Labs accepts the requested Nevulex code, ignoring case and surrounding whitespace', () => {
  assertEquals(matchesAdminCode('  nEvUlEx  ', 'Nevulex'), true);
  assertEquals(matchesAdminCode('incorrecto', 'Nevulex'), false);
});
Deno.test('Labs gate is bound to the verified administrator and cannot be forged', async () => {
  const token = await issueGateToken('admin-one', 'test-only-signing-key', 1000);
  assertEquals(await verifyGateToken(token, 'admin-one', 'test-only-signing-key', 2000), true);
  assertEquals(await verifyGateToken(token, 'admin-two', 'test-only-signing-key', 2000), false);
  assertEquals(await verifyGateToken(`${token}x`, 'admin-one', 'test-only-signing-key', 2000), false);
  assertEquals(await verifyGateToken(token, 'admin-one', 'test-only-signing-key', 3601000), false);
});