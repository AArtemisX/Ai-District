// Board rules v2 ("bonus tiles"), owner-approved 16 Oct 2026. See GAMEPLAY_FREEZE_HANDOFF_v2.md.
import test from 'node:test';import assert from 'node:assert/strict';
import {TILE_EVENT_TYPES,TILE_BONUS_KINDS,BONUS_KINDS,BONUS_CONFIG,eventTypeForTile,bonusKindForTile,landOnTile,openBoardEvent,resolveBoardEvent,chooseEventIntent} from './scenario-adventure/board-events.js';
import {createScenarioAdventureMatch} from './scenario-adventure/scenario-engine.js';
import {createDeckState} from './scenario-adventure/deck-engine.js';
import {OnlineRooms} from './scenario-adventure/online-rooms.mjs';
const allowedIds=['patch-update','firewall-guard','energy-boost'],cards=[...allowedIds,'patch-update','firewall-guard'],inventory={allowedIds},setup={characterId:'milo',cardIds:cards};
const fresh=(scores)=>{const match=createScenarioAdventureMatch();if(scores)match.scores.player=scores;return {match,actorId:'player',random:()=>0};};
const circular=(a,b)=>{const d=Math.abs(a-b)%32;return Math.min(d,32-d);};
// Deterministic dice for the room service: set after start so deck shuffles are unaffected.
const dice=value=>()=>(value-1)/6+.01;
function lcg(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}

test('v2 mapping: 12 ACTION / 8 BONUS / 4 SUPPORT / 4 RISK / 4 DECISION, two of each bonus kind, spread around the loop',()=>{
 const count=type=>TILE_EVENT_TYPES.filter(t=>t===type).length;
 assert.deepEqual(['ACTION','BONUS','SUPPORT','RISK','DECISION'].map(count),[12,8,4,4,4]);
 assert.equal(eventTypeForTile(0),'ACTION');
 const bonusTiles=Object.keys(TILE_BONUS_KINDS).map(Number);
 assert.deepEqual(bonusTiles,TILE_EVENT_TYPES.flatMap((t,i)=>t==='BONUS'?[i]:[]));
 for(const kind of BONUS_KINDS)assert.equal(bonusTiles.filter(i=>TILE_BONUS_KINDS[i]===kind).length,2);
 for(let i=0;i<32;i++)assert.equal(bonusKindForTile(i)!==null,eventTypeForTile(i)==='BONUS');
 for(let i=0;i<bonusTiles.length;i++)assert.ok(circular(bonusTiles[i],bonusTiles[(i+1)%bonusTiles.length])>=3,'bonus tiles are spread out');
 const forward=bonusTiles.filter(i=>TILE_BONUS_KINDS[i]==='FORWARD_2');
 for(const a of forward)for(const b of forward)if(a!==b)assert.ok(circular(a,b)>2,'no two FORWARD_2 within 2 tiles');
 for(const a of forward)assert.notEqual(eventTypeForTile(a+2),'BONUS','default layout never chains');
 assert.ok(!TILE_EVENT_TYPES.includes('MOVEMENT'),'choice-based MOVEMENT is folded into BONUS');
});

test('RP_PLUS_1 adds 1 RP, counts the turn, opens no event and needs no choice',async()=>{
 const l=await landOnTile({...fresh(),tileIndex:6});
 assert.equal(l.event.type,'BONUS');assert.equal(l.bonus.kind,'RP_PLUS_1');assert.equal(l.scenario,null);
 assert.deepEqual(l.match.scores.player,{rp:1,stability:10});assert.equal(l.match.turns.player,1);assert.equal(l.position,6);
 assert.equal(l.result.responseType,'BONUS');assert.equal(l.result.rpDelta,1);assert.equal(l.match.responseHistory.length,1);
 assert.equal(l.match.scenarioHistory.length,0);assert.equal(chooseEventIntent({event:l.event,match:l.match,actorId:'player'}),null);
});

test('STABILITY_PLUS_1 adds 1 Stability and is capped at 10',async()=>{
 const low=await landOnTile({...fresh({rp:2,stability:7}),tileIndex:10});
 assert.deepEqual(low.match.scores.player,{rp:2,stability:8});assert.equal(low.result.appliedStabilityDelta,1);
 const full=await landOnTile({...fresh(),tileIndex:26});
 assert.deepEqual(full.match.scores.player,{rp:0,stability:10});assert.equal(full.result.appliedStabilityDelta,0);assert.equal(full.match.turns.player,1);
});

test('REST changes nothing but still counts as the turn',async()=>{
 const l=await landOnTile({...fresh({rp:3,stability:6}),tileIndex:30});
 assert.equal(l.bonus.kind,'REST');assert.deepEqual(l.match.scores.player,{rp:3,stability:6});assert.equal(l.match.turns.player,1);assert.equal(l.position,30);
});

