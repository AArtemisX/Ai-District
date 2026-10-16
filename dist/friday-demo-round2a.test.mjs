import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIO_ADVENTURE_SEED as seed} from './scenario-adventure/scenario-seed.js';
import {createScenarioRepository,validateAdventureScenario} from './scenario-adventure/scenario-repository.js';
import {createScenarioAdventureMatch,selectAdventureScenario,recordScenarioUse,contentSignature} from './scenario-adventure/scenario-engine.js';
import {createResponseSelection,resolveMatchResponse,evaluateCardCompatibility} from './scenario-adventure/response-engine.js';
import {SCENARIO_CATEGORIES} from './scenario-adventure/theme-config.js';
const categories=Object.values(SCENARIO_CATEGORIES);
const deck={hand:[],drawPile:[],discard:[],consumedActionIds:[]};
test('24 distinct contexts, stable IDs/identities/text and complete reviewed-or-draft schema',()=>{
 assert.equal(seed.length,24);assert.equal(seed.filter(s=>s.status==='DEMO_DRAFT').length,16);
 for(const key of ['scenarioId','contentIdentity','description']) assert.equal(new Set(seed.map(s=>s[key])).size,24);
 assert.ok(seed.every(validateAdventureScenario));assert.equal(new Set(seed.map(contentSignature)).size,24);
 const topics=new Set(seed.flatMap(s=>s.topics || []));
 for(const topic of ['AI Literacy','Privacy','Security','Safety','Fairness','Data Bias','Transparency','Explainability','Human Oversight','Accountability','Governance','Misinformation']) assert.ok(topics.has(topic),topic);
});
for(const [name,sequence] of [['privacy x12',Array(12).fill('PRIVACY')],['safety x12',Array(12).fill('SAFETY')],['mixed',Array.from({length:12},(_,i)=>categories[i%categories.length])],['fairness / transparency',Array.from({length:12},(_,i)=>i%2?'FAIRNESS':'TRANSPARENCY')]]){
 test(`12 shared Player/Bot responses without repetition: ${name}`,async()=>{
  let match=createScenarioAdventureMatch();const repository=createScenarioRepository();
  for(let i=0;i<12;i++){
   const actorId=i%2?'bot':'player';match={...match,currentTurn:actorId};
   const scenario=await selectAdventureScenario({repository,category:sequence[i],history:match.scenarioHistory,random:()=>i%3/3});
   assert.equal(scenario.isFallback,undefined);
   match={...match,scenarioHistory:recordScenarioUse(match.scenarioHistory,{scenario,actorId,turnNumber:i+1})};
   const selection=createResponseSelection({type:'BASIC',scenario,deck});
   match=resolveMatchResponse({match,scenario,actorId,selection,deck,allowedIds:[]}).match;
   assert.equal(match.status,i===11?'FINISHED':'PLAYING');
  }
  for(const key of ['scenarioId','contentIdentity','contentSignature']) assert.equal(new Set(match.scenarioHistory.map(r=>r[key])).size,12);
  assert.equal(match.scenarioHistory.filter(r=>r.actorId==='player').length,6);
  assert.equal(match.scenarioHistory.filter(r=>r.actorId==='bot').length,6);
  assert.deepEqual(match.scores,{player:{rp:6,stability:4},bot:{rp:6,stability:4}});assert.equal(match.winner,'DRAW');
  const replay=createScenarioAdventureMatch();assert.deepEqual(replay.scenarioHistory,[]);
  const first=await selectAdventureScenario({repository,history:replay.scenarioHistory,random:()=>0});assert.ok(first);
 });
}
test('new IDs cannot disguise same identity or unchanged text; generic fallback excluded',async()=>{
 const scenario=seed[0];const history=recordScenarioUse([],{scenario,actorId:'player'});
 for(const variant of [{...scenario,scenarioId:'renamed',title:'new place'},{...scenario,scenarioId:'renamed',contentIdentity:'forged',title:'new name'}]){
  assert.throws(()=>recordScenarioUse(history,{scenario:variant,actorId:'bot'}),/already been used/);
  await assert.rejects(selectAdventureScenario({repository:createScenarioRepository({scenarios:[variant]}),history,category:scenario.category}),{code:'SCENARIO_POOL_EXHAUSTED'});
 }
 await assert.rejects(selectAdventureScenario({repository:createScenarioRepository({scenarios:[{...scenario,isFallback:true}]}),category:scenario.category}),{code:'SCENARIO_POOL_EXHAUSTED'});
});
test('Basic works for all 24 contexts; compatibility is explicit, not overlapping tags',()=>{
 for(const scenario of seed){
  assert.equal(createResponseSelection({type:'BASIC',scenario,deck}).usable,true);
  const rule=scenario.compatibilityRules;
  for(const id of rule.effective) assert.equal(evaluateCardCompatibility(scenario,id).compatibility,'EFFECTIVE');
  for(const id of rule.partial) assert.equal(evaluateCardCompatibility(scenario,id).compatibility,'PARTIAL');
  assert.equal(evaluateCardCompatibility(scenario,'locked-prototype').usable,false);
 }
 const scenario=seed.find(s=>s.scenarioId==='adventure-fabricated-citations');
 assert.equal(evaluateCardCompatibility({...scenario,cardTags:['HUMAN_REVIEW','VERIFY']},'energy-boost').compatibility,'INEFFECTIVE');
});
