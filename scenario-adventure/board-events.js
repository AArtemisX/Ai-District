import {TILE_POSITIONS,normalizeTileIndex} from '../map-3d/board-data.js';
import {selectAdventureScenario,recordScenarioUse} from './scenario-engine.js';
import {createScenarioRepository} from './scenario-repository.js';
import {createResponseSelection,resolveMatchResponse,commitMatchResult,evaluateCardCompatibility,DEMO_MATCH_CONFIG,RESPONSE_TYPES} from './response-engine.js';
export const EVENT_TYPES=['ACTION','MOVEMENT','SUPPORT','RISK','DECISION'];
// 32 actual path tiles: 12 ACTION, 6 MOVEMENT, 5 SUPPORT, 5 RISK, 4 DECISION.
export const TILE_EVENT_TYPES=Object.freeze(['ACTION','MOVEMENT','SUPPORT','ACTION','RISK','DECISION','ACTION','MOVEMENT','SUPPORT','ACTION','RISK','MOVEMENT','ACTION','DECISION','SUPPORT','ACTION','RISK','MOVEMENT','ACTION','SUPPORT','DECISION','ACTION','RISK','MOVEMENT','ACTION','SUPPORT','ACTION','DECISION','ACTION','MOVEMENT','ACTION','RISK']);
if(TILE_EVENT_TYPES.length!==TILE_POSITIONS.length)throw Error('EVENT_MAPPING_MISMATCH');
export const EVENT_CONFIG=Object.freeze({movement:2,supportRP:1,supportStability:1,riskRP:1,riskStability:-1,decisionFastRP:2,decisionFastStability:-1,decisionReviewRP:1});
const choice=(id,label,rp,stability,explanation,steps=0)=>({id,label,rp,stability,explanation,steps});
export const EVENT_CATALOG={
 MOVEMENT:[{id:'route-audit',title:'ตรวจสอบเส้นทางข้อมูล',description:'พบทางลัดที่ยังไม่มีบันทึกการตรวจสอบ คุณจะเลือกทางใด?'},{id:'model-checkpoint',title:'จุดทบทวนโมเดล',description:'มีจุดตรวจความถูกต้องด้านหลัง ก่อนนำโมเดลไปพื้นที่ถัดไป'}].map(e=>({...e,choices:[choice('forward','เดินหน้า 2 ช่อง · RP +0',0,0,'เดินหน้าต่อ แต่ยังไม่มีหลักฐานใหม่ยืนยันทางลัด',EVENT_CONFIG.movement),choice('review','ถอย 2 ช่องเพื่อตรวจเส้นทาง · RP +1',1,0,'ยอมย้อนตรวจหลักฐานเพื่อให้เส้นทางตรวจสอบได้',-EVENT_CONFIG.movement)]})),
 SUPPORT:[{id:'citizen-help',title:'ทีมสนับสนุนประชาชน',description:'ทีมงานมีทรัพยากรช่วยคุณได้หนึ่งด้าน'},{id:'audit-resources',title:'ทรัพยากรการตรวจสอบ',description:'ได้รับเวลาสำหรับเสริมความพร้อมหรือทำรายงาน'}].map(e=>({...e,choices:[choice('report','ทำรายงาน · RP +1',EVENT_CONFIG.supportRP,0,'สื่อสารข้อมูลให้ผู้เกี่ยวข้องตรวจสอบ'),choice('restore','ทบทวนความพร้อม · Stability +1',0,EVENT_CONFIG.supportStability,'เพิ่มความพร้อมของกระบวนการ สูงสุด 10')] })),
 RISK:[{id:'unverified-source',title:'แหล่งข้อมูลยังไม่ยืนยัน',description:'ข้อมูลถูกส่งต่อก่อนตรวจสอบแหล่งที่มา',cardTags:['VERIFY','AUDIT'],compatibilityRules:{effective:['data-strike'],partial:['secure-backup','lag-pulse'],reason:'ต้องตรวจแหล่งที่มาและหลักฐานก่อนใช้ข้อมูล'}},{id:'sensitive-export',title:'ข้อมูลอ่อนไหวกำลังถูกส่งออก',description:'พบคำขอส่งข้อมูลที่ยังไม่ได้จำกัดสิทธิ์เข้าถึง',cardTags:['PRIVACY','SAFETY'],compatibilityRules:{effective:['firewall-guard','access-denied'],partial:['secure-backup'],reason:'ต้องจำกัดการเข้าถึงและทบทวนสิทธิ์ก่อนส่งข้อมูล'}}].map(e=>({...e,choices:[choice('accept','ทำงานต่อพร้อมรับความเสี่ยง · RP +1 / Stability -1',EVENT_CONFIG.riskRP,EVENT_CONFIG.riskStability,'ยังทำงานต่อได้ แต่ความเสี่ยงที่ไม่แก้ไขลดความมั่นคงของกระบวนการ')]})),
 DECISION:[{id:'pilot-oversight',title:'ขยายระบบหรือทบทวนก่อน',description:'โครงการพร้อมขยาย แต่ยังมีข้อจำกัดด้านการกำกับดูแล'},{id:'public-explanation',title:'รายงานผลให้สาธารณะ',description:'ต้องตัดสินใจระหว่างรายงานเร็วกับใช้เวลาทบทวนคำอธิบาย'}].map(e=>({...e,choices:[choice('pilot','เดินหน้าทดลองพร้อมรับภาระตรวจภายหลัง · RP +2 / Stability -1',EVENT_CONFIG.decisionFastRP,EVENT_CONFIG.decisionFastStability,'การทดลองมีประโยชน์ แต่ต้องติดตามผลและรับผิดชอบความเสี่ยง'),choice('review','ทบทวนก่อน · RP +1 / Stability ไม่ลด',EVENT_CONFIG.decisionReviewRP,0,'ใช้เวลาตรวจความเป็นธรรมและคำอธิบายเพื่อรักษาความพร้อม')]}))
};
export const eventTypeForTile=index=>TILE_EVENT_TYPES[normalizeTileIndex(index)];
export function bonusPath(from,steps){if(!Number.isInteger(steps)||Math.abs(steps)>2)throw Error('INVALID_BONUS_MOVEMENT');return Array.from({length:Math.abs(steps)},(_,i)=>normalizeTileIndex(from+Math.sign(steps)*(i+1)));}
export async function openBoardEvent({match,actorId,tileIndex,random=Math.random,type=eventTypeForTile(tileIndex)}){
 if(match.status!=='PLAYING'||match.currentTurn!==actorId)throw Error('INVALID_TURN');
 const turn=match.turns[actorId]+1,id=`${actorId}:${turn}:${tileIndex}`;
 if((match.eventHistory||[]).some(e=>e.actorId===actorId&&e.turn===turn))throw Error('EVENT_ALREADY_OPENED');
 let scenario=null,content;
 if(type==='ACTION'){scenario=await selectAdventureScenario({repository:createScenarioRepository(),themeId:match.themeId,tileIndex,history:match.scenarioHistory,random});content=scenario;}
 else{const pool=EVENT_CATALOG[type];if(!pool)throw Error('INVALID_EVENT_TYPE');const last=(match.eventHistory||[]).at(-1)?.contentId;const available=pool.filter(e=>e.id!==last);content=available[Math.min(available.length-1,Math.max(0,Math.floor(random()*available.length)))];if(type==='RISK')scenario={...content,scenarioId:`risk:${id}`,contentIdentity:content.id,basicResponse:{label:'รับความเสี่ยงและทำงานต่อ',description:'RP +1 / Stability -1',explanation:content.choices[0].explanation}};}
 const event={status:type==='ACTION'?scenario.status:'DEMO_DRAFT',id,actorId,turn,tileIndex,type,contentId:content.scenarioId||content.id,title:content.title,description:content.description,choices:content.choices||[]};
 const next={...match,eventHistory:[...(match.eventHistory||[]),{...event,resolved:false}],scenarioHistory:type==='ACTION'?recordScenarioUse(match.scenarioHistory,{scenario,actorId,tileIndex,turnNumber:turn}):match.scenarioHistory};
 return {match:next,event,scenario};
}
export function resolveBoardEvent({match,event,scenario,actorId,deck,allowedIds,intent,position}){
 if(['rp','rpDelta','stability','stabilityDelta','position','positions','tileIndex','event','score','scores'].some(key=>Object.hasOwn(intent,key)))throw Error('INVALID_EVENT_INTENT');
 const record=(match.eventHistory||[]).find(e=>e.id===event?.id);
 if(!record||record.actorId!==actorId||event.actorId!==actorId)throw Error('INVALID_EVENT');
 if(record.resolved)return {duplicate:true,match,deck,result:null,position};
 if(match.currentTurn!==actorId||match.turns[actorId]+1!==event.turn)throw Error('INVALID_TURN');
 let resolved,path=[];
 if(event.type==='ACTION'||(event.type==='RISK'&&intent.responseType==='CARD')){
  if(event.type==='ACTION'&&!['BASIC','CARD'].includes(intent.responseType))throw Error('INVALID_RESPONSE_TYPE');
  const selection=createResponseSelection({type:intent.responseType,scenario,deck,instanceId:intent.instanceId});
  resolved=resolveMatchResponse({match,scenario,actorId,selection,deck,allowedIds});
 }else{
  if(intent.responseType||intent.instanceId)throw Error('EVENT_CHOICE_REQUIRED');
  const definition=EVENT_CATALOG[event.type]?.find(e=>e.id===event.contentId),selected=definition?.choices.find(c=>c.id===intent.choiceId);if(!selected)throw Error('INVALID_EVENT_CHOICE');
  if(selected.steps)path=bonusPath(position,selected.steps);
  resolved=commitMatchResult({match,actorId,deck,actionId:'event:'+event.id,result:{actorId,status:'RESOLVED',responseType:'EVENT',compatibility:event.type,rpDelta:selected.rp,stabilityDelta:selected.stability,explanation:selected.explanation,impact:selected.label,choiceId:selected.id}});
 }
 const result={...resolved.result,eventId:event.id,eventType:event.type};
 const next={...resolved.match,eventHistory:resolved.match.eventHistory.map(e=>e.id===event.id?{...e,resolved:true,choiceId:intent.choiceId||null}:e),responseHistory:[...resolved.match.responseHistory.slice(0,-1),result]};
 return {...resolved,match:next,result,path,position:path.at(-1)??position};
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
