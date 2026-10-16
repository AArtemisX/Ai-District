import { supabase,requirePlayer,toast } from "./flow-common.js";
import { REWARD_STATUSES,cardAccessState } from "./learning-reward-engine.mjs";
import { buildUnifiedCardCatalog,catalogOwnershipState,validateUnifiedCardCatalog } from "./action-cards/card-catalog.js";

const $=(selector)=>document.querySelector(selector);
const esc=(value="")=>String(value).replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
const TYPE_LABELS={ATTACK:"โจมตี",DEFENSE:"ป้องกัน",CONTROL:"ควบคุม",SUPPORT:"สนับสนุน",STRATEGY:"กลยุทธ์",SPECIAL:"พิเศษ"};
const STATUS_LABELS={LOCKED:"ยังล็อก",UNLOCKED:"ปลดล็อกแล้ว",EQUIPPED:"อยู่ในชุด",AVAILABLE_IN_BATTLE:"การ์ดพื้นฐาน",PROTOTYPE:"Prototype"};
const state={user:null,cards:[],unlocked:new Set(),equipped:new Set(),rewards:new Map(),selected:[]};
function statusOf(card){return card.catalogState?catalogOwnershipState(card,state.unlocked,state.equipped):cardAccessState(card,state.unlocked,state.equipped);}
function artworkMarkup(card,detail=false){const fallback=esc((card.icon_key||card.card_type||"AI").slice(0,2).toUpperCase()),src=card.artwork?.src;if(!src)return `<span>${fallback}</span>`;return `<img data-card-artwork src="${esc(src)}" alt="${esc(card.artwork.alt||card.name)}" loading="lazy"/><span class="artwork-fallback" hidden>${fallback}</span>`;}
function rewardForCard(cardId){return state.rewards.get(cardId);}
function renderCards(){
  const inventoryCards=state.cards.filter((card)=>card.catalogState!=="PROTOTYPE"),prototypeCount=state.cards.length-inventoryCards.length;
  const unlockedCount=inventoryCards.filter((card)=>card.is_starter||state.unlocked.has(card.id)).length;
  $("#unlock-summary").textContent=`ใช้ใน Match ได้ ${unlockedCount}/${inventoryCards.length} ใบ · Prototype ${prototypeCount} ใบ`;
  $("#card-library").innerHTML=state.cards.map((card)=>{
    const status=statusOf(card),prototype=status==="PROTOTYPE",locked=status===REWARD_STATUSES.LOCKED,reward=rewardForCard(card.id),selected=state.selected.includes(card.id),cost=Number.isInteger(card.en_cost)?`${card.en_cost} EN`:"ยังไม่กำหนด";
    return `<article class="vault-card ${card.card_type.toLowerCase()} ${locked?"locked":""} ${prototype?"prototype":""} ${selected?"selected":""}" data-card-id="${card.id}" tabindex="0" role="button" aria-label="${esc(card.name)} ${STATUS_LABELS[status]}"><div class="vault-card-art">${artworkMarkup(card)}<i>${prototype?"PROTOTYPE":locked?"LOCKED":TYPE_LABELS[card.card_type]}</i></div><div class="vault-card-meta"><span>${STATUS_LABELS[status]}</span><em>${cost}</em></div><h3>${esc(card.name)}</h3><p>${prototype?esc(card.description):locked?"ผ่านภารกิจที่กำหนดเพื่อเปิดเผยพลังการ์ด":esc(card.description)}</p><footer><small>${prototype?"Catalog Definition · ยังไม่ใช่สิทธิ์ของบัญชี":reward?`รางวัลจาก ${esc(reward.learning_lessons?.title||"Story Mission")}`:(card.is_starter?"ชุดพื้นฐานสำหรับผู้เล่นใหม่":"รางวัลในอนาคต")}</small><b>${prototype?"ดูข้อมูลต้นแบบ":locked?"ดูเงื่อนไข":"ดูรายละเอียด"} →</b></footer></article>`;
  }).join("");

}
function openDetail(card){
  const status=statusOf(card),prototype=status==="PROTOTYPE",locked=status===REWARD_STATUSES.LOCKED,reward=rewardForCard(card.id),education=card.education||{},cost=Number.isInteger(card.en_cost)?`${card.en_cost} EN`:"ยังไม่กำหนดค่าใช้";
  $("#card-detail-content").innerHTML=`<div class="detail-card-art ${card.card_type.toLowerCase()}">${artworkMarkup(card,true)}</div><small>${TYPE_LABELS[card.card_type]} · ${cost}</small><h2>${esc(card.name)}</h2><p>${esc(card.description)}</p><section><b>${prototype?"สถานะ Catalog":"แนวคิดการเรียนรู้"}</b><p>${prototype?"มี Card Definition และ Artwork แล้ว แต่ยังไม่มี Production Card ID หรือสิทธิ์ใช้งานใน Match":esc(education.concept||"กลไกการตัดสินใจเชิงกลยุทธ์")}</p>${education.limitation?`<p>${esc(education.limitation)}</p>`:""}<em>${prototype?"Prototype ไม่เท่ากับ Owned และไม่ถูกส่งเข้า Deck Builder":"พลังการ์ดเป็นกลไกเกม ไม่ใช่การจำลองเทคโนโลยีจริงทั้งหมด"}</em></section>${prototype?`<button type="button" disabled>ยังไม่เปิดให้ใช้ใน Match</button>`:locked&&reward?`<div class="unlock-condition"><b>วิธีปลดล็อก</b><span>${esc(reward.learning_lessons?.title||"Story Mission")} · ผ่าน Final Quiz ${reward.minimum_score}/10</span><a href="lesson-player.html?lesson=${encodeURIComponent(reward.learning_lessons?.code||"ai-ethics-m6-01")}">ไปยัง Story Mission</a></div>`:`<a href="map-3d.html?mode=scenario-adventure">จัด Deck Scenario 5 ใบ</a>`}`;
  $("#card-detail").showModal();
}

