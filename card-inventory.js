import { supabase,requirePlayer,toast } from "./flow-common.js";
import { REWARD_STATUSES,cardAccessState,normalizeLoadout } from "./learning-reward-engine.mjs";

const $=(selector)=>document.querySelector(selector);
const esc=(value="")=>String(value).replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
const TYPE_LABELS={ATTACK:"โจมตี",DEFENSE:"ป้องกัน",CONTROL:"ควบคุม",SUPPORT:"สนับสนุน"};
const STATUS_LABELS={LOCKED:"ยังล็อก",UNLOCKED:"ปลดล็อกแล้ว",EQUIPPED:"อยู่ในชุด",AVAILABLE_IN_BATTLE:"การ์ดพื้นฐาน"};
const state={user:null,cards:[],unlocked:new Set(),equipped:new Set(),rewards:new Map(),selected:[],saving:false};

function availableCards(){return state.cards.map((card)=>({...card,unlocked:state.unlocked.has(card.id)}));}
function statusOf(card){return cardAccessState(card,state.unlocked,state.equipped);}
function renderSlots(){
  $("#loadout-slots").innerHTML=[0,1,2].map((index)=>{const id=state.selected[index],card=state.cards.find((entry)=>entry.id===id);return card?`<button type="button" data-remove-slot="${index}" title="นำออกจากชุด"><span>${index+1}</span><b>${esc(card.name)}</b><small>${card.en_cost} EN · คลิกเพื่อนำออก</small></button>`:`<div><span>${index+1}</span><b>ช่องว่าง</b><small>เลือกการ์ดจากคลัง</small></div>`;}).join("");
  $("#save-loadout").disabled=state.saving||state.selected.length!==3;
}
function rewardForCard(cardId){return state.rewards.get(cardId);}
function renderCards(){
  const unlockedCount=state.cards.filter((card)=>card.is_starter||state.unlocked.has(card.id)).length;
  $("#unlock-summary").textContent=`ใช้ได้ ${unlockedCount} จาก ${state.cards.length} ใบ`;
  $("#card-library").innerHTML=state.cards.map((card)=>{
    const status=statusOf(card),locked=status===REWARD_STATUSES.LOCKED,reward=rewardForCard(card.id),selected=state.selected.includes(card.id);
    return `<article class="vault-card ${card.card_type.toLowerCase()} ${locked?"locked":""} ${selected?"selected":""}" data-card-id="${card.id}" tabindex="0" role="button" aria-label="${esc(card.name)} ${STATUS_LABELS[status]}"><div class="vault-card-art"><span>${locked?"?":card.icon_key.slice(0,2).toUpperCase()}</span><i>${locked?"LOCKED":TYPE_LABELS[card.card_type]}</i></div><div class="vault-card-meta"><span>${STATUS_LABELS[status]}</span><em>${card.en_cost} EN</em></div><h3>${esc(card.name)}</h3><p>${locked?"ผ่านภารกิจที่กำหนดเพื่อเปิดเผยพลังการ์ด":esc(card.description)}</p><footer><small>${reward?`รางวัลจาก ${esc(reward.learning_lessons?.title||"Story Mission")}`:(card.is_starter?"ชุดพื้นฐานสำหรับผู้เล่นใหม่":"รางวัลในอนาคต")}</small><b>${locked?"ดูเงื่อนไข":selected?"เลือกแล้ว":"เพิ่มเข้าชุด"} →</b></footer></article>`;
  }).join("");
  renderSlots();
}
function openDetail(card){
  const status=statusOf(card),locked=status===REWARD_STATUSES.LOCKED,reward=rewardForCard(card.id),education=card.education||{};
  $("#card-detail-content").innerHTML=`<div class="detail-card-art ${card.card_type.toLowerCase()}"><span>${locked?"?":card.icon_key.slice(0,2).toUpperCase()}</span></div><small>${TYPE_LABELS[card.card_type]} · ${card.en_cost} EN</small><h2>${esc(card.name)}</h2><p>${esc(card.description)}</p><section><b>แนวคิดการเรียนรู้</b><p>${esc(education.concept||"กลไกการตัดสินใจเชิงกลยุทธ์")}</p>${education.limitation?`<p>${esc(education.limitation)}</p>`:""}<em>${esc(education.disclaimer||"พลังการ์ดเป็นกลไกเกม ไม่ใช่การจำลองเทคโนโลยีจริงทั้งหมด")}</em></section>${locked&&reward?`<div class="unlock-condition"><b>วิธีปลดล็อก</b><span>${esc(reward.learning_lessons?.title||"Story Mission")} · ผ่าน Final Quiz ${reward.minimum_score}/10</span><a href="lesson-player.html?lesson=${encodeURIComponent(reward.learning_lessons?.code||"ai-ethics-m6-01")}">ไปยัง Story Mission</a></div>`:`<button type="button" data-toggle-card="${card.id}" ${card.is_starter||state.unlocked.has(card.id)?"":"disabled"}>${state.selected.includes(card.id)?"นำออกจากชุด":"เพิ่มเข้าชุดการ์ด"}</button>`}`;
  $("#card-detail").showModal();
}
function toggleCard(id){
  const card=state.cards.find((entry)=>entry.id===id);
  if(!card||(!card.is_starter&&!state.unlocked.has(id)))return;
  if(state.selected.includes(id))state.selected=state.selected.filter((entry)=>entry!==id);
  else if(state.selected.length<3)state.selected=[...state.selected,id];
  else{toast("ชุดการ์ดเต็ม 3 ใบ กรุณานำการ์ดออกก่อน","error");return;}
  state.equipped=new Set(state.selected);renderCards();
}
async function saveLoadout(){
  if(state.selected.length!==3||state.saving)return;
  state.saving=true;renderSlots();
  const {data,error}=await supabase.rpc("save_action_card_loadout",{p_card_ids:state.selected});
  state.saving=false;
  if(error){toast(error.message,"error");renderSlots();return;}
  state.selected=normalizeLoadout(data,availableCards());state.equipped=new Set(state.selected);renderCards();toast("บันทึกชุดการ์ดสำหรับ Battle แล้ว","success");
}

