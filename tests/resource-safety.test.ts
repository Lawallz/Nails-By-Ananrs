import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson, readBody } from '../backend/http';
import { catalogKey, cachedCatalog, storeCatalog, clearCatalog } from '../backend/catalogCache';

test('streamed payload is rejected without trusting content-length', async () => {
  let cancelled=false;
  const body=new ReadableStream({pull(c){c.enqueue(new Uint8Array(10));},cancel(){cancelled=true;}});
  const req=new Request('https://example.test',{method:'POST',body,duplex:'half'} as RequestInit);
  await assert.rejects(readBody(req,15), {status:413});
  assert.equal(cancelled,true);
});
test('JSON input must be an object and Unicode counts toward the byte limit',async()=>{
  for(const body of ['null','[]','123']) await assert.rejects(readJson(new Request('https://example.test',{method:'POST',body})),{status:400});
  await assert.rejects(readJson(new Request('https://example.test',{method:'POST',body:JSON.stringify({a:'ééé'})}),10),{status:413});
});
test('private records, mutations and authenticated reads cannot enter public cache',()=>{
  for(const table of ['bookings','booking_payments','booking_slots','schedule_blocks'])assert.equal(catalogKey({action:'select',table},false),null);
  assert.equal(catalogKey({action:'insert',table:'services'},false),null);
  assert.equal(catalogKey({action:'select',table:'services'},true),null);
  clearCatalog();
  const key=catalogKey({action:'select',table:'services'},false)!;
  storeCatalog(key,[{id:'public'}]);assert.deepEqual(cachedCatalog(key),[{id:'public'}]);
  clearCatalog();assert.equal(cachedCatalog(key),undefined);
});
test('catalog memory is bounded and oversized results are not retained',()=>{
  clearCatalog();for(let i=0;i<17;i++)storeCatalog(String(i),[]);
  assert.equal(cachedCatalog('0'),undefined);assert.deepEqual(cachedCatalog('16'),[]);
  storeCatalog('large','x'.repeat(65537));assert.equal(cachedCatalog('large'),undefined);
});
