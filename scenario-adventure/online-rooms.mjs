import {openBoardEvent,resolveBoardEvent,chooseEventIntent,eventTypeForTile} from './board-events.js';
import {randomInt,randomUUID,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {isSelectableCharacter} from '../characters/character-roster.js';
import {validateAdventureLoadout} from './loadout-engine.js';
import {createDeckState,prepareDeckForTurn} from './deck-engine.js';
import {createScenarioAdventureMatch,selectAdventureScenario,recordScenarioUse} from './scenario-engine.js';
import {createScenarioRepository} from './scenario-repository.js';
import {createResponseSelection,resolveMatchResponse,chooseBotResponse} from './response-engine.js';
import {DEFAULT_THEME_ID,SCENARIO_THEMES} from './theme-config.js';
import {buildTilePath} from '../map-3d/board-data.js';
export const ONLINE_ROLES=['player','bot','player3','player4'];
function capacity(value=2){const count=Number(value);if(!Number.isInteger(count)||count<2||count>4)throw Error('INVALID_CAPACITY');return count;}
function passwordHash(password,salt){return scryptSync(password,salt,32);}
export class OnlineRooms {
 constructor({random=()=>randomInt(0,1000000)/1000000,now=Date.now,eventType=eventTypeForTile}={}){this.eventType=eventType;this.rooms=new Map();this.queues=new Map();this.random=random;this.now=now;}
 validateSetup(setup,inventory){if(!isSelectableCharacter(setup?.characterId)||!Array.isArray(setup.cardIds)||!validateAdventureLoadout(setup.cardIds,inventory.allowedIds,{policy:inventory.loadoutPolicy}).valid)throw Error('SETUP_NOT_ELIGIBLE');}
 member(user,setup,inventory,role){this.validateSetup(setup,inventory);return {userId:user.id,role,characterId:setup.characterId,cardIds:[...setup.cardIds],allowedIds:[...inventory.allowedIds],ready:false,isBot:false};}
 addBot(room){if(room.members.length>=room.maxPlayers)throw Error('ROOM_FULL_OR_STARTED');const owner=room.members.find(m=>m.userId===room.ownerId),role=ONLINE_ROLES.find(id=>!room.members.some(m=>m.role===id));room.members.push({...owner,userId:'AI-BOT-'+randomUUID(),role,cardIds:[...owner.cardIds],allowedIds:[...owner.allowedIds],isBot:true,ready:true});}
 unreadyHumans(room){for(const member of room.members)member.ready=member.isBot;}
 create(user,setup,inventory){
  this.cleanup();if([...this.rooms.values()].filter(r=>r.ownerId===user.id&&!['CLOSED','ABANDONED'].includes(r.status)).length>=3)throw Error('ROOM_LIMIT');
  const themeId=setup.themeId||DEFAULT_THEME_ID;if(!SCENARIO_THEMES.some(theme=>theme.themeId===themeId))throw Error('INVALID_THEME');
  const maxPlayers=capacity(setup.maxPlayers),bots=Number(setup.botCount||0);if(!Number.isInteger(bots)||bots<0||bots>=maxPlayers)throw Error('INVALID_BOT_COUNT');
  const password=setup.password??'';if(typeof password!=='string'||password.length>64)throw Error('INVALID_PASSWORD');if(setup.isPrivate&&!password.trim())throw Error('PASSWORD_REQUIRED');
  const member=this.member(user,setup,inventory,ONLINE_ROLES[0]);let code;do{code=String(randomInt(0,100000000)).padStart(8,'0');}while(this.rooms.has(code));
  const name=setup.roomName===undefined?'ห้อง Ai Word':String(setup.roomName).trim();if(!name||name.length>60)throw Error('INVALID_ROOM_NAME');
  const salt=password?randomBytes(16).toString('hex'):null;
  const room={code,ownerId:user.id,name,themeId,maxPlayers,status:'WAITING',revision:0,members:[member],updatedAt:this.now(),match:null,passwordSalt:salt,passwordHash:salt?passwordHash(password,salt):null};
  for(let i=0;i<bots;i++)this.addBot(room);this.rooms.set(code,room);return this.view(room,user.id);
 }
 get(code,userId){const room=this.rooms.get(String(code).toUpperCase());if(!room)throw Error('ROOM_NOT_FOUND');if(!room.members.some(m=>!m.isBot&&m.userId===userId)){if(room.kickedMembers?.has(userId))throw Error('KICKED_FROM_ROOM');throw Error('ROOM_NOT_FOUND');}return room;}
 join(user,code,setup,inventory){
  const room=this.rooms.get(String(code).trim().toUpperCase());if(!room||['CLOSED','ABANDONED'].includes(room.status))throw Error('ROOM_NOT_FOUND');
  if(room.members.some(m=>!m.isBot&&m.userId===user.id))return this.view(room,user.id);
  if(room.status!=='WAITING'||room.members.length>=room.maxPlayers)throw Error('ROOM_FULL_OR_STARTED');
  if(room.passwordHash){const supplied=setup.password;if(typeof supplied!=='string'||supplied.length>64||!timingSafeEqual(room.passwordHash,passwordHash(supplied,room.passwordSalt)))throw Error('INCORRECT_PASSWORD');}
  const role=ONLINE_ROLES.find(id=>!room.members.some(m=>m.role===id));room.members.push(this.member(user,setup,inventory,role));room.kickedMembers?.delete(user.id);this.unreadyHumans(room);this.touch(room);return this.view(room,user.id);
 }
 list(userId){this.cleanup();return [...this.rooms.values()].filter(r=>['WAITING','PLAYING','FINISHED'].includes(r.status)).map(r=>({code:r.code,name:r.name,themeId:r.themeId,status:r.status,maxPlayers:r.maxPlayers,memberCount:r.members.length,botCount:r.members.filter(m=>m.isBot).length,requiresPassword:Boolean(r.passwordHash),isMember:r.members.some(m=>!m.isBot&&m.userId===userId)}));}
 touch(room){room.revision++;room.updatedAt=this.now();}
 reset(room){
  room.members.forEach((member,index)=>{member.role=ONLINE_ROLES[index];});
  const actorOrder=room.members.map(m=>m.role);room.match=createScenarioAdventureMatch({themeId:room.themeId,actorOrder});
  room.decks=Object.fromEntries(room.members.map(m=>[m.role,createDeckState(m.cardIds,{actorId:m.role,matchId:randomUUID(),random:this.random})]));
  room.positions=Object.fromEntries(actorOrder.map(id=>[id,0]));room.phase='WAITING';room.event=null;room.scenario=null;room.result=null;room.lastRoll=null;room.movement=null;room.error=null;room.status='PLAYING';this.unreadyHumans(room);
 }
 async act(user,code,command){return this.enqueue(code,()=>this.apply(user,code,command));}
 async enqueue(code,work){const key=String(code).toUpperCase(),prior=this.queues.get(key)||Promise.resolve();const next=prior.catch(()=>{}).then(work);this.queues.set(key,next);try{return await next;}finally{if(this.queues.get(key)===next)this.queues.delete(key);}}
 async apply(user,code,command){
  const room=this.get(code,user.id),member=room.members.find(m=>m.userId===user.id);
  if(command.revision!==room.revision&&!(command.type==='ready'&&typeof command.ready==='boolean'))throw Error('STALE_REVISION');
  if(command.type==='surrender'){
   if(room.status!=='PLAYING')throw Error('INVALID_PHASE');
   const winners=room.match.actorOrder.filter(role=>role!==member.role);
   room.match={...room.match,status:'FINISHED',endReason:'SURRENDER',surrenderedBy:member.role,winners,winner:winners.length===1?winners[0]:'DRAW'};
   room.status='FINISHED';room.phase='RESOLVED';room.movement=null;room.result=null;this.unreadyHumans(room);this.touch(room);return this.view(room,user.id);
  }
  if(command.type==='leave'){if(room.status==='PLAYING')room.status='ABANDONED';else if(room.ownerId===user.id)room.status='CLOSED';else{room.members=room.members.filter(m=>m.userId!==user.id);this.unreadyHumans(room);}this.touch(room);return this.view(room,user.id);}
  if(command.type==='ready'){if(!['WAITING','FINISHED'].includes(room.status))throw Error('INVALID_PHASE');member.ready=typeof command.ready==='boolean'?command.ready:!member.ready;}
  else if(['add-bot','remove-bot','kick','configure','transfer-owner'].includes(command.type)){
   if(room.ownerId!==user.id||!['WAITING','FINISHED'].includes(room.status))throw Error('OWNER_ONLY');
   if(command.type==='transfer-owner'){const target=room.members.find(m=>m.role===command.role&&!m.isBot);if(!target||target.userId===room.ownerId)throw Error('INVALID_OWNER_TARGET');room.ownerId=target.userId;}
   if(command.type==='add-bot')this.addBot(room);
   if(command.type==='remove-bot'){const bot=room.members.find(m=>m.role===command.role&&m.isBot);if(!bot)throw Error('BOT_NOT_FOUND');room.members=room.members.filter(m=>m!==bot);}
   if(command.type==='kick'){const target=room.members.find(m=>m.role===command.role&&!m.isBot);if(!target||target.userId===room.ownerId)throw Error('CANNOT_KICK_MEMBER');room.members=room.members.filter(m=>m!==target);room.kickedMembers??=new Set();room.kickedMembers.add(target.userId);}
   if(command.type==='configure'){const count=capacity(command.maxPlayers);if(count<room.members.length)throw Error('ROOM_TOO_SMALL');room.maxPlayers=count;}
   this.unreadyHumans(room);
  }else if(command.type==='start'){
   if(user.id!==room.ownerId||!['WAITING','FINISHED'].includes(room.status)||room.members.length!==room.maxPlayers||!room.members.every(m=>m.ready))throw Error('TWO_READY_PLAYERS_REQUIRED');
   this.reset(room);
  }else await this.play(room,member,command);
  this.touch(room);return this.view(room,user.id);
 }
 async play(room,member,command){
  if(['rp','rpDelta','stability','stabilityDelta','position','positions','tileIndex','event','score','scores'].some(key=>Object.hasOwn(command,key)))throw Error('INVALID_EVENT_INTENT');
  const role=member.role;if(room.status!=='PLAYING'||room.match.currentTurn!==role)throw Error('NOT_YOUR_TURN');
  if(command.type==='roll'){
   if(room.phase!=='WAITING')throw Error('INVALID_PHASE');
   const value=1+Math.floor(this.random()*6),from=room.positions[role],path=buildTilePath(from,value),to=path.at(-1);
   const opened=await openBoardEvent({match:room.match,actorId:role,tileIndex:to,random:this.random,type:this.eventType(to)});
   room.match=opened.match;room.event=opened.event;room.scenario=opened.scenario;room.lastRoll=value;room.positions={...room.positions,[role]:to};room.movement={id:randomUUID(),actor:role,from,path};room.phase='RESPONSE_SELECTION';room.result=null;room.botActionAfter=this.now()+1150+value*400+700;
  }else if(command.type==='respond'){
   if(room.phase!=='RESPONSE_SELECTION')throw Error('INVALID_PHASE');
   const resolved=resolveBoardEvent({match:room.match,event:room.event,scenario:room.scenario,actorId:role,deck:room.decks[role],allowedIds:member.allowedIds,intent:command,position:room.positions[role]});
   if(resolved.duplicate)throw Error('EVENT_ALREADY_RESOLVED');
   room.positions={...room.positions,[role]:resolved.position};
   // Rule A: sync bonus position without firing landing callbacks or a second event.
room.match=resolved.match;room.decks[role]=resolved.deck;room.result=resolved.result;room.phase='RESOLVED';room.botActionAfter=this.now()+1600;if(room.match.status==='FINISHED')room.status='FINISHED';
  }else if(command.type==='continue'){
   if(room.phase!=='RESOLVED')throw Error('INVALID_PHASE');const order=room.match.actorOrder,next=order[(order.indexOf(role)+1)%order.length];room.match={...room.match,currentTurn:next};room.decks[next]=prepareDeckForTurn(room.decks[next],this.random);room.phase='WAITING';room.event=null;room.scenario=null;room.result=null;room.movement=null;room.botActionAfter=0;
  }else throw Error('INVALID_COMMAND');room.error=null;
 }
 async tickBots(){
  const jobs=[];for(const room of this.rooms.values())if(room.status==='PLAYING'){
   const member=room.members.find(m=>m.role===room.match.currentTurn);if(!member?.isBot||this.now()<(room.botActionAfter||0)||this.now()-(room.lastBotAt||0)<1200)continue;room.lastBotAt=this.now();
   jobs.push(this.enqueue(room.code,async()=>{if(room.status!=='PLAYING'||room.match.currentTurn!==member.role)return;let command;
    if(room.phase==='WAITING')command={type:'roll'};
    else if(room.phase==='RESPONSE_SELECTION')command={type:'respond',...chooseEventIntent({event:room.event,scenario:room.scenario,deck:room.decks[member.role],allowedIds:member.allowedIds,match:room.match,actorId:member.role})};
    else if(room.phase==='RESOLVED')command={type:'continue'};else return;
    try{await this.play(room,member,command);this.touch(room);}catch(error){room.error=error.message;}
   }));
  }await Promise.allSettled(jobs);
 }
 view(room,userId){const role=room.members.find(m=>!m.isBot&&m.userId===userId)?.role;return structuredClone({code:room.code,name:room.name,themeId:room.themeId,maxPlayers:room.maxPlayers,requiresPassword:Boolean(room.passwordHash),status:room.status,revision:room.revision,isOwner:room.ownerId===userId,role,members:room.members.map(m=>({role:m.role,characterId:m.characterId,ready:m.ready,isBot:m.isBot,isOwner:!m.isBot&&m.userId===room.ownerId})),match:room.match,positions:room.positions,phase:room.phase,event:room.event,scenario:room.scenario,result:room.result,lastRoll:room.lastRoll,movement:room.movement,error:room.error,deck:room.decks?.[role]});}
 cleanup(){for(const [code,room] of this.rooms)if(this.now()-room.updatedAt>24*60*60*1000)this.rooms.delete(code);}
}
