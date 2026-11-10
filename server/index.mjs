import {WebSocketServer,WebSocket} from "ws";
import {randomInt} from "node:crypto";
import {readFileSync,writeFileSync,renameSync,mkdirSync} from "node:fs";
import {dirname} from "node:path";
const words=JSON.parse(readFileSync(new URL("../data/words.json",import.meta.url),"utf8"));
const AVATARS=["flamingo","robot","fox","unicorn","dino","cat"];
const safeName=value=>String(value||"").trim().slice(0,24)||"Игрок";
const defaults={language:"ru",maxLetters:4,addition:true,subtraction:true,mathMax:10};
const pick=arr=>arr[randomInt(arr.length)];
function challenge(type,settings){const groups=words[settings.language]||words.ru;const candidates=Object.entries(groups).filter(([len])=>Number(len)<=settings.maxLetters).flatMap(([,v])=>v);const word=pick(candidates);if(type==="word")return {type,prompt:"Напиши слово: "+word.toUpperCase(),answer:word};if(type==="letter"){const letter=pick(Array.from(word));const other=[...new Set(candidates.join(""))].filter(c=>c!==letter);const options=[letter,...other.sort(()=>randomInt(3)-1).slice(0,3)].sort(()=>randomInt(3)-1);return {type,prompt:"Нажми букву "+letter.toUpperCase(),answer:letter,options}}const max=settings.mathMax;const minus=settings.subtraction&&(!settings.addition||randomInt(2)===0);const a=randomInt(max+1),b=randomInt((minus?a:max-a)+1);return {type,prompt:a+(minus?" − ":" + ")+b+" = ?",answer:String(minus?a-b:a+b)}}
const port=Number(process.env.PORT||8080);
const wss=new WebSocketServer({port});
const rooms=new Map();
const ROOM_TTL_MS=24*60*60*1000;
const ROOM_STORE=process.env.ROOM_STORE_PATH||"./data/rooms.json";
function persistRooms(){
 try{
  mkdirSync(dirname(ROOM_STORE),{recursive:true});
  const snapshot=[...rooms.values()].map(room=>({code:room.code,createdAt:room.createdAt,state:room.state}));
  writeFileSync(ROOM_STORE+".tmp",JSON.stringify(snapshot));
  renameSync(ROOM_STORE+".tmp",ROOM_STORE);
 }catch(error){console.error("Failed to persist rooms",error)}
}
function expireRooms(){
 const now=Date.now();let changed=false;
 for(const [id,room] of rooms){
  if(now-room.createdAt>=ROOM_TTL_MS){
   for(const ws of room.clients){send(ws,{type:"error",message:"Срок действия комнаты истёк (24 часа)"});ws.room=null;ws.close(1000,"Room expired")}
   rooms.delete(id);changed=true;
  }
 }
 if(changed)persistRooms();
}
try{
 const saved=JSON.parse(readFileSync(ROOM_STORE,"utf8"));
 for(const item of saved){
  if(item&&/^\\d{6}$/.test(item.code)&&Number.isFinite(item.createdAt)&&Date.now()-item.createdAt<ROOM_TTL_MS&&item.createdAt<=Date.now()&&item.state){
   rooms.set(item.code,{code:item.code,createdAt:item.createdAt,clients:new Set(),state:item.state});
  }
 }
}catch(error){if(error.code!=="ENOENT")console.error("Failed to load saved rooms",error)}
expireRooms();
const cleanupInterval=setInterval(expireRooms,60*1000);
cleanupInterval.unref();
const send=(ws,obj)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj))};
function publish(room){persistRooms();for(const ws of room.clients)send(ws,{type:"state",room:room.code,players:room.clients.size,state:room.state,seat:ws.seat})}
function fresh(settings=defaults){const indexes=Array.from({length:60},(_,i)=>i);for(let i=indexes.length-1;i>0;i--){const j=randomInt(i+1);[indexes[i],indexes[j]]=[indexes[j],indexes[i]]}const board={};indexes.slice(0,27).forEach((n,i)=>board[n]=["letter","word","math"][i%3]);return {pos:[-1,-1],turn:0,die:null,stepsLeft:0,won:false,winner:null,board,challenge:null,coconuts:[0,0,0],players:[null,null],settings,message:"Брось кубик!"}}
function code(){let n;do{n=String(randomInt(100000,1000000))}while(rooms.has(n));return n}
wss.on("connection",ws=>{
 ws.on("message",raw=>{let data;try{data=JSON.parse(raw)}catch{return}
  if(data.type==="create"||data.type==="join"){
   const number=data.type==="create"?code():String(data.room||"");
   if(data.type==="join"&&!/^\d{6}$/.test(number))return send(ws,{type:"error",message:"Номер комнаты — 6 цифр"});
   expireRooms();
   let room=rooms.get(number);
   if(!room){if(data.type==="join")return send(ws,{type:"error",message:"Комната не найдена"});room={code:number,createdAt:Date.now(),clients:new Set(),state:fresh({...defaults,...data.settings})};rooms.set(number,room);persistRooms()}
   if(room.clients.size>=2)return send(ws,{type:"error",message:"Комната заполнена"});
   if(!Array.isArray(room.state.players))room.state.players=[null,null];
   const seat=[0,1].find(n=>![...room.clients].some(client=>client.seat===n));
   let requested=AVATARS.includes(data.avatar)?data.avatar:(seat===0?"flamingo":"robot");
   const other=room.state.players[1-seat]?.avatar;
   if(other===requested&&data.avatarAuto)requested=AVATARS.find(a=>a===(seat===0?"flamingo":"robot")&&a!==other)||AVATARS.find(a=>a!==other);
   if(other===requested)return send(ws,{type:"error",message:"Этот персонаж уже занят. Выбери другого."});
   if(room.state.players[seat]?.avatar&&room.state.players[seat].avatar!==requested&&room.state.players[1-seat]?.avatar===requested)return send(ws,{type:"error",message:"Персонаж занят"});
   room.state.players[seat]={name:safeName(data.name),avatar:requested};
   if(ws.room)return send(ws,{type:"error",message:"Вы уже в комнате"});
   ws.room=room;ws.seat=seat;room.clients.add(ws);publish(room);return;
  }
  const room=ws.room;if(!room)return;
  const state=room.state;
  if(["palm_start","palm_drop","palm_stop"].includes(data.type)){
   const index=data.index;
   if(!Number.isInteger(index)||index<0||index>2)return;
   if(!Array.isArray(state.coconuts))state.coconuts=[0,0,0];
   if(data.type==="palm_drop"){
    state.coconuts[index]=Math.min(8,state.coconuts[index]+2);
    persistRooms();
   }
   for(const peer of room.clients){
    if(peer!==ws)send(peer,{type:data.type,index,coconuts:state.coconuts});
   }
   return;
  }
  if(room.clients.size<2)return send(ws,{type:"error",message:"Ждём второго игрока"});
  if(data.type==="roll"){
   if(state.turn!==ws.seat||state.die!==null||state.won||state.challenge)return;
   state.die=randomInt(1,7);state.stepsLeft=state.die;state.message="Выпало "+state.die;publish(room);
  }
  if(data.type==="move"){
   if(state.turn!==ws.seat||state.die===null||state.won||state.challenge)return;
   const target=(state.pos[ws.seat]+state.stepsLeft>=59?60:state.pos[ws.seat]+state.stepsLeft);
   if(data.target!==target)return send(ws,{type:"error",message:"Неверная клетка"});
   state.pos[ws.seat]=target;state.stepsLeft=0;state.die=null;
   if(target===60){state.won=true;state.winner=ws.seat;state.message="Победа!"}
   else if(state.board[target]){state.challenge=challenge(state.board[target],state.settings);state.message="Выполни задание!"}else{state.turn=1-state.turn;state.message="Ход другого игрока"}
   publish(room);
  }
  if(data.type==="answer"&&state.turn===ws.seat&&state.challenge){if(String(data.answer||"").trim().toLocaleLowerCase()===state.challenge.answer.toLocaleLowerCase()){state.challenge=null;state.message="Молодец! Ты правильно решил задачу и получаешь дополнительный ход. Ходи ещё раз!";publish(room)}else send(ws,{type:"error",message:"Попробуй ещё раз!"})}
  if(data.type==="skip"&&state.turn===ws.seat&&state.challenge){state.challenge=null;state.turn=1-state.turn;state.message="Задание пропущено. Ход другого игрока.";publish(room)}
  if(data.type==="reset"&&ws.seat===0){const players=state.players;room.state=fresh(state.settings);room.state.players=players;publish(room)}
 });
 ws.on("close",()=>{const room=ws.room;if(!room)return;room.clients.delete(ws);publish(room)});
});
console.log("Game websocket server listening on",port);
