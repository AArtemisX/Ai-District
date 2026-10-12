import test from "node:test";
import assert from "node:assert/strict";
import { buildM6Mission } from "./mission-m6-data.js";
import { createMissionRuntime, evaluateDecision, evaluateKnowledgeCheck, evaluateSimulation, sceneRequirement } from "./mission-player-engine.mjs";

const mission=buildM6Mission({code:"ai-ethics-m6-01"});
test("ภารกิจ ม.6 มี 5 ฉากและหัวข้อครบ",()=>{assert.equal(mission.scenes.length,5);assert.match(mission.title,/AI/);assert.equal(mission.estimatedDuration,15);});
test("Evidence ต้องครบและ Knowledge Check ต้องถูก",()=>{const s=mission.scenes[1],r=createMissionRuntime(mission);r.evidence[s.id].push("a","b","c");assert.equal(sceneRequirement(s,r).ready,false);const x=evaluateKnowledgeCheck(s,"e2");assert.equal(x.correct,true);r.checks[s.id]={selected:"e2",correct:true,attempts:1};assert.equal(sceneRequirement(s,r).ready,true);});
test("Simulation deterministic และต้องทดลองสองครั้ง",()=>{const s=mission.scenes[2],r=createMissionRuntime(mission);const a=evaluateSimulation(s,s.presets[0].values),b=evaluateSimulation(s,s.presets[2].values);assert.ok(b.readiness>a.readiness);r.simulation[s.id].runCount=2;r.checks[s.id]={selected:"s2",correct:true,attempts:1};assert.equal(sceneRequirement(s,r).ready,true);});
test("เลือกทุกมาตรการไม่ถูกประเมินเป็นรอบด้าน",()=>{const s=mission.scenes[3],all=evaluateDecision(s,s.options.map(x=>x.id)),good=evaluateDecision(s,["audit","explain","oversight"]);assert.equal(all.allSelected,true);assert.notEqual(all.level,"รอบด้าน");assert.equal(good.level,"รอบด้าน");});
test("ฉากสรุปเปิด Final Quiz ของ Stage 4",()=>{assert.equal(mission.scenes[4].quizReady,true);});
