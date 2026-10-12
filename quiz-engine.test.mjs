import test from "node:test";import assert from "node:assert/strict";import {attemptStats,evaluateForTest,missingQuestionIds,percentage} from "./quiz-engine.mjs";
const questions=Array.from({length:10},(_,i)=>({id:`q${i+1}`,learning_objective_id:`LO${Math.min(4,Math.floor(i/3)+1)}`})),keys=Object.fromEntries(questions.map(q=>[q.id,["a"]]));
const answers=n=>Object.fromEntries(questions.map((q,i)=>[q.id,[i<n?"a":"b"]]));
test("7/10 ไม่ผ่าน, 8/10 และ 10/10 ผ่าน",()=>{assert.equal(evaluateForTest(questions,answers(7),keys).passed,false);assert.equal(evaluateForTest(questions,answers(8),keys).passed,true);assert.equal(evaluateForTest(questions,answers(10),keys).passed,true);});
test("ตรวจคำตอบที่ยังไม่ครบ",()=>{assert.deepEqual(missingQuestionIds(questions,answers(7)),[]);const a=answers(10);delete a.q4;assert.deepEqual(missingQuestionIds(questions,a),["q4"]);});
test("คะแนนล่าสุด คะแนนสูงสุด และสถานะผ่านไม่ถอยหลัง",()=>{const s=attemptStats([{score:9,passed:true,submitted_at:"2026-01-01"},{score:6,passed:false,submitted_at:"2026-02-01"}]);assert.equal(s.latest.score,6);assert.equal(s.best.score,9);assert.equal(s.everPassed,true);assert.equal(percentage(8,10),80);});
