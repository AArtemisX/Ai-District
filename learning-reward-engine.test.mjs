import test from "node:test";
import assert from "node:assert/strict";
import { REWARD_STATUSES, cardAccessState, normalizeLoadout, rewardMissionState } from "./learning-reward-engine.mjs";

const cards=[
  {id:"patch-update",is_starter:true,unlocked:false},
  {id:"firewall-guard",is_starter:true,unlocked:false},
  {id:"energy-boost",is_starter:true,unlocked:false},
  {id:"access-denied",is_starter:false,unlocked:true},
  {id:"system-crash",is_starter:false,unlocked:false},
];

test("locked, unlocked, starter and equipped states stay distinct",()=>{
  assert.equal(cardAccessState(cards[4],new Set(),new Set()),REWARD_STATUSES.LOCKED);
  assert.equal(cardAccessState(cards[3],new Set(["access-denied"]),new Set()),REWARD_STATUSES.UNLOCKED);
  assert.equal(cardAccessState(cards[0],new Set(),new Set()),REWARD_STATUSES.AVAILABLE_IN_BATTLE);
  assert.equal(cardAccessState(cards[3],new Set(["access-denied"]),new Set(["access-denied"])),REWARD_STATUSES.EQUIPPED);
});

test("loadout accepts unlocked cards, rejects locked cards and stays at three",()=>{
  assert.deepEqual(normalizeLoadout(["access-denied","system-crash","patch-update"],cards),["access-denied","patch-update","firewall-guard"]);
});

test("learning states do not treat mission completion as reward unlock",()=>{
  assert.deepEqual(rewardMissionState({mission_completed_at:"now",quiz_passed_at:null},false),{missionCompleted:true,quizPassed:false,rewardUnlocked:false});
});
