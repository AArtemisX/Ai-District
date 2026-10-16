import {requirePlayer} from './flow-common.js';
import {CHAPTER_01} from './chapter01-data.js';
import {advanceChapter,sceneReady,readChapterProgress,writeChapterProgress} from './chapter01-engine.mjs';
import {CharacterDialogue,SceneVisual,escapeHtml as esc} from './lesson-components.js';
export async function startChapter01(){
 const $=s=>document.querySelector(s);let progress,user,saveError='',loadError=false,selectedEvidence=null,view='read';
 document.body.classList.add('chapter01-page');
 $('#mission-kicker').textContent='บทที่ 1 · ฉาก 1–2';$('#mission-title').textContent=CHAPTER_01.title;
 $('#mission-topic').textContent='ความเป็นธรรม · มนุษย์กำกับดูแล';
 $('#mission-demo-banner').textContent='รอบ 1 · บันทึกในเครื่องนี้แยกตามบัญชี · ยังไม่เปิด Quiz และรับรางวัล';
 $('#toggle-explanation').hidden=true;$('#skip-animation').hidden=true;
 const notice=document.createElement('div');notice.className='chapter-save-status';notice.setAttribute('role','status');$('.mission-stage').before(notice);
 const report=()=>{notice.replaceChildren();const text=document.createElement('span');text.textContent=saveError?'บันทึกยังไม่สำเร็จ ความคืบหน้าปัจจุบันยังอยู่ในหน้านี้ กรุณาลองใหม่':'บันทึกในเครื่องนี้แล้ว · ไม่ใช่ผลผ่านบนเซิร์ฟเวอร์';notice.append(text);if(saveError){const retry=document.createElement('button');retry.textContent=loadError?'ลองโหลดอีกครั้ง':'ลองบันทึกอีกครั้ง';retry.onclick=()=>{if(loadError)void load();else{save();render();}};notice.append(retry);}};
 function save(){try{writeChapterProgress(localStorage,user.id,progress);saveError='';}catch(e){saveError=e.message;}report();}
 function render(focusId){const scene=CHAPTER_01.scenes[progress.sceneIndex],s=progress.scenes[scene.id],ready=sceneReady(scene,progress);const runtime={dialogue:{[scene.id]:s.line},evidence:{[scene.id]:s.seen}};
 $('#scene-phase').textContent=scene.phase;$('#mission-progress-wrap').textContent=`ฉาก ${progress.sceneIndex+1}/2 ที่เปิดให้เล่น · ทั้งบทมี 5 ฉาก`;
 $('#scene-visual-wrap').innerHTML=SceneVisual(scene,runtime)+`<p>ภาพเมืองประกอบฉาก · ${esc(scene.title)}</p><div class="chapter-evidence-buttons">${scene.evidence.map(e=>`<button data-evidence="${e.id}">${s.seen.includes(e.id)?'✓ ':''}สำรวจ ${esc(e.title)}</button>`).join('')}</div>`;
 $('#scene-content').dataset.view=view;
 $('#scene-content').innerHTML=`<nav class="chapter-view-tabs" aria-label="ส่วนของฉาก"><button data-view="read" aria-pressed="${view==='read'}">บทสนทนา</button><button data-view="inspect" aria-pressed="${view==='inspect'}">สำรวจ ${s.seen.length}/${scene.evidence.length}</button><button data-view="choice" aria-pressed="${view==='choice'}" ${s.line<scene.dialogue.length-1||s.seen.length<scene.evidence.length?'disabled':''}>เลือกคำตอบ</button></nav>`+CharacterDialogue(scene,runtime)+`<p class="chapter-objectives">อ่านบทสนทนา ${s.line+1}/${scene.dialogue.length} · สำรวจ ${s.seen.length}/${scene.evidence.length} จุด</p>`;
 document.querySelectorAll('[data-dialogue-text]').forEach(el=>el.textContent=el.dataset.dialogueText);document.querySelector('[data-action="skip-text"]')?.remove();
 const ev=scene.evidence.find(e=>e.id===selectedEvidence)||scene.evidence.find(e=>e.id===s.seen.at(-1));if(ev)$('#scene-content').insertAdjacentHTML('beforeend',`<aside class="chapter-evidence"><b>${esc(ev.title)}</b><p>${esc(ev.summary)}</p></aside>`);
 if(s.line===scene.dialogue.length-1&&s.seen.length===scene.evidence.length){const choice=scene.choices.find(c=>c.id===s.choice);$('#scene-content').insertAdjacentHTML('beforeend',`<section class="chapter-choices"><h3>${esc(scene.question||'คุณจะตอบ Alexander ว่าอย่างไร?')}</h3>${scene.choices.map(c=>`<button data-choice="${c.id}" aria-pressed="${s.choice===c.id}">${esc(c.label)}</button>`).join('')}${choice?`<p role="status">${choice.correct?'✓ Alexander:':'ลองใหม่ได้: '}${esc(choice.feedback)}</p>`:''}${choice?.correct&&scene.ending.length?`<aside><b>${esc(scene.ending[s.ending].speaker)}</b><p>${esc(scene.ending[s.ending].text)}</p>${s.ending<scene.ending.length-1?'<button data-ending>อ่านบทส่งท้ายต่อ →</button>':''}</aside>`:''}</section>`);}
 $('#previous-scene').disabled=!progress.sceneIndex;$('#next-scene').disabled=!ready||Boolean(saveError);$('#next-scene').textContent=progress.sceneIndex===0?'ไปฉาก 02 →':'จบฉาก 02 · กลับ Learning World';
 $('#scene-caption').textContent=ready?'ครบเป้าหมายของฉากแล้ว':'อ่านบทสนทนา สำรวจให้ครบ แล้วเลือกคำตอบ';
 if(focusId)document.querySelector(focusId)?.focus();
 }
 function act(event,focusId){progress=advanceChapter(progress,event);const scene=CHAPTER_01.scenes[progress.sceneIndex],s=progress.scenes[scene.id];if(event.type==='inspect')view='inspect';if(event.type==='line'&&event.delta>0&&s.line===scene.dialogue.length-1)view=s.seen.length===scene.evidence.length?'choice':'inspect';if(event.type==='next'||event.type==='back')view='read';save();render(focusId);}
 async function load(){try{if(!user)user=(await requirePlayer()).user;progress=readChapterProgress(localStorage,user.id);loadError=false;saveError='';report();render();}catch(e){if(String(e.message).endsWith('REQUIRED'))return;loadError=true;saveError=e.message;report();$('#scene-content').textContent='เปิดความคืบหน้าไม่สำเร็จ ข้อมูลเดิมจะไม่ถูกเขียนทับ กรุณาลองโหลดอีกครั้ง';$('#next-scene').disabled=true;}}
 $('.mission-stage').addEventListener('click',e=>{if(loadError||!progress)return;const b=e.target.closest('button');if(!b)return;if(b.dataset.view){view=b.dataset.view;render(`[data-view="${view}"]`);}else if(b.dataset.evidence){selectedEvidence=b.dataset.evidence;act({type:'inspect',id:b.dataset.evidence},`[data-evidence="${b.dataset.evidence}"]`);}else if(b.dataset.choice)act({type:'choice',id:b.dataset.choice},`[data-choice="${b.dataset.choice}"]`);else if(b.hasAttribute('data-ending'))act({type:'ending'});else if(b.dataset.action==='dialogue-next')act({type:'line',delta:1},'[data-action="dialogue-next"]');else if(b.dataset.action==='dialogue-prev')act({type:'line',delta:-1},'[data-action="dialogue-prev"]');});
 $('#previous-scene').onclick=()=>{if(progress){selectedEvidence=null;act({type:'back'});}};
 $('#next-scene').onclick=()=>{if(!progress||saveError||!sceneReady(CHAPTER_01.scenes[progress.sceneIndex],progress))return;if(progress.sceneIndex===1)location.assign('learning.html');else{selectedEvidence=null;act({type:'next'});$('#scene-content h2')?.setAttribute('tabindex','-1');$('#scene-content h2')?.focus();}};
 $('#exit-lesson').onclick=()=>{if(progress)save();if(!saveError)location.assign('learning.html');};
 $('.keyboard-hint').textContent='ใช้ Tab เพื่อเลือกปุ่ม และ Enter เพื่ออ่านบทสนทนาหรือสำรวจ';
 await load();
}