document.addEventListener("click",(event)=>{
  if(event.target.closest("[data-close-detail]"))$("#card-detail").close();
  const remove=event.target.closest("[data-remove-slot]");if(remove){toggleCard(state.selected[Number(remove.dataset.removeSlot)]);return;}
  const toggle=event.target.closest("[data-toggle-card]");if(toggle){toggleCard(toggle.dataset.toggleCard);$("#card-detail").close();return;}
  const cardNode=event.target.closest("[data-card-id]");if(cardNode){const card=state.cards.find((entry)=>entry.id===cardNode.dataset.cardId);if(statusOf(card)===REWARD_STATUSES.LOCKED)openDetail(card);else toggleCard(card.id);}
});
document.addEventListener("keydown",(event)=>{const node=event.target.closest?.("[data-card-id]");if(node&&(event.key==="Enter"||event.key===" ")){event.preventDefault();node.click();}});
$("#save-loadout").addEventListener("click",saveLoadout);

try{
  const {user}=await requirePlayer();state.user=user;
  const [cardsResult,unlocksResult,loadoutResult,rewardResult]=await Promise.all([
    supabase.from("action_cards").select("id,name,card_type,en_cost,description,icon_key,is_starter,education").eq("is_active",true).order("created_at"),
    supabase.from("user_card_unlocks").select("action_card_id,unlocked_at").eq("user_id",user.id),
    supabase.from("player_card_loadouts").select("slot,action_card_id").eq("user_id",user.id).order("slot"),
    supabase.from("lesson_rewards").select("action_card_id,minimum_score,learning_lessons(code,title)").eq("is_active",true),
  ]);
  const error=cardsResult.error||unlocksResult.error||loadoutResult.error||rewardResult.error;if(error)throw error;
  state.cards=cardsResult.data||[];state.unlocked=new Set((unlocksResult.data||[]).map((row)=>row.action_card_id));state.rewards=new Map((rewardResult.data||[]).map((row)=>[row.action_card_id,row]));
  state.selected=normalizeLoadout((loadoutResult.data||[]).map((row)=>row.action_card_id),availableCards());state.equipped=new Set(state.selected);renderCards();
}catch(error){toast(error.message,"error");$("#card-library").innerHTML='<div class="quiz-load-error"><h2>เปิดคลังการ์ดไม่สำเร็จ</h2><p>กรุณากลับไปยัง Learning World แล้วลองใหม่</p></div>';}
