import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createScenarioAdventureMatch} from './scenario-adventure/scenario-engine.js';
import {createDeckState} from './scenario-adventure/deck-engine.js';
import {EVENT_CATALOG,chooseEventIntent,openBoardEvent,resolveBoardEvent} from './scenario-adventure/board-events.js';
import {OnlineRooms} from './scenario-adventure/online-rooms.mjs';

const instance=(cardId,id=cardId)=>({cardId,instanceId:`bot:${id}`});
const deck=(cards=[])=>({hand:cards,drawPile:[],discard:[],pendingInstanceId:null,consumedActionIds:[]});
const matchWith=({stability=10,rp=0,opponentRp=0,turns=0}={})=>({
 ...createScenarioAdventureMatch(),
 scores:{player:{rp:opponentRp,stability:10},bot:{rp,stability}},
 turns:{player:0,bot:turns},currentTurn:'bot',
});
const event=(type,contentId=type==='ACTION'?'bot-policy':EVENT_CATALOG[type][0].id)=>({type,contentId,actorId:'bot'});
const scenario={scenarioId:'bot-policy',contentIdentity:'bot-policy',cardTags:['PRIVACY'],compatibilityRules:{effective:['firewall-guard','access-denied'],partial:['patch-update'],reason:'test'},basicResponse:{description:'basic',explanation:'basic'}};

test('ACTION selects only legal in-hand cards and prefers Effective over Basic',()=>{
 const hand=deck([instance('firewall-guard'),instance('access-denied'),instance('patch-update')]);
 const chosen=chooseEventIntent({event:event('ACTION'),scenario,deck:hand,allowedIds:['firewall-guard','patch-update'],match:matchWith(),actorId:'bot'});
 assert.deepEqual(chosen,{responseType:'CARD',instanceId:'bot:firewall-guard'});
});

test('ACTION keeps Basic instead of spending Partial or Ineffective cards',()=>{
 for(const cardId of ['patch-update','energy-boost']){
  const chosen=chooseEventIntent({event:event('ACTION'),scenario,deck:deck([instance(cardId)]),allowedIds:[cardId],match:matchWith({stability:2}),actorId:'bot'});
  assert.deepEqual(chosen,{responseType:'BASIC'});
 }
});

test('RISK spends a compatible owned Effective card but not a Partial or disallowed card',()=>{
 const risk=event('RISK','sensitive-export');
 const riskScenario={...EVENT_CATALOG.RISK.find(item=>item.id===risk.contentId),scenarioId:'risk:test',basicResponse:{description:'accept',explanation:'accept'}};
 assert.equal(chooseEventIntent({event:risk,scenario:riskScenario,deck:deck([instance('firewall-guard')]),allowedIds:['firewall-guard'],match:matchWith(),actorId:'bot'}).responseType,'CARD');
 assert.deepEqual(chooseEventIntent({event:risk,scenario:riskScenario,deck:deck([instance('secure-backup')]),allowedIds:['secure-backup'],match:matchWith(),actorId:'bot'}),{choiceId:'accept'});
 assert.deepEqual(chooseEventIntent({event:risk,scenario:riskScenario,deck:deck([instance('firewall-guard')]),allowedIds:[],match:matchWith(),actorId:'bot'}),{choiceId:'accept'});
});

test('SUPPORT restores low Stability and avoids wasted healing at cap',()=>{
 assert.deepEqual(chooseEventIntent({event:event('SUPPORT'),deck:deck(),match:matchWith({stability:3}),actorId:'bot'}),{choiceId:'restore'});
 assert.deepEqual(chooseEventIntent({event:event('SUPPORT'),deck:deck(),match:matchWith({stability:10}),actorId:'bot'}),{choiceId:'report'});
});

test('SUPPORT uses RP lead and remaining turns at Stability 8-9',()=>{
 assert.deepEqual(chooseEventIntent({event:event('SUPPORT'),deck:deck(),match:matchWith({stability:9,rp:4,opponentRp:2}),actorId:'bot'}),{choiceId:'restore'});
 assert.deepEqual(chooseEventIntent({event:event('SUPPORT'),deck:deck(),match:matchWith({stability:9,rp:1,opponentRp:4,turns:1}),actorId:'bot'}),{choiceId:'report'});
 assert.deepEqual(chooseEventIntent({event:event('SUPPORT'),deck:deck(),match:matchWith({stability:9,rp:1,opponentRp:4,turns:4}),actorId:'bot'}),{choiceId:'restore'});
});

