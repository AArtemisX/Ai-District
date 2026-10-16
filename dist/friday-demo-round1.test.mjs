import test from "node:test";
import assert from "node:assert/strict";
import {createScenarioAdventureMatch} from "./scenario-adventure/scenario-engine.js";
import {SCENARIO_ADVENTURE_SEED} from "./scenario-adventure/scenario-seed.js";
import {createResponseSelection,resolveScenarioResponse,resolveMatchResponse,chooseBotResponse,determineDemoWinner} from "./scenario-adventure/response-engine.js";
const homework=SCENARIO_ADVENTURE_SEED[0];
function deck(cardId){return {hand:[{instanceId:"owned-1",cardId}],drawPile:[{instanceId:"owned-2",cardId:"patch-update"}],discard:[],pendingInstanceId:null,consumedActionIds:[]};}
for(const [cardId,quality,rp,stability] of [["data-strike","EFFECTIVE",3,0],["energy-boost","PARTIAL",1,-1],["firewall-guard","INEFFECTIVE",0,-2]]){
  test(`${quality} uses existing scenario context with approved scoring`,()=>{
    const hand=deck(cardId);const chosen=createResponseSelection({type:"CARD",scenario:homework,deck:hand,instanceId:"owned-1"});
    const result=resolveScenarioResponse({scenario:homework,actorId:"player",selection:chosen,actionId:"test"}).result;
    assert.equal(result.compatibility,quality);assert.equal(result.rpDelta,rp);assert.equal(result.stabilityDelta,stability);assert.match(result.explanation,/แหล่งที่มา/);
  });
}
test("Basic always works and applies +1 RP/-1 Stability",()=>{
  const chosen=createResponseSelection({type:"BASIC",scenario:homework,deck:deck("unknown")});
  const resolved=resolveMatchResponse({match:createScenarioAdventureMatch(),scenario:homework,actorId:"player",selection:chosen,deck:deck("unknown"),allowedIds:[]});
  assert.deepEqual(resolved.match.scores.player,{rp:1,stability:9});assert.equal(resolved.deck.discard.length,0);
});
test("Double Confirm scores and consumes one card once; forged ownership/hand is rejected",()=>{
  const initial=deck("data-strike");const chosen=createResponseSelection({type:"CARD",scenario:homework,deck:initial,instanceId:"owned-1"});
  const first=resolveMatchResponse({match:createScenarioAdventureMatch(),scenario:homework,actorId:"player",selection:chosen,deck:initial,allowedIds:["data-strike"]});
  const second=resolveMatchResponse({match:first.match,scenario:homework,actorId:"player",selection:chosen,deck:first.deck,allowedIds:["data-strike"]});
  assert.equal(second.duplicate,true);assert.equal(second.match.scores.player.rp,3);assert.equal(second.deck.discard.length,1);assert.equal(second.match.turns.player,1);
  assert.throws(()=>resolveMatchResponse({match:createScenarioAdventureMatch(),scenario:homework,actorId:"player",selection:chosen,deck:initial,allowedIds:[]}),/NOT_ALLOWED/);
  assert.throws(()=>resolveMatchResponse({match:createScenarioAdventureMatch(),scenario:homework,actorId:"player",selection:{...chosen,instanceId:"forged"},deck:initial,allowedIds:["data-strike"]}),/IN_HAND/);
});
test("Stability is clamped to 0–10 and zero is not an immediate loss",()=>{
  const initial=deck("firewall-guard");const chosen=createResponseSelection({type:"CARD",scenario:homework,deck:initial,instanceId:"owned-1"});
  const match=createScenarioAdventureMatch();match.scores.player.stability=1;
  const next=resolveMatchResponse({match,scenario:homework,actorId:"player",selection:chosen,deck:initial,allowedIds:["firewall-guard"]});
  assert.equal(next.match.scores.player.stability,0);assert.equal(next.match.status,"PLAYING");assert.equal(next.result.appliedStabilityDelta,-1);
});
test("Player/Bot use the same resolver; Bot prefers Effective over ineffective",()=>{
  const hand={...deck("firewall-guard"),hand:[{instanceId:"bad",cardId:"firewall-guard"},{instanceId:"good",cardId:"data-strike"}]};
  const chosen=chooseBotResponse({scenario:homework,deck:hand});assert.equal(chosen.instanceId,"good");
  for(const actorId of ["player","bot"]){const result=resolveScenarioResponse({scenario:homework,actorId,selection:chosen,actionId:actorId}).result;assert.equal(result.rpDelta,3);assert.equal(result.stabilityDelta,0);}
});
test("Twelve responses end exactly at six turns each, reject extra Bot actions, and Replay creates clean state",()=>{
  let match=createScenarioAdventureMatch();const hand=deck("patch-update");
  for(let i=0;i<12;i++){
    const actorId=i%2?"bot":"player";const scenario={...homework,scenarioId:`turn-${i}`};
    match={...match,currentTurn:actorId};
    const chosen=createResponseSelection({type:"BASIC",scenario,deck:hand});
    match=resolveMatchResponse({match,scenario,actorId,selection:chosen,deck:hand,allowedIds:[]}).match;
    assert.equal(match.status,i===11?"FINISHED":"PLAYING");
  }
  assert.deepEqual(match.turns,{player:6,bot:6});assert.equal(match.winner,"DRAW");assert.equal(match.responseHistory.length,12);
  assert.equal(resolveMatchResponse({match,scenario:homework,actorId:"bot",selection:{type:"BASIC",usable:true},deck:hand,allowedIds:[]}).duplicate,true);
  const replay=createScenarioAdventureMatch();assert.deepEqual(replay.scores,{player:{rp:0,stability:10},bot:{rp:0,stability:10}});assert.deepEqual(replay.turns,{player:0,bot:0});assert.deepEqual(replay.usedActionIds,[]);assert.deepEqual(replay.scenarioHistory,[]);assert.deepEqual(replay.responseHistory,[]);
});
test("Winner uses RP then Stability then Draw",()=>{
  assert.equal(determineDemoWinner({player:{rp:8,stability:0},bot:{rp:7,stability:10}}),"player");
  assert.equal(determineDemoWinner({player:{rp:8,stability:4},bot:{rp:8,stability:5}}),"bot");
  assert.equal(determineDemoWinner({player:{rp:8,stability:5},bot:{rp:8,stability:5}}),"DRAW");
});
