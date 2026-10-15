import assert from 'node:assert/strict';
import test from 'node:test';
import { executeQuery } from '../backend/query';
function mock() {const calls:any[]=[];return {calls,db:{query:async(sql:string,args:unknown[])=>{calls.push({sql,args});return {rows:[{id:'test'}]};}} as any};}
for(const query of [
 {table:'bookings',action:'select'}, {table:'booking_payments',action:'select'},
 {table:'services',action:'delete',filters:[{column:'id',op:'eq',value:'x'}]},
 {table:'bookings',action:'insert',values:{id:'x',status:'completed'}},
]) test('anonymous permission: '+JSON.stringify(query),async()=>{const m=mock();await assert.rejects(executeQuery(m.db,query,false));assert.equal(m.calls.length,0);});
for(const query of [
 {table:'bookings',action:'delete',filters:[{column:'id',op:'eq',value:'x'}]},
 {table:'bookings',action:'update',values:{paid_amount:999},filters:[{column:'id',op:'eq',value:'x'}]},
 {table:'services',action:'update',values:{name:'x'}},
 {table:'services',action:'select',columns:'id;select * from bookings'},
 {table:'__proto__',action:'select'},
]) test('admin cannot bypass invariants: '+JSON.stringify(query),async()=>{const m=mock();await assert.rejects(executeQuery(m.db,query,true));assert.equal(m.calls.length,0);});
test('bound values and update filters retain their positions',async()=>{const m=mock();await executeQuery(m.db,{table:'services',action:'update',values:{name:"x'; DELETE FROM bookings; --"},filters:[{column:'id',op:'eq',value:'service'}],columns:'id',single:true},true);assert.equal(m.calls[0].sql,'UPDATE public."services" SET "name"=$2 WHERE "id"=$1 RETURNING "id"');assert.deepEqual(m.calls[0].args,['service',"x'; DELETE FROM bookings; --"]);});
test('public booking insert never returns customer records',async()=>{const m=mock();const data=await executeQuery(m.db,{table:'bookings',action:'insert',values:{id:'x'},columns:'*'},false);assert.equal(data,null);assert.ok(!m.calls[0].sql.includes('RETURNING'));});
