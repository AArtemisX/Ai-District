import {TILE_POSITIONS,normalizeTileIndex} from '../map-3d/board-data.js';
import {selectAdventureScenario,recordScenarioUse} from './scenario-engine.js';
import {createScenarioRepository} from './scenario-repository.js';
import {createResponseSelection,resolveMatchResponse,commitMatchResult,evaluateCardCompatibility,DEMO_MATCH_CONFIG,RESPONSE_TYPES} from './response-engine.js';
export const EVENT_TYPES=['ACTION','BONUS','SUPPORT','RISK','DECISION'];
// Board rules v2 (owner-approved 16 Oct 2026): 32 path tiles = 12 ACTION, 8 BONUS, 4 SUPPORT, 4 RISK, 4 DECISION.
// BONUS tiles resolve instantly with no choice; the kind of each BONUS tile is in TILE_BONUS_KINDS.
export const TILE_EVENT_TYPES=Object.freeze(['ACTION','ACTION','BONUS','ACTION','RISK','DECISION','BONUS','ACTION','SUPPORT','ACTION','BONUS','SUPPORT','ACTION','DECISION','BONUS','ACTION','RISK','ACTION','BONUS','SUPPORT','DECISION','ACTION','BONUS','RISK','ACTION','SUPPORT','BONUS','DECISION','ACTION','ACTION','BONUS','RISK']);
if(TILE_EVENT_TYPES.length!==TILE_POSITIONS.length)throw Error('EVENT_MAPPING_MISMATCH');
export const BONUS_KINDS=Object.freeze(['FORWARD_2','RP_PLUS_1','STABILITY_PLUS_1','REST']);
// One BONUS tile every 4 tiles; FORWARD_2 tiles are 16 apart and always land on a scenario tile.
export const TILE_BONUS_KINDS=Object.freeze({2:'FORWARD_2',6:'RP_PLUS_1',10:'STABILITY_PLUS_1',14:'REST',18:'FORWARD_2',22:'RP_PLUS_1',26:'STABILITY_PLUS_1',30:'REST'});
if(Object.keys(TILE_BONUS_KINDS).some(i=>TILE_EVENT_TYPES[i]!=='BONUS')||TILE_EVENT_TYPES.filter(t=>t==='BONUS').length!==Object.keys(TILE_BONUS_KINDS).length)throw Error('BONUS_MAPPING_MISMATCH');
export const EVENT_CONFIG=Object.freeze({bonusMove:2,bonusRP:1,bonusStability:1,supportRP:1,supportStability:1,riskRP:1,riskStability:-1,decisionFastRP:2,decisionFastStability:-1,decisionReviewRP:1});
export const BONUS_CONFIG=Object.freeze({
 FORWARD_2:Object.freeze({kind:'FORWARD_2',steps:EVENT_CONFIG.bonusMove,rp:0,stability:0,label:'เดินหน้า 2 ช่อง',title:'ช่องโบนัส: เดินหน้า 2 ช่อง',explanation:'ทางลัดที่ตรวจสอบแล้ว พาคุณเดินหน้าอีก 2 ช่อง'}),
 RP_PLUS_1:Object.freeze({kind:'RP_PLUS_1',steps:0,rp:EVENT_CONFIG.bonusRP,stability:0,label:'RP +1',title:'ช่องโบนัส: RP +1',explanation:'แบ่งปันความรู้ AI ให้ทีม ได้รับ RP +1'}),
 STABILITY_PLUS_1:Object.freeze({kind:'STABILITY_PLUS_1',steps:0,rp:0,stability:EVENT_CONFIG.bonusStability,label:'Stability +1',title:'ช่องโบนัส: Stability +1',explanation:'ทีมได้พักและทบทวนระบบ Stability +1 (สูงสุด 10)'}),
 REST:Object.freeze({kind:'REST',steps:0,rp:0,stability:0,label:'พักเติมพลัง',title:'ช่องโบนัส: พักเติมพลัง',explanation:'จุดพักผ่อน ไม่มีอะไรเกิดขึ้นในเทิร์นนี้'}),
});
const choice=(id,label,rp,stability,explanation,steps=0)=>({id,label,rp,stability,explanation,steps});
export const EVENT_CATALOG={
 SUPPORT:[{id:'citizen-help',title:'ทีมสนับสนุนประชาชน',description:'ทีมงานมีทรัพยากรช่วยคุณได้หนึ่งด้าน'},{id:'audit-resources',title:'ทรัพยากรการตรวจสอบ',description:'ได้รับเวลาสำหรับเสริมความพร้อมหรือทำรายงาน'}].map(e=>({...e,choices:[choice('report','ทำรายงาน · RP +1',EVENT_CONFIG.supportRP,0,'สื่อสารข้อมูลให้ผู้เกี่ยวข้องตรวจสอบ'),choice('restore','ทบทวนความพร้อม · Stability +1',0,EVENT_CONFIG.supportStability,'เพิ่มความพร้อมของกระบวนการ สูงสุด 10')] })),
 RISK:[{id:'unverified-source',title:'แหล่งข้อมูลยังไม่ยืนยัน',description:'ข้อมูลถูกส่งต่อก่อนตรวจสอบแหล่งที่มา',cardTags:['VERIFY','AUDIT'],compatibilityRules:{effective:['data-strike'],partial:['secure-backup','lag-pulse'],reason:'ต้องตรวจแหล่งที่มาและหลักฐานก่อนใช้ข้อมูล'}},{id:'sensitive-export',title:'ข้อมูลอ่อนไหวกำลังถูกส่งออก',description:'พบคำขอส่งข้อมูลที่ยังไม่ได้จำกัดสิทธิ์เข้าถึง',cardTags:['PRIVACY','SAFETY'],compatibilityRules:{effective:['firewall-guard','access-denied'],partial:['secure-backup'],reason:'ต้องจำกัดการเข้าถึงและทบทวนสิทธิ์ก่อนส่งข้อมูล'}}].map(e=>({...e,choices:[choice('accept','ทำงานต่อพร้อมรับความเสี่ยง · RP +1 / Stability -1',EVENT_CONFIG.riskRP,EVENT_CONFIG.riskStability,'ยังทำงานต่อได้ แต่ความเสี่ยงที่ไม่แก้ไขลดความมั่นคงของกระบวนการ')]})),
 DECISION:[{id:'pilot-oversight',title:'ขยายระบบหรือทบทวนก่อน',description:'โครงการพร้อมขยาย แต่ยังมีข้อจำกัดด้านการกำกับดูแล'},{id:'public-explanation',title:'รายงานผลให้สาธารณะ',description:'ต้องตัดสินใจระหว่างรายงานเร็วกับใช้เวลาทบทวนคำอธิบาย'}].map(e=>({...e,choices:[choice('pilot','เดินหน้าทดลองพร้อมรับภาระตรวจภายหลัง · RP +2 / Stability -1',EVENT_CONFIG.decisionFastRP,EVENT_CONFIG.decisionFastStability,'การทดลองมีประโยชน์ แต่ต้องติดตามผลและรับผิดชอบความเสี่ยง'),choice('review','ทบทวนก่อน · RP +1 / Stability ไม่ลด',EVENT_CONFIG.decisionReviewRP,0,'ใช้เวลาตรวจความเป็นธรรมและคำอธิบายเพื่อรักษาความพร้อม')]}))
};
export const eventTypeForTile=index=>TILE_EVENT_TYPES[normalizeTileIndex(index)];
export const bonusKindForTile=index=>TILE_BONUS_KINDS[normalizeTileIndex(index)]||null;
export function bonusPath(from,steps){if(!Number.isInteger(steps)||Math.abs(steps)>2)throw Error('INVALID_BONUS_MOVEMENT');return Array.from({length:Math.abs(steps)},(_,i)=>normalizeTileIndex(from+Math.sign(steps)*(i+1)));}
export async function openBoardEvent({match,actorId,tileIndex,random=Math.random,type=eventTypeForTile(tileIndex)}){
 if(match.status!=='PLAYING'||match.currentTurn!==actorId)throw Error('INVALID_TURN');
 if(type==='BONUS')throw Error('BONUS_TILE_HAS_NO_EVENT');
 const turn=match.turns[actorId]+1,id=`${actorId}:${turn}:${tileIndex}`;
 if((match.eventHistory||[]).some(e=>e.actorId===actorId&&e.turn===turn))throw Error('EVENT_ALREADY_OPENED');
 let scenario=null,content;
 if(type==='ACTION'){scenario=await selectAdventureScenario({repository:createScenarioRepository(),themeId:match.themeId,tileIndex,history:match.scenarioHistory,random});content=scenario;}
 else{const pool=EVENT_CATALOG[type];if(!pool)throw Error('INVALID_EVENT_TYPE');const last=(match.eventHistory||[]).at(-1)?.contentId;const available=pool.filter(e=>e.id!==last);content=available[Math.min(available.length-1,Math.max(0,Math.floor(random()*available.length)))];if(type==='RISK')scenario={...content,scenarioId:`risk:${id}`,contentIdentity:content.id,basicResponse:{label:'รับความเสี่ยงและทำงานต่อ',description:'RP +1 / Stability -1',explanation:content.choices[0].explanation}};}
 const event={status:type==='ACTION'?scenario.status:'DEMO_DRAFT',id,actorId,turn,tileIndex,type,contentId:content.scenarioId||content.id,title:content.title,description:content.description,choices:content.choices||[]};
 const next={...match,eventHistory:[...(match.eventHistory||[]),{...event,resolved:false}],scenarioHistory:type==='ACTION'?recordScenarioUse(match.scenarioHistory,{scenario,actorId,tileIndex,turnNumber:turn}):match.scenarioHistory};
 return {match:next,event,scenario};
}
// Rule A' (v2): one landing per turn. Scenario tiles open their event; BONUS tiles apply instantly.
// FORWARD_2 moves +2 along the real path; a scenario destination opens once and becomes this turn's event,
// another BONUS destination does not chain. Passing START grants nothing. The bonus counts as the actor's turn.
export async function landOnTile({match,actorId,tileIndex,random=Math.random,eventType=eventTypeForTile,bonusKind=bonusKindForTile}){
 if(match.status!=='PLAYING'||match.currentTurn!==actorId||match.turns[actorId]>=match.maxTurnsPerActor)throw Error('INVALID_TURN');
 const type=eventType(tileIndex);
 if(type!=='BONUS'){const opened=await openBoardEvent({match,actorId,tileIndex,random,type});return {...opened,bonus:null,bonusPath:[],position:tileIndex,result:null};}
 const config=BONUS_CONFIG[bonusKind(tileIndex)];if(!config)throw Error('INVALID_BONUS_TILE');
 const turn=match.turns[actorId]+1,id=`${actorId}:${turn}:${tileIndex}`;
 if((match.eventHistory||[]).some(e=>e.actorId===actorId&&e.turn===turn))throw Error('EVENT_ALREADY_OPENED');
 const path=config.steps?bonusPath(tileIndex,config.steps):[],position=path.at(-1)??tileIndex;
 const destinationType=path.length?eventType(position):null;
 const bonus={kind:config.kind,tileIndex,label:config.label,title:config.title,explanation:config.explanation,destination:path.length?position:null,chainStopped:destinationType==='BONUS'};
 if(destinationType&&destinationType!=='BONUS'){
  const opened=await openBoardEvent({match,actorId,tileIndex:position,random,type:destinationType});
  const event={...opened.event,viaBonus:bonus};
  return {match:{...opened.match,eventHistory:opened.match.eventHistory.map(e=>e.id===event.id?{...e,viaBonus:bonus}:e)},event,scenario:opened.scenario,bonus,bonusPath:path,position,result:null};
 }
 const explanation=bonus.chainStopped?`${config.explanation} · ถึงช่องโบนัสอีกช่อง จึงไม่เปิดโบนัสต่อ`:config.explanation;
 const event={status:'FINAL',id,actorId,turn,tileIndex,type:'BONUS',contentId:config.kind,bonusKind:config.kind,title:config.title,description:explanation,choices:[]};
 const committed=commitMatchResult({match,actorId,deck:null,actionId:'bonus:'+id,result:{actorId,status:'RESOLVED',responseType:'BONUS',compatibility:'BONUS',bonusKind:config.kind,rpDelta:config.rp,stabilityDelta:config.stability,explanation,impact:config.label,eventId:id,eventType:'BONUS'}});
 if(committed.duplicate)throw Error('EVENT_ALREADY_OPENED');
 return {match:{...committed.match,eventHistory:[...(committed.match.eventHistory||[]),{...event,resolved:true}]},event,scenario:null,bonus,bonusPath:path,position,result:committed.result};
}
export function resolveBoardEvent({match,event,scenario,actorId,deck,allowedIds,intent,position}){
 if(['rp','rpDelta','stability','stabilityDelta','position','positions','tileIndex','event','score','scores'].some(key=>Object.hasOwn(intent,key)))throw Error('INVALID_EVENT_INTENT');
 const record=(match.eventHistory||[]).find(e=>e.id===event?.id);
 if(!record||record.actorId!==actorId||event.actorId!==actorId)throw Error('INVALID_EVENT');
 if(record.resolved)return {duplicate:true,match,deck,result:null,position};
 if(event.type==='BONUS')throw Error('BONUS_TILE_HAS_NO_EVENT');
 if(match.currentTurn!==actorId||match.turns[actorId]+1!==event.turn)throw Error('INVALID_TURN');
 let resolved;
 if(event.type==='ACTION'||(event.type==='RISK'&&intent.responseType==='CARD')){
  if(event.type==='ACTION'&&!['BASIC','CARD'].includes(intent.responseType))throw Error('INVALID_RESPONSE_TYPE');
  const selection=createResponseSelection({type:intent.responseType,scenario,deck,instanceId:intent.instanceId});
  resolved=resolveMatchResponse({match,scenario,actorId,selection,deck,allowedIds});
 }else{
  if(intent.responseType||intent.instanceId)throw Error('EVENT_CHOICE_REQUIRED');
  const definition=EVENT_CATALOG[event.type]?.find(e=>e.id===event.contentId),selected=definition?.choices.find(c=>c.id===intent.choiceId);if(!selected)throw Error('INVALID_EVENT_CHOICE');
  resolved=commitMatchResult({match,actorId,deck,actionId:'event:'+event.id,result:{actorId,status:'RESOLVED',responseType:'EVENT',compatibility:event.type,rpDelta:selected.rp,stabilityDelta:selected.stability,explanation:selected.explanation,impact:selected.label,choiceId:selected.id}});
 }
 const result={...resolved.result,eventId:event.id,eventType:event.type};
 const next={...resolved.match,eventHistory:resolved.match.eventHistory.map(e=>e.id===event.id?{...e,resolved:true,choiceId:intent.choiceId||null}:e),responseHistory:[...resolved.match.responseHistory.slice(0,-1),result]};
 return {...resolved,match:next,result,path:[],position};
}
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const BOT_CARD_OPPORTUNITY_COST=25;

