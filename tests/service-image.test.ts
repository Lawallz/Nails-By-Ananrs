import assert from 'node:assert/strict';
import test from 'node:test';
import {prepareServiceImage,MAX_SERVICE_IMAGE_BYTES} from '../src/lib/prepareServiceImage';
import {serviceImageType} from '../backend/imageFormat';

async function simulate(encoder:(type:string,quality:number,width:number)=>Blob) {
  const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
  const oldBitmap=Object.getOwnPropertyDescriptor(globalThis,'createImageBitmap');
  let closed=false;let whiteBackground=false;
  const calls:{type:string;quality:number;width:number}[]=[];
  const context={clearRect(){},fillStyle:'',fillRect(){whiteBackground=true;},drawImage(){}};
  const canvas={width:0,height:0,getContext:()=>context,toBlob(callback:(b:Blob)=>void,type:string,quality:number){
    calls.push({type,quality,width:this.width});callback(encoder(type,quality,this.width));
  }};
  Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>canvas}});
  Object.defineProperty(globalThis,'createImageBitmap',{configurable:true,value:async()=>({width:4000,height:3000,close(){closed=true;}})});
  try {
    const blob=await prepareServiceImage(new File(['photo'],'photo.jpg',{type:'image/jpeg'}));
    assert.equal(closed,true);assert.equal(canvas.width,1);
    return {blob,calls,whiteBackground};
  } finally {
    if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else Reflect.deleteProperty(globalThis,'document');
    if(oldBitmap)Object.defineProperty(globalThis,'createImageBitmap',oldBitmap);else Reflect.deleteProperty(globalThis,'createImageBitmap');
  }
}
test('Safari-style PNG fallback is re-encoded as JPEG instead of rejected for size',async()=>{
  const result=await simulate(type=>new Blob([new Uint8Array(type==='image/webp'?1200000:150000)],{type:type==='image/webp'?'image/png':'image/jpeg'}));
  assert.equal(result.blob.type,'image/jpeg');assert.ok(result.blob.size<=MAX_SERVICE_IMAGE_BYTES);
  assert.deepEqual(result.calls.map(c=>c.type),['image/webp','image/jpeg']);assert.equal(result.whiteBackground,true);
});
test('WebP remains preferred on browsers that support its encoder',async()=>{
  const result=await simulate(type=>new Blob(['webp'],{type}));
  assert.equal(result.blob.type,'image/webp');assert.equal(result.calls.length,1);
});
test('large photos are reduced in quality and dimensions with a bounded number of attempts',async()=>{
  const result=await simulate((type,_quality,width)=>new Blob([new Uint8Array(width>768?850000:200000)],{type}));
  assert.equal(result.calls.length,7);assert.equal(result.calls.at(-1)?.width,768);
  assert.ok(result.blob.size<=MAX_SERVICE_IMAGE_BYTES);
});
test('an encoder that cannot meet the limit fails instead of uploading an oversized body',async()=>{
  await assert.rejects(simulate(type=>new Blob([new Uint8Array(850000)],{type})),/Não foi possível reduzir/);
});
test('server recognises JPEG and existing WebP, but rejects PNG, HTML and truncated data',()=>{
  assert.equal(serviceImageType(Buffer.from('RIFF0000WEBPdata')),'image/webp');
  assert.equal(serviceImageType(new Uint8Array([255,216,255,224,0,255,217])),'image/jpeg');
  assert.equal(serviceImageType(new Uint8Array([255,216,255])),null);
  assert.equal(serviceImageType(Buffer.from('<svg onload="alert(1)">')),null);
  assert.equal(serviceImageType(new Uint8Array([137,80,78,71,13,10,26,10])),null);
});
