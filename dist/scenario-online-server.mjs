import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {OnlineRooms} from './scenario-adventure/online-rooms.mjs';
import {availableAdventureCardIds,scenarioLoadoutPolicy} from './scenario-adventure/loadout-engine.js';
import {buildUnifiedCardCatalog,scenarioStarterIdsFromServer} from './action-cards/card-catalog.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const config=await readFile(path.join(root,'supabase-client.js'),'utf8');
const supabaseUrl=config.match(/const SUPABASE_URL = "([^"]+)"/)[1];
const publishable=config.match(/const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)[1];
const rooms=new OnlineRooms(),identities=new Map(),rates=new Map();
async function request(token,route){const response=await fetch(supabaseUrl+route,{headers:{apikey:publishable,Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('AUTH_OR_INVENTORY_UNAVAILABLE');return response.json();}
async function identity(token){if(!token||token.length>8192)throw Error('AUTH_REQUIRED');const cached=identities.get(token);if(cached&&Date.now()<cached.until)return cached.user;const user=await request(token,'/auth/v1/user');if(!user.id)throw Error('AUTH_REQUIRED');if(identities.size>1000)identities.clear();identities.set(token,{user:{id:user.id},until:Date.now()+10000});return {id:user.id};}
async function inventory(token){const user=await identity(token);const [cards,unlocks,eligibility]=await Promise.all([request(token,'/rest/v1/action_cards?select=id,name,card_type,en_cost,is_starter,is_active&is_active=eq.true'),request(token,'/rest/v1/user_card_unlocks?select=action_card_id&user_id=eq.'+encodeURIComponent(user.id)),request(token,'/rest/v1/scenario_card_eligibility?select=action_card_id,is_starter,is_active,game_mode_code&game_mode_code=eq.scenario-adventure&is_active=eq.true').catch(()=>[])]);const starterIds=scenarioStarterIdsFromServer(eligibility);return {allowedIds:availableAdventureCardIds(buildUnifiedCardCatalog(cards),new Set(unlocks.map(r=>r.action_card_id)),starterIds),loadoutPolicy:scenarioLoadoutPolicy({serverEligibilityReady:starterIds.length>0,starterIds})};}
// Same-origin requests (pages served by this server) are always allowed; AI_DISTRICT_ORIGINS adds cross-origin pages (local dev).
const origins=new Set((process.env.AI_DISTRICT_ORIGINS||'http://127.0.0.1:4174,http://localhost:4174,http://127.0.0.1:4180,http://localhost:4180').split(','));
function sameOrigin(origin,req){try{return new URL(origin).host===req.headers.host;}catch{return false;}}
// Behind a hosting proxy every request shares the proxy's socket address, so rate-limit by the forwarded client IP.
const trustProxy=process.env.AI_DISTRICT_TRUST_PROXY==='1'||Boolean(process.env.RENDER);
function clientIp(req){const forwarded=trustProxy&&String(req.headers['x-forwarded-for']||'').split(',')[0].trim();return forwarded||req.socket.remoteAddress;}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function body(req){let bytes=0,text='';for await(const chunk of req){bytes+=chunk.length;if(bytes>8192)throw Error('BODY_TOO_LARGE');text+=chunk;}return JSON.parse(text||'{}');}
export const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/health')return json(res,200,{ok:true,mode:'scenario-online',persistence:'memory'});
 if(url.pathname.startsWith('/api/')){
  const origin=req.headers.origin;if(origin&&!origins.has(origin)&&!sameOrigin(origin,req))return json(res,403,{error:'ORIGIN_NOT_ALLOWED'});if(origin)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
  const ip=clientIp(req);const rate=rates.get(ip)||{count:0,until:Date.now()+60000};if(Date.now()>rate.until){rate.count=0;rate.until=Date.now()+60000;}rates.set(ip,rate);if(++rate.count>300)return json(res,429,{error:'RATE_LIMIT'});
  const token=(req.headers.authorization||'').replace(/^Bearer /,'');const user=await identity(token);const input=req.method==='POST'?await body(req):{};let data;
  if(url.pathname==='/api/create'&&req.method==='POST'){if(rooms.rooms.size>=200)throw Error('SERVER_ROOM_LIMIT');data=rooms.create(user,input,await inventory(token));}
  else if(url.pathname==='/api/rooms'&&req.method==='GET')data=rooms.list(user.id);
  else if(url.pathname==='/api/join'&&req.method==='POST')data=rooms.join(user,input.code,input,await inventory(token));
  else if(url.pathname==='/api/room'&&req.method==='GET'){const room=rooms.get(url.searchParams.get('code'),user.id);data=rooms.view(room,user.id);}
  else if(url.pathname==='/api/action'&&req.method==='POST'){if(['ready','start','respond','add-bot'].includes(input.type)){const room=rooms.get(input.code,user.id),member=room.members.find(m=>m.userId===user.id),fresh=await inventory(token);if(input.type!=='respond')rooms.validateSetup(member,fresh);member.allowedIds=[...fresh.allowedIds];}data=await rooms.act(user,input.code,input);}
  else return json(res,404,{error:'NOT_FOUND'});
  return json(res,200,data);
 }
 if(req.method!=='GET')return json(res,405,{error:'METHOD_NOT_ALLOWED'});
 const pathname=decodeURIComponent(url.pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/login.html':pathname));const relative=path.relative(root,file);
 if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(/[\\/]/).some(p=>p.startsWith('.'))||!['.html','.js','.mjs','.css','.png','.svg','.jpg','.jpeg','.webp','.ico','.glb'].includes(path.extname(file)))return json(res,404,{error:'NOT_FOUND'});
 const bytes=await readFile(file);const ext=path.extname(file);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.glb':'model/gltf-binary'})[ext]||'application/octet-stream','Cache-Control':['.html','.js','.mjs','.css'].includes(ext)?'no-store':'public, max-age=86400'});res.end(bytes);
 }catch(error){json(res,error.code==='ENOENT'?404:400,{error:error.message==='AUTH_OR_INVENTORY_UNAVAILABLE'?'AUTH_OR_INVENTORY_UNAVAILABLE':/^[A-Z_]+$/.test(error.message)?error.message:'REQUEST_FAILED'});}});
const cleanup=setInterval(()=>{rooms.cleanup();for(const [key,value] of identities)if(value.until<Date.now())identities.delete(key);for(const [key,value] of rates)if(value.until<Date.now())rates.delete(key);},60000);cleanup.unref();
const bots=setInterval(()=>{void rooms.tickBots();},500);bots.unref();server.on('close',()=>{clearInterval(bots);clearInterval(cleanup);});
// Hosts such as Render set PORT and need a public bind; local dev keeps 127.0.0.1:4180.
const port=Number(process.env.AI_DISTRICT_PORT||process.env.PORT||4180),host=process.env.AI_DISTRICT_HOST||(process.env.PORT?'0.0.0.0':'127.0.0.1');
server.listen(port,host,()=>console.log('Scenario Online server: http://'+host+':'+server.address().port));