export function botDecisionContext({match,actorId}){
 const own=match?.scores?.[actorId]||{rp:0,stability:DEMO_MATCH_CONFIG.initialStability};
 const opponents=Object.entries(match?.scores||{}).filter(([id])=>id!==actorId).map(([,score])=>score.rp);
 const bestOpponentRP=opponents.length?Math.max(...opponents):0;
 const maxTurns=match?.maxTurnsPerActor||DEMO_MATCH_CONFIG.maxTurnsPerActor;
 const turnsTaken=match?.turns?.[actorId]||0;
 return {rp:own.rp,stability:own.stability,bestOpponentRP,rpGap:own.rp-bestOpponentRP,remainingTurns:Math.max(0,maxTurns-turnsTaken)};
}

function utility(delta,context,{usesCard=false}={}){
 const appliedStability=clamp(context.stability+delta.stability,0,DEMO_MATCH_CONFIG.maximumStability)-context.stability;
 const stabilityWeight=context.stability<=3?140:context.stability<=7?75:context.rpGap>0&&context.remainingTurns<=2?65:25;
 const rpWeight=context.rpGap<0?120:context.rpGap>0&&context.remainingTurns<=2?90:100;
 return delta.rp*rpWeight+appliedStability*stabilityWeight-(usesCard?BOT_CARD_OPPORTUNITY_COST:0);
}

