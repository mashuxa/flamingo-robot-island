import {WebSocketServer,WebSocket} from "ws";
import {randomInt} from "node:crypto";
import {readFileSync} from "node:fs";
const words=JSON.parse(readFileSync(new URL("../data/words.json",import.meta.url),"utf8"));
const defaults={language:"ru",maxLetters:4,addition:true,subtraction:true,mathMax:10};
const pick=arr=>arr[randomInt(arr.length)];
function challenge(type,settings){const groups=words[settings.language]||words.ru;const candidates=Object.entries(groups).filter(([len])=>Number(len)<=settings.maxLetters).flatMap(([,v])=>v);const word=pick(candidates);if(type==="word")return {type,prompt:"Напиши слово: "+word.toUpperCase(),answer:word};if(type==="letter"){const letter=pick(Array.from(word));const other=[...new Set(candidates.join(""))].filter(c=>c!==letter);const options=[letter,...other.sort(()=>randomInt(3)-1).slice(0,3)].sort(()=>randomInt(3)-1);return {type,prompt:"Нажми букву "+letter.toUpperCase(),answer:letter,options}}const max=settings.mathMax;const minus=settings.subtraction&&(!settings.addition||randomInt(2)===0);const a=randomInt(max+1),b=randomInt((minus?a:max-a)+1);return {type,prompt:a+(minus?" − ":" + ")+b+" = ?",answer:String(minus?a-b:a+b)}}
const port=Number(process.env.PORT||8080);
const wss=new WebSocketServer({port});
const rooms=new Map();
const send=(ws,obj)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj))};
function publish(room){for(const ws of room.clients)send(ws,{type:"state",room:room.code,players:room.clients.size,state:room.state,seat:ws.seat})}
function fresh(settings=defaults){const indexes=Array.from({length:60},(_,i)=>i);for(let i=indexes.length-1;i>0;i--){const j=randomInt(i+1);[indexes[i],indexes[j]]=[indexes[j],indexes[i]]}const board={};indexes.slice(0,27).forEach((n,i)=>board[n]=["letter","word","math"][i%3]);return {pos:[-1,-1],turn:0,die:null,stepsLeft:0,won:false,winner:null,board,challenge:null,settings,message:"Брось кубик!"}}
function code(){let n;do{n=String(randomInt(100000,1000000))}while(rooms.has(n));return n}
wss.on("connection",ws=>{
 ws.on("message",raw=>{let data;try{data=JSON.parse(raw)}catch{return}
  if(data.type==="create"||data.type==="join"){
   const number=data.type==="create"?code():String(data.room||"");
   if(data.type==="join"&&!/^\d{6}$/.test(number))return send(ws,{type:"error",message:"Номер комнаты — 6 цифр"});
   let room=rooms.get(number);
   if(!room){if(data.type==="join")return send(ws,{type:"error",message:"Комната не найдена"});room={code:number,clients:new Set(),state:fresh({...defaults,...data.settings})};rooms.set(number,room)}
   if(room.clients.size>=2)return send(ws,{type:"error",message:"Комната заполнена"});
   if(ws.room)return send(ws,{type:"error",message:"Вы уже в комнате"});
   ws.room=room;ws.seat=[0,1].find(seat=>![...room.clients].some(client=>client.seat===seat));room.clients.add(ws);publish(room);return;
  }
  const room=ws.room;if(!room)return;
  const state=room.state;if(room.clients.size<2)return send(ws,{type:"error",message:"Ждём второго игрока"});
  if(data.type==="roll"){
   if(state.turn!==ws.seat||state.die!==null||state.won||state.challenge)return;
   state.die=randomInt(1,7);state.stepsLeft=state.die;state.message="Выпало "+state.die;publish(room);
  }
  if(data.type==="move"){
   if(state.turn!==ws.seat||state.die===null||state.won||state.challenge)return;
   const target=Math.min(60,state.pos[ws.seat]+state.stepsLeft);
   if(data.target!==target)return send(ws,{type:"error",message:"Неверная клетка"});
   state.pos[ws.seat]=target;state.stepsLeft=0;state.die=null;
   if(target===60){state.won=true;state.winner=ws.seat;state.message="Победа!"}
   else if(state.board[target]){state.challenge=challenge(state.board[target],state.settings);state.message="Выполни задание!"}else{state.turn=1-state.turn;state.message="Ход другого игрока"}
   publish(room);
  }
  if(data.type==="answer"&&state.turn===ws.seat&&state.challenge){if(String(data.answer||"").trim().toLocaleLowerCase()===state.challenge.answer.toLocaleLowerCase()){state.challenge=null;state.turn=1-state.turn;state.message="Правильно! Ход другого игрока";publish(room)}else send(ws,{type:"error",message:"Попробуй ещё раз!"})}
  if(data.type==="reset"&&ws.seat===0){room.state=fresh(state.settings);publish(room)}
 });
 ws.on("close",()=>{const room=ws.room;if(!room)return;room.clients.delete(ws);if(!room.clients.size)rooms.delete(room.code);else publish(room)});
});
console.log("Game websocket server listening on",port);