test('FORWARD_2 moves +2 and opens the destination event once; that event is the turn event',async()=>{
 const c=fresh(),l=await landOnTile({...c,tileIndex:18});
 assert.equal(l.bonus.kind,'FORWARD_2');assert.deepEqual(l.bonusPath,[19,20]);assert.equal(l.position,20);
 assert.equal(l.event.type,eventTypeForTile(20));assert.equal(l.event.tileIndex,20);assert.equal(l.event.viaBonus.kind,'FORWARD_2');
 assert.equal(l.result,null);assert.equal(l.match.turns.player,0);assert.equal(l.match.eventHistory.length,1);
 await assert.rejects(landOnTile({...c,match:l.match,tileIndex:18}),/EVENT_ALREADY_OPENED/);
 const deck=createDeckState(cards),r=resolveBoardEvent({match:l.match,event:l.event,scenario:l.scenario,actorId:'player',deck,allowedIds,intent:chooseEventIntent({event:l.event,scenario:l.scenario,deck,allowedIds,match:l.match,actorId:'player'}),position:l.position});
 assert.equal(r.match.turns.player,1);assert.equal(r.position,20);assert.equal(r.match.responseHistory.length,1);
});

test('Rule A\': FORWARD_2 onto another BONUS tile does not chain; passing START grants nothing',async()=>{
 const eventType=i=>[5,7,31,1].includes(i)?'BONUS':'ACTION',bonusKind=i=>({5:'FORWARD_2',7:'RP_PLUS_1',31:'FORWARD_2',1:'STABILITY_PLUS_1'})[i]||null;
 const chained=await landOnTile({...fresh({rp:0,stability:5}),tileIndex:5,eventType,bonusKind});
 assert.equal(chained.position,7);assert.equal(chained.bonus.chainStopped,true);assert.equal(chained.event.type,'BONUS');assert.equal(chained.event.bonusKind,'FORWARD_2');
 assert.deepEqual(chained.match.scores.player,{rp:0,stability:5},'destination RP_PLUS_1 is not applied');
 assert.equal(chained.match.turns.player,1);assert.equal(chained.match.eventHistory.length,1);assert.equal(chained.match.scenarioHistory.length,0);
 const wrapped=await landOnTile({...fresh({rp:0,stability:5}),tileIndex:31,eventType,bonusKind});
 assert.deepEqual(wrapped.bonusPath,[0,1]);assert.equal(wrapped.position,1);assert.deepEqual(wrapped.match.scores.player,{rp:0,stability:5},'no START bonus, no chained Stability');
 const toScenario=await landOnTile({...fresh(),tileIndex:31,eventType:i=>i===31?'BONUS':'ACTION',bonusKind});
 assert.equal(toScenario.position,1);assert.equal(toScenario.event.type,'ACTION');assert.equal(toScenario.match.scores.player.rp,0);
});

test('BONUS cannot be opened as an event, resolved by a client choice, or replayed',async()=>{
 await assert.rejects(openBoardEvent({...fresh(),tileIndex:6}),/BONUS_TILE_HAS_NO_EVENT/);
 const l=await landOnTile({...fresh(),tileIndex:6}),deck=createDeckState(cards);
 const again=resolveBoardEvent({match:l.match,event:l.event,scenario:null,actorId:'player',deck,allowedIds,intent:{choiceId:'x'},position:6});
 assert.equal(again.duplicate,true);assert.deepEqual(again.match.scores,l.match.scores);
 assert.throws(()=>resolveBoardEvent({match:l.match,event:l.event,actorId:'player',deck,allowedIds,intent:{rp:5},position:6}),/INVALID_EVENT_INTENT/);
 assert.ok(BONUS_KINDS.every(kind=>BONUS_CONFIG[kind].rp<=1&&BONUS_CONFIG[kind].stability<=1));
});

async function startRoom(count,{bots=0,now}={}){
 const users=Array.from({length:count-bots},(_,i)=>({id:'v2-'+count+'-'+i})),service=new OnlineRooms({random:()=>0,...(now?{now}:{})});
 const code=service.create(users[0],{...setup,maxPlayers:count,botCount:bots},inventory).code;for(const u of users.slice(1))service.join(u,code,setup,inventory);
 const room=service.get(code,users[0].id),act=(u,type,extra={})=>service.act(u,code,{revision:room.revision,type,...extra});
 for(const u of users)await act(u,'ready',{ready:true});await act(users[0],'start');return {service,room,users,act,code};
}

test('server: roll onto RP_PLUS_1 commits score+turn in one revision; respond is rejected; continue passes the turn',async()=>{
 const {service,room,users,act,code}=await startRoom(2);service.random=dice(6);const before=room.revision;
 await act(users[0],'roll');
 assert.equal(room.revision,before+1);assert.equal(room.positions.player,6);assert.equal(room.phase,'RESOLVED');assert.equal(room.bonus.kind,'RP_PLUS_1');
 assert.equal(room.result.responseType,'BONUS');assert.deepEqual(room.match.scores.player,{rp:1,stability:10});assert.equal(room.match.turns.player,1);
 await assert.rejects(act(users[0],'respond',{choiceId:'report'}),/INVALID_PHASE/);
 await assert.rejects(act(users[0],'roll'),/INVALID_PHASE/);
 await assert.rejects(service.act(users[0],code,{revision:before,type:'continue'}),/STALE_REVISION/);
 const view=service.view(room,users[0].id);assert.equal(view.bonus.kind,'RP_PLUS_1');assert.deepEqual(view.movement.bonusPath,[]);
 await act(users[0],'continue');assert.equal(room.bonus,null);assert.equal(room.match.currentTurn,room.match.actorOrder[1]);
});

