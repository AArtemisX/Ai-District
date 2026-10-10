export const GAME_PHASES = Object.freeze({ WAITING:"WAITING", ROLLING:"ROLLING", MOVING:"MOVING", TILE_EVENT:"TILE_EVENT", ACTION_PHASE:"ACTION_PHASE", TURN_END:"TURN_END", GAME_END:"GAME_END" });
export const PHASE_LABELS = Object.freeze({ WAITING:"รอทอยลูกเต๋า", ROLLING:"กำลังทอย", MOVING:"กำลังเดิน", TILE_EVENT:"ตรวจสอบช่อง", ACTION_PHASE:"Action Phase", TURN_END:"จบเทิร์น", GAME_END:"จบเกม" });
const TRANSITIONS = Object.freeze({ WAITING:[GAME_PHASES.ROLLING,GAME_PHASES.GAME_END], ROLLING:[GAME_PHASES.MOVING,GAME_PHASES.GAME_END], MOVING:[GAME_PHASES.TILE_EVENT,GAME_PHASES.GAME_END], TILE_EVENT:[GAME_PHASES.ACTION_PHASE,GAME_PHASES.GAME_END], ACTION_PHASE:[GAME_PHASES.TURN_END,GAME_PHASES.GAME_END], TURN_END:[GAME_PHASES.WAITING,GAME_PHASES.GAME_END], GAME_END:[] });
export const TURN_ORDER = Object.freeze(["player","bot"]);
export const TILE_EVENTS = Object.freeze([
  {type:"NORMAL",title:"พื้นที่ทั่วไป",description:"พักและตรวจสอบทรัพยากรก่อนเดินทางต่อ",duration:30,safeResult:"ผ่านช่องโดยไม่มีผลเสีย"},
  {type:"AI_SCENARIO",title:"สถานการณ์ AI",description:"วิเคราะห์สถานการณ์ด้านจริยธรรมและเลือกแนวทางที่เหมาะสม",duration:40,safeResult:"เลือกแนวทางระมัดระวัง"},
  {type:"BATTLE",title:"AI Challenge",description:"พบความท้าทายจำลอง ระบบต่อสู้จริงจะเพิ่มใน Phase ถัดไป",duration:45,safeResult:"ตั้งรับและรักษาทรัพยากร"},
  {type:"ITEM",title:"จุดค้นพบไอเทม",description:"พบสัญญาณของอุปกรณ์สนับสนุนบนเส้นทาง",duration:30,safeResult:"เก็บข้อมูลไว้ตรวจสอบภายหลัง"},
  {type:"DISTRICT",title:"เขตพัฒนาเมือง",description:"สำรวจพื้นที่ District และตรวจสอบสถานะเจ้าของ",duration:35,safeResult:"ยังไม่สร้างสิ่งก่อสร้าง"},
  {type:"SPECIAL",title:"พื้นที่พิเศษ",description:"พลังงานจาก AI Core ส่งผลต่อพื้นที่นี้",duration:30,safeResult:"รับผลลัพธ์มาตรฐานที่ปลอดภัย"},
]);
export function canTransition(from,to){return TRANSITIONS[from]?.includes(to)??false;}
export function transitionPhase(from,to){if(!canTransition(from,to))throw new Error(`Invalid phase transition: ${from} -> ${to}`);return to;}
export function nextTurn(current,order=TURN_ORDER){const index=order.indexOf(current);return order[(index+1)%order.length];}
export function rollDie(random=Math.random){const sample=Math.min(.999999999,Math.max(0,random()));return Math.floor(sample*6)+1;}
export function getTileEvent(tileIndex){const event=TILE_EVENTS[((tileIndex%TILE_EVENTS.length)+TILE_EVENTS.length)%TILE_EVENTS.length];return {...event,tileIndex,duration:Math.max(30,event.duration)};}
