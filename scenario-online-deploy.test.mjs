// Single-service deploy (Render): one Node server serves the pages and /api/* from the same origin.
import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';
import {defaultServerUrl} from './scenario-adventure/online-server-url.js';
const actualFetch=globalThis.fetch;process.env.AI_DISTRICT_PORT='0';process.env.AI_DISTRICT_TRUST_PROXY='1';
const cards=[['patch-update','SUPPORT'],['firewall-guard','DEFENSE'],['energy-boost','SUPPORT']].map(([id,card_type])=>({id,name:id,card_type,en_cost:1,is_starter:true,is_active:true}));
globalThis.fetch=async(url,options)=>{if(String(url).startsWith('https://urkimjcqsfidxwnnrclc.supabase.co')){const token=options.headers.Authorization.slice(7);if(!token.startsWith('deploy-'))return new Response('{}',{status:401});if(String(url).includes('/auth/v1/user'))return Response.json({id:token});if(String(url).includes('/action_cards?'))return Response.json(cards);if(String(url).includes('/user_card_unlocks?'))return Response.json([]);return new Response('{}',{status:404});}return actualFetch(url,options);};
const {server}=await import('./scenario-online-server.mjs');if(!server.listening)await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
const setup={characterId:'milo',cardIds:['patch-update','firewall-guard','energy-boost','patch-update','firewall-guard']};
const post=(route,input,{origin=base,token='deploy-1',headers={}}={})=>actualFetch(base+'/api/'+route,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...(origin?{Origin:origin}:{}),...headers},body:JSON.stringify(input)});
test.after(async()=>{globalThis.fetch=actualFetch;await new Promise(resolve=>server.close(resolve));});

test('client uses the same origin when deployed and :4180 for local static dev',()=>{
 assert.equal(defaultServerUrl({hostname:'ai-district.onrender.com',port:'',origin:'https://ai-district.onrender.com'}),'https://ai-district.onrender.com');
 assert.equal(defaultServerUrl({hostname:'play.example.org',port:'8443',origin:'https://play.example.org:8443'}),'https://play.example.org:8443');
 assert.equal(defaultServerUrl({hostname:'127.0.0.1',port:'4174',origin:'http://127.0.0.1:4174'}),'http://127.0.0.1:4180');
 assert.equal(defaultServerUrl({hostname:'localhost',port:'4180',origin:'http://localhost:4180'}),'http://localhost:4180');
});

test('health check needs no login',async()=>{
 const res=await actualFetch(base+'/api/health');assert.equal(res.status,200);assert.equal((await res.json()).ok,true);
});

test('same-origin page can create a room; a foreign origin is still refused',async()=>{
 const own=await post('create',setup);assert.equal(own.status,200);assert.ok((await own.json()).code);
 const foreign=await post('create',setup,{origin:'https://evil.example'});assert.equal(foreign.status,403);assert.equal((await foreign.json()).error,'ORIGIN_NOT_ALLOWED');
 const noOrigin=await post('rooms',{},{origin:null});assert.notEqual(noOrigin.status,403);
});

test('serves the site pages and assets but not dotfiles or unlisted types',async()=>{
 const root=await actualFetch(base+'/');assert.equal(root.status,200);assert.match(root.headers.get('content-type'),/text\/html/);assert.match(await root.text(),/<html/i);
 const room=await actualFetch(base+'/online-room.html?code=12345678');assert.equal(room.status,200);
 const client=await actualFetch(base+'/scenario-adventure/online-client.js?v=1');assert.equal(client.status,200);assert.equal(client.headers.get('cache-control'),'no-store');
 const image=await actualFetch(base+'/assets/ai-district-logo.png');assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');assert.match(image.headers.get('cache-control'),/max-age/);
 for(const path of ['/.openai/hosting.json','/README.md','/supabase/'])assert.equal((await actualFetch(base+path)).status,404,path);
});

test('Vercel rewrite: proxied request from the page host is accepted via X-Forwarded-Host only',async()=>{
 const viaVercel={origin:'https://ai-district.vercel.app',headers:{'X-Forwarded-Host':'ai-district.vercel.app','X-Forwarded-For':'192.0.2.44'}};
 const ok=await post('create',setup,viaVercel);assert.equal(ok.status,200);
 const spoofed=await post('create',setup,{origin:'https://evil.example',headers:{'X-Forwarded-Host':'ai-district.vercel.app'}});assert.equal(spoofed.status,403);
});

test('vercel.json forwards /api/* to the room server and is shipped in dist',async()=>{
 const {readFile}=await import('node:fs/promises');
 const [root,dist]=await Promise.all([readFile(new URL('./vercel.json',import.meta.url),'utf8'),readFile(new URL('./dist/vercel.json',import.meta.url),'utf8').catch(()=>null)]);
 const rewrite=JSON.parse(root).rewrites.find(r=>r.source==='/api/:path*');
 assert.match(rewrite.destination,/^https:\/\/[^/]+\/api\/:path\*$/);
 if(dist!==null)assert.equal(dist,root);
});

test('behind a proxy the rate limit is per forwarded client, not shared',async()=>{
 for(let i=0;i<301;i++)await post('rooms',{},{headers:{'X-Forwarded-For':'203.0.113.7'}}).then(r=>r.arrayBuffer());
 const limited=await post('rooms',{},{headers:{'X-Forwarded-For':'203.0.113.7'}});assert.equal(limited.status,429);
 const other=await post('rooms',{},{headers:{'X-Forwarded-For':'198.51.100.9'}});assert.notEqual(other.status,429);
});