test('server: roll onto FORWARD_2 moves +2 and opens the destination event for the same turn',async()=>{
 const {service,room,users,act}=await startRoom(2);service.random=dice(2);
 await act(users[0],'roll');
 assert.equal(room.positions.player,4);assert.deepEqual(room.movement.path,[1,2]);assert.deepEqual(room.movement.bonusPath,[3,4]);
 assert.equal(room.phase,'RESPONSE_SELECTION');assert.equal(room.event.tileIndex,4);assert.equal(room.event.viaBonus.kind,'FORWARD_2');assert.equal(room.match.turns.player,0);
 await act(users[0],'respond',chooseEventIntent({event:room.event,scenario:room.scenario,deck:room.decks.player,allowedIds,match:room.match,actorId:'player'}));
 assert.equal(room.match.turns.player,1);assert.equal(room.positions.player,4);assert.equal(room.match.eventHistory.length,1);
});

test('server: client-sent score, position or bonus fields are rejected on every play command',async()=>{
 const {service,room,users,act}=await startRoom(2);service.random=dice(6);
 for(const forged of [{rp:9},{stability:10},{position:2},{positions:{player:2}},{tileIndex:2},{score:{rp:9}},{scores:{}}])await assert.rejects(act(users[0],'roll',forged),/INVALID_EVENT_INTENT/);
 await act(users[0],'roll',{bonusKind:'FORWARD_2',steps:9});
 assert.equal(room.bonus.kind,'RP_PLUS_1','server reads the tile, not the client');assert.equal(room.positions.player,6);
 await assert.rejects(act(users[0],'continue',{rp:50}),/INVALID_EVENT_INTENT/);assert.equal(room.match.scores.player.rp,1);
});

for(const count of [2,3,4])test(`server: ${count} actors incl. bots finish 6 turns each through bonus tiles, then replay resets`,async()=>{
 let clock=1e6;const {service,room,users,act}=await startRoom(count,{bots:count-1,now:()=>clock});service.random=lcg(count*97);
 for(let n=0;n<400&&room.status==='PLAYING';n++){
  const role=room.match.currentTurn;
  if(role!=='player'){clock+=1e5;await service.tickBots();continue;}
  if(room.phase==='WAITING')await act(users[0],'roll');
  else if(room.phase==='RESPONSE_SELECTION')await act(users[0],'respond',chooseEventIntent({event:room.event,scenario:room.scenario,deck:room.decks.player,allowedIds,match:room.match,actorId:'player'}));
  else await act(users[0],'continue');
 }
 assert.equal(room.status,'FINISHED');assert.equal(room.error,null);
 for(const role of room.match.actorOrder)assert.equal(room.match.turns[role],6);
 assert.equal(room.match.responseHistory.length,count*6);assert.equal(room.match.eventHistory.length,count*6);
 assert.ok(room.match.responseHistory.some(r=>r.responseType==='BONUS'),'a bonus tile was resolved');
 for(const score of Object.values(room.match.scores)){assert.ok(score.rp>=0);assert.ok(score.stability>=0&&score.stability<=10);}
 await act(users[0],'ready',{ready:true});await act(users[0],'start');
 assert.equal(room.status,'PLAYING');assert.equal(room.bonus,null);assert.equal(room.event,null);assert.equal(room.result,null);assert.equal(room.movement,null);
 for(const role of room.match.actorOrder){assert.equal(room.positions[role],0);assert.equal(room.match.turns[role],0);assert.deepEqual(room.match.scores[role],{rp:0,stability:10});}
 assert.equal(room.match.eventHistory.length,0);assert.equal(room.match.usedActionIds.length,0);assert.equal(room.match.responseHistory.length,0);
});

test('last turn on a BONUS tile finishes the match from the roll',async()=>{
 const {service,room,users,act}=await startRoom(2);
 room.match={...room.match,turns:{player:5,bot:6}};service.random=dice(6);
 await act(users[0],'roll');
 assert.equal(room.match.status,'FINISHED');assert.equal(room.status,'FINISHED');assert.equal(room.match.turns.player,6);
});

test('local practice and online room both route landings through landOnTile',async()=>{
 const {readFile}=await import('node:fs/promises');
 const [local,online]=await Promise.all([readFile('./scenario-adventure/app.js','utf8'),readFile('./scenario-adventure/online-rooms.mjs','utf8')]);
 assert.match(local,/landOnTile\(\{match:matchRef\.current,actorId:movedActor,tileIndex:finalIndex\}\)/);assert.doesNotMatch(local,/openBoardEvent/);
 assert.match(online,/landOnTile\(\{match:room\.match,actorId:role,tileIndex:to/);assert.doesNotMatch(online,/openBoardEvent/);
});
