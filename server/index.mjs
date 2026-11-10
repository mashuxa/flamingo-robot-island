import {WebSocketServer,WebSocket} from "ws";
import {randomInt} from "node:crypto";
const port=Number(process.env.PORT||8080);
const wss=new WebSocketServer({port});
const rooms=new Map();
const send=(ws,obj)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj))};
function publish(room){for(const ws of room.clients)send(ws,{type:"state",room:room.code,players:room.clients.size,state:room.state,seat:ws.seat})}
function fresh(){return {pos:[-1,-1],turn:0,die:null,stepsLeft:0,won:false,message:"Брось кубик!"}}
function code(){let n;do{n=String(randomInt(100000,1000000))}while(rooms.has(n));return n}
wss.on("connection",ws=>{
 ws.on("message",raw=>{let data;try{data=JSON.parse(raw)}catch{return}
  if(data.type==="create"||data.type==="join"){
   const number=data.type==="create"?code():String(data.room||"");
   if(data.type==="join"&&!/^\d{6}$/.test(number))return send(ws,{type:"error",message:"Номер комнаты — 6 цифр"});
   let room=rooms.get(number);
   if(!room){if(data.type==="join")return send(ws,{type:"error",message:"Комната не найдена"});room={code:number,clients:new Set(),state:fresh()};rooms.set(number,room)}
   if(room.clients.size>=2)return send(ws,{type:"error",message:"Комната заполнена"});
   if(ws.room)return send(ws,{type:"error",message:"Вы уже в комнате"});
   ws.room=room;ws.seat=[0,1].find(seat=>![...room.clients].some(client=>client.seat===seat));room.clients.add(ws);publish(room);return;
  }
  const room=ws.room;if(!room)return;
  const state=room.state;if(room.clients.size<2)return send(ws,{type:"error",message:"Ждём второго игрока"});
  if(data.type==="roll"){
   if(state.turn!==ws.seat||state.die!==null||state.won)return;
   state.die=randomInt(1,7);state.stepsLeft=state.die;state.message="Выпало "+state.die;publish(room);
  }
  if(data.type==="move"){
   if(state.turn!==ws.seat||state.die===null||state.won)return;
   const target=Math.min(59,state.pos[ws.seat]+state.stepsLeft);
   if(data.target!==target)return send(ws,{type:"error",message:"Неверная клетка"});
   state.pos[ws.seat]=target;state.stepsLeft=0;state.die=null;
   if(target===59){state.won=true;state.message="Победа!"}
   else{state.turn=1-state.turn;state.message="Ход другого игрока"}
   publish(room);
  }
  if(data.type==="reset"&&ws.seat===0){room.state=fresh();publish(room)}
 });
 ws.on("close",()=>{const room=ws.room;if(!room)return;room.clients.delete(ws);if(!room.clients.size)rooms.delete(room.code);else publish(room)});
});
console.log("Game websocket server listening on",port);