document.addEventListener("click",(event)=>{
  if(event.target.closest("[data-close-detail]"))$("#card-detail").close();
  const cardNode=event.target.closest("[data-card-id]");if(cardNode){const card=state.cards.find((entry)=>entry.id===cardNode.dataset.cardId);if(card)openDetail(card);}
});
document.addEventListener("keydown",(event)=>{const node=event.target.closest?.("[data-card-id]");if(node&&(event.key==="Enter"||event.key===" ")){event.preventDefault();node.click();}});
document.addEventListener("error",(event)=>{if(!event.target.matches?.("[data-card-artwork]"))return;event.target.hidden=true;if(event.target.nextElementSibling)event.target.nextElementSibling.hidden=false;},true);

try{
  const {user}=await requirePlayer();state.user=user;
  const [cardsResult,unlocksResult,rewardResult]=await Promise.all([
    supabase.from("action_cards").select("id,name,card_type,en_cost,description,icon_key,is_starter,education").eq("is_active",true).order("created_at"),
    supabase.from("user_card_unlocks").select("action_card_id,unlocked_at").eq("user_id",user.id),
    supabase.from("lesson_rewards").select("action_card_id,minimum_score,learning_lessons(code,title)").eq("is_active",true),
  ]);
  const error=cardsResult.error||unlocksResult.error||rewardResult.error;if(error)throw error;
  state.cards=buildUnifiedCardCatalog(cardsResult.data||[]);const catalogValidation=validateUnifiedCardCatalog(state.cards);if(!catalogValidation.valid)throw new Error(`INVALID_CARD_CATALOG:${catalogValidation.errors.join(",")}`);state.unlocked=new Set((unlocksResult.data||[]).map((row)=>row.action_card_id));state.rewards=new Map((rewardResult.data||[]).map((row)=>[row.action_card_id,row]));
  renderCards();
}catch(error){toast(error.message,"error");$("#card-library").innerHTML='<div class="quiz-load-error"><h2>เปิดคลังการ์ดไม่สำเร็จ</h2><p>กรุณากลับไปยัง Learning World แล้วลองใหม่</p></div>';}