function bestCandidate(candidates){
 return [...candidates].sort((a,b)=>b.utility-a.utility||Number(a.usesCard)-Number(b.usesCard)||a.key.localeCompare(b.key))[0];
}

function cardCandidates({scenario,deck,allowedIds,context}){
 return (deck?.hand||[]).filter(instance=>allowedIds?.includes(instance.cardId)).map(instance=>{
  const evaluation=evaluateCardCompatibility(scenario,instance.cardId);
  if(!evaluation.usable)return null;
  const delta=DEMO_MATCH_CONFIG.scoring[evaluation.compatibility];
  return {key:`card:${instance.instanceId}`,usesCard:true,utility:utility(delta,context,{usesCard:true}),intent:{responseType:RESPONSE_TYPES.CARD,instanceId:instance.instanceId}};
 }).filter(Boolean);
}

export function chooseEventIntent({event,scenario,deck,allowedIds=[],match=null,actorId=event?.actorId}){
 // BONUS tiles resolve on landing, so there is nothing to choose; a FORWARD_2 destination event arrives as its own type.
 if(event?.type==='BONUS')return null;
 const context=botDecisionContext({match,actorId});
 if(event.type==='ACTION'||event.type==='RISK'){
  const riskDefinition=event.type==='RISK'?EVENT_CATALOG.RISK.find(item=>item.id===event.contentId):null;
  const riskChoice=riskDefinition?bestCandidate(riskDefinition.choices.map(item=>({key:item.id,usesCard:false,utility:utility(item,context),intent:{choiceId:item.id},delta:item}))):null;
  const fallback=event.type==='ACTION'
   ?{key:'basic',usesCard:false,utility:utility(DEMO_MATCH_CONFIG.scoring.BASIC,context),intent:{responseType:RESPONSE_TYPES.BASIC}}
   :riskChoice;
  if(!fallback)throw Error('INVALID_EVENT_CONTENT');
  return bestCandidate([fallback,...cardCandidates({scenario,deck,allowedIds,context})]).intent;
 }
 const definition=EVENT_CATALOG[event.type]?.find(item=>item.id===event.contentId);
 if(!definition)throw Error('INVALID_EVENT_CONTENT');
 const choices=definition.choices;
 if(event.type==='SUPPORT'){
  const recovery=bestCandidate(choices.filter(item=>item.stability>0).map(item=>({key:item.id,usesCard:false,utility:item.stability,intent:{choiceId:item.id}})));
  const reward=bestCandidate(choices.filter(item=>item.rp>0).map(item=>({key:item.id,usesCard:false,utility:item.rp,intent:{choiceId:item.id}})));
  const shouldRecover=context.stability<=7||(context.stability<DEMO_MATCH_CONFIG.maximumStability&&(context.rpGap>0||context.remainingTurns<=2));
  return (shouldRecover?recovery:reward).intent;
 }
 if(event.type==='DECISION'){
  const safer=bestCandidate(choices.map(item=>({key:item.id,usesCard:false,utility:item.stability*100+item.rp,intent:{choiceId:item.id}})));
  const reward=bestCandidate(choices.map(item=>({key:item.id,usesCard:false,utility:item.rp*100+item.stability,intent:{choiceId:item.id}})));
  return (context.stability<=3||(context.remainingTurns<=2&&context.rpGap>0)?safer:reward).intent;
 }
 return bestCandidate(choices.map(item=>({key:item.id,usesCard:false,utility:utility(item,context),intent:{choiceId:item.id}}))).intent;
}
export function eventSummary(match){return EVENT_TYPES.map(type=>`${type}: ${(match.eventHistory||[]).filter(e=>e.resolved&&e.type===type).length}`).join(' · ');}