test('DECISION trades RP and Stability from current score and remaining turns',()=>{
 assert.deepEqual(chooseEventIntent({event:event('DECISION'),deck:deck(),match:matchWith({stability:2}),actorId:'bot'}),{choiceId:'review'});
 assert.deepEqual(chooseEventIntent({event:event('DECISION'),deck:deck(),match:matchWith({stability:10,rp:1,opponentRp:4}),actorId:'bot'}),{choiceId:'pilot'});
 assert.deepEqual(chooseEventIntent({event:event('DECISION'),deck:deck(),match:matchWith({stability:9,rp:5,opponentRp:3,turns:4}),actorId:'bot'}),{choiceId:'review'});
});

test('MOVEMENT is deterministic, uses visible deltas only, and preserves current Rule A preference',()=>{
 const input={event:event('MOVEMENT'),deck:deck(),match:matchWith(),actorId:'bot',futureRoll:()=>{throw Error('FUTURE_READ');}};
 assert.deepEqual(chooseEventIntent(input),{choiceId:'review'});
 assert.deepEqual(chooseEventIntent(input),chooseEventIntent(input));
});

test('equal Effective cards use predictable instance-id tie-break',()=>{
 const hand=deck([instance('access-denied','z'),instance('firewall-guard','a')]);
 const chosen=chooseEventIntent({event:event('ACTION'),scenario,deck:hand,allowedIds:['access-denied','firewall-guard'],match:matchWith(),actorId:'bot'});
 assert.equal(chosen.instanceId,'bot:a');
});

test('Local and Online callers pass authoritative match context to the same helper',async()=>{
 const [local,online]=await Promise.all([readFile('./scenario-adventure/app.js','utf8'),readFile('./scenario-adventure/online-rooms.mjs','utf8')]);
 assert.match(local,/chooseEventIntent\(\{[^}]*match:matchRef\.current[^}]*actorId:"bot"/);
 assert.match(online,/chooseEventIntent\(\{[^}]*match:room\.match[^}]*actorId:member\.role/);
});

test('resolved bot card action consumes once and duplicate resolve changes no score or turn',async()=>{
 let match=matchWith({stability:6});
 const opened=await openBoardEvent({match,actorId:'bot',tileIndex:1,type:'RISK',random:()=>0.99});
 match=opened.match;
 const botDeck=createDeckState(['firewall-guard'],{actorId:'bot',matchId:'policy',random:()=>0});
 const intent=chooseEventIntent({event:opened.event,scenario:opened.scenario,deck:botDeck,allowedIds:['firewall-guard'],match,actorId:'bot'});
 const first=resolveBoardEvent({match,event:opened.event,scenario:opened.scenario,actorId:'bot',deck:botDeck,allowedIds:['firewall-guard'],intent,position:1});
 assert.equal(first.deck.discard.length,1);
 assert.equal(first.match.turns.bot,1);
 const score=structuredClone(first.match.scores.bot);
 const second=resolveBoardEvent({match:first.match,event:opened.event,scenario:opened.scenario,actorId:'bot',deck:first.deck,allowedIds:['firewall-guard'],intent,position:first.position});
 assert.equal(second.duplicate,true);
 assert.deepEqual(second.match.scores.bot,score);
 assert.equal(second.match.turns.bot,1);
 assert.equal(second.deck.discard.length,1);
});

for(const seats of [2,3,4])test(`refined server bots finish and replay a ${seats}-seat online match`,async()=>{
 let now=1_000_000;
 const owner={id:`policy-owner-${seats}`};
 const inventory={allowedIds:['patch-update','firewall-guard','energy-boost']};
 const setup={characterId:'milo',cardIds:['patch-update','firewall-guard','energy-boost','patch-update','firewall-guard'],maxPlayers:seats,botCount:seats-1};
 const service=new OnlineRooms({random:()=>0,now:()=>now});
 const created=service.create(owner,setup,inventory);
 const room=service.get(created.code,owner.id);
 const act=(type,extra={})=>service.act(owner,room.code,{revision:room.revision,type,...extra});
 await act('ready',{ready:true});
 await act('start');
 for(let guard=0;guard<400&&room.status==='PLAYING';guard+=1){
  if(room.match.currentTurn==='player'){
   if(room.phase==='WAITING')await act('roll');
   else if(room.phase==='RESPONSE_SELECTION')await act('respond',chooseEventIntent({event:room.event,scenario:room.scenario,deck:room.decks.player,allowedIds:inventory.allowedIds,match:room.match,actorId:'player'}));
   else await act('continue');
  }else{
   now+=100_000;
   await service.tickBots();
  }
 }
 assert.equal(room.status,'FINISHED');
 assert.equal(room.match.responseHistory.length,seats*6);
 assert.ok(Object.values(room.match.turns).every(turns=>turns===6));
 for(const member of room.members.filter(item=>!item.isBot))await act('ready',{ready:true});
 await act('start');
 assert.equal(room.match.responseHistory.length,0);
 assert.ok(Object.values(room.match.turns).every(turns=>turns===0));
});
