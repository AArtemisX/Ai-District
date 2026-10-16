import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';
const revoked=new Set();
const actualFetch=globalThis.fetch;process.env.AI_DISTRICT_PORT='0';
const cards=[['patch-update','SUPPORT'],['firewall-guard','DEFENSE'],['energy-boost','SUPPORT']].map(([id,card_type])=>({id,name:id,card_type,en_cost:1,is_starter:true,is_active:true}));
globalThis.fetch=async(url,options)=>{if(String(url).startsWith('https://urkimjcqsfidxwnnrclc.supabase.co')){const token=options.headers.Authorization.slice(7);if(!['account-1','account-2','account-3','account-4'].includes(token))return new Response('{}',{status:401});if(String(url).includes('/auth/v1/user'))return Response.json({id:token});if(String(url).includes('/action_cards?'))return Response.json(revoked.has(token)?cards.map(card=>({...card,is_starter:false})):cards);if(String(url).includes('/user_card_unlocks?'))return Response.json([]);return new Response('{}',{status:404});}return actualFetch(url,options);};
const {server}=await import('./scenario-online-server.mjs');if(!server.listening)await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
async function api(token,route,input,origin='http://127.0.0.1:4174'){const res=await actualFetch(base+'/api/'+route,{method:input?'POST':'GET',headers:{Authorization:'Bearer '+token,Origin:origin,...(input?{'Content-Type':'application/json'}:{})},body:input?JSON.stringify(input):undefined});return {status:res.status,data:await res.json()};}
test('HTTP authenticates before membership/commands; CORS and real inventory-derived eligibility; two independent clients share result',async()=>{try{
 assert.equal((await api('invalid','create',{})).status,400);assert.equal((await api('account-1','create',{},'https://untrusted.invalid')).status,403);
 const setup={characterId:'milo',cardIds:['patch-update','firewall-guard','energy-boost','patch-update','firewall-guard']};
 assert.equal((await api('account-1','create',{...setup,cardIds:Array(5).fill('locked')})).status,400);
 let room=(await api('account-1','create',setup)).data;const code=room.code;assert.ok(code);
 assert.equal((await api('account-3','room?code='+code)).status,400);
 room=(await api('account-2','join',{...setup,code})).data;
 async function action(token,type,extra={}){const current=await api(token,'room?code='+code);if(type==='respond'&&extra.responseType==='BASIC'&&current.data.event.type!=='ACTION')extra={choiceId:current.data.event.choices[0].id};const res=await api(token,'action',{code,revision:current.data.revision,type,...extra});assert.equal(res.status,200,JSON.stringify(res.data));return res.data;}
 await action('account-1','ready');await action('account-2','ready');await action('account-1','start');
 for(let i=0;i<12;i++){const token=i%2?'account-2':'account-1';const rolled=await action(token,'roll');if(rolled.phase==='RESPONSE_SELECTION')await action(token,'respond',{responseType:'BASIC'});if(i<11)await action(token,'continue');}
 const first=(await api('account-1','room?code='+code)).data,second=(await api('account-2','room?code='+code)).data;
 assert.equal(first.status,'FINISHED');assert.equal(first.match.responseHistory.length,12);assert.equal(new Set(first.match.scenarioHistory.map(r=>r.contentIdentity)).size,first.match.eventHistory.filter(e=>e.type==='ACTION').length);assert.deepEqual(first.match,second.match);assert.notEqual(first.role,second.role);assert.equal(first.decks,undefined);

 const privateRoom=(await api('account-1','create',{...setup,roomName:'Private four',maxPlayers:4,botCount:1,isPrivate:true,password:'Private 2-4'})).data;
 const listing=await api('account-2','rooms');assert.equal(listing.status,200);const listed=listing.data.find(r=>r.code===privateRoom.code);assert.equal(listed.requiresPassword,true);assert.equal(listed.memberCount,2);assert.doesNotMatch(JSON.stringify(listing.data),/Private 2-4|passwordHash|passwordSalt/);
 assert.equal((await api('account-2','join',{...setup,code:privateRoom.code})).status,400);
 assert.equal((await api('account-2','join',{...setup,code:privateRoom.code,password:'wrong'})).status,400);
 assert.equal((await api('account-2','room?code='+privateRoom.code)).status,400);
 assert.equal((await api('account-2','join',{...setup,code:privateRoom.code,password:'Private 2-4'})).status,200);
 assert.equal((await api('account-3','join',{...setup,code:privateRoom.code,password:'Private 2-4'})).status,200);
 async function privateAction(token,type,extra={}){const current=(await api(token,'room?code='+privateRoom.code)).data;return api(token,'action',{code:privateRoom.code,revision:current.revision,type,...extra});}
 assert.equal((await privateAction('account-2','add-bot')).status,400);
 assert.equal((await privateAction('account-2','kick',{role:'player'})).data.error,'OWNER_ONLY');
 const guest=(await api('account-2','room?code='+privateRoom.code)).data;
 assert.equal((await privateAction('account-1','kick',{role:guest.role})).status,200);
 assert.equal((await api('account-2','room?code='+privateRoom.code)).data.error,'KICKED_FROM_ROOM');
 assert.equal((await api('account-2','join',{...setup,code:privateRoom.code,password:'wrong'})).status,400);
 assert.equal((await api('account-2','join',{...setup,code:privateRoom.code,password:'Private 2-4'})).status,200);
 for(const token of ['account-1','account-2','account-3'])assert.equal((await privateAction(token,'ready',{ready:true})).status,200);
 const fourStarted=await privateAction('account-1','start');assert.equal(fourStarted.status,200);assert.equal(fourStarted.data.match.actorOrder.length,4);assert.equal(fourStarted.data.members.filter(m=>m.isBot).length,1);
 await privateAction('account-1','leave');

 const four=(await api('account-1','create',{...setup,maxPlayers:4})).data;
 for(const token of ['account-2','account-3','account-4'])assert.equal((await api(token,'join',{...setup,code:four.code})).status,200);
 async function fourAction(token,type,extra={}){const view=(await api(token,'room?code='+four.code)).data;if(type==='respond'&&extra.responseType==='BASIC'&&view.event.type!=='ACTION')extra={choiceId:view.event.choices[0].id};const response=await api(token,'action',{code:four.code,revision:view.revision,type,...extra});assert.equal(response.status,200,JSON.stringify(response.data));return response.data;}
 for(const token of ['account-1','account-2','account-3','account-4'])await fourAction(token,'ready',{ready:true});await fourAction('account-1','start');
 for(let i=0;i<24;i++){const token='account-'+(i%4+1);const rolled=await fourAction(token,'roll');if(i===0&&['ACTION','RISK'].includes(rolled.event.type)){revoked.add(token);const denied=await api(token,'action',{code:four.code,revision:rolled.revision,type:'respond',responseType:'CARD',instanceId:rolled.deck.hand[0].instanceId});assert.equal(denied.data.error,'CARD_NOT_ALLOWED_OR_IN_HAND');}if(rolled.phase==='RESPONSE_SELECTION')await fourAction(token,'respond',{responseType:'BASIC'});revoked.delete(token);if(i<23)await fourAction(token,'continue');}
 const fourResult=(await api('account-4','room?code='+four.code)).data;assert.equal(fourResult.status,'FINISHED');assert.equal(fourResult.match.responseHistory.length,24);assert.equal(new Set(fourResult.match.scenarioHistory.map(r=>r.contentIdentity)).size,fourResult.match.eventHistory.filter(e=>e.type==='ACTION').length);assert.ok(fourResult.match.winners.length>=1);assert.equal(fourResult.match.eventHistory.filter(e=>e.resolved).length,24);
 }finally{globalThis.fetch=actualFetch;await new Promise(resolve=>server.close(resolve));}});

