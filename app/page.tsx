"use client";
import {useState,useRef,useEffect} from "react";
import "./style.css";
import words from "../data/words.json";
const TOTAL=60;
const FINISH=60;
function destination(position:number,steps:number){const next=position+steps;return next>=TOTAL-1?FINISH:next}
const START_POINT={x:4,y:23};
const FINISH_POINT={x:4,y:85};
const cells=Array.from({length:TOTAL},(_,i)=>{const row=Math.floor(i/10),col=i%10;return {x:9+(row%2?9-col:col)*9.1,y:23+row*12.4}});
type Mode="local"|"bot"|"online";
type Avatar="flamingo"|"robot"|"fox"|"unicorn"|"dino"|"cat";
type PlayerInfo={name:string;avatar:Avatar};
const avatarOptions:{id:Avatar;label:string;emoji:string}[]=[{id:"flamingo",label:"Фламинго",emoji:"🦩"},{id:"robot",label:"Робот",emoji:"🤖"},{id:"fox",label:"Лисёнок",emoji:"🦊"},{id:"unicorn",label:"Единорог",emoji:"🦄"},{id:"dino",label:"Динозавр",emoji:"🦖"},{id:"cat",label:"Котик",emoji:"🐱"}];
function AvatarFigure({avatar}:{avatar:Avatar}){return <span className={"avatar-figure avatar-"+avatar}>{avatar==="robot"?<RobotFigure/>:avatarOptions.find(a=>a.id===avatar)?.emoji}</span>}

const STORAGE="flamingo-robot-island:v2";
type Language="ru"|"pl"|"en";
type Settings={language:Language;maxLetters:number;addition:boolean;subtraction:boolean;mathMax:number};
type Challenge={type:"letter"|"word"|"math";prompt:string;answer:string;options?:string[]};
const DEFAULT_SETTINGS:Settings={language:"ru",maxLetters:4,addition:true,subtraction:true,mathMax:10};
const SETTINGS_KEY="flamingo-robot-island:task-settings";
function blockSecondaryMouse(event:MouseEvent){
 if(event.button===1||event.button===2)event.preventDefault();
}

function createBoard(){const indexes=Array.from({length:TOTAL},(_,i)=>i);for(let i=indexes.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[indexes[i],indexes[j]]=[indexes[j],indexes[i]]}const board:Record<number,"letter"|"word"|"math">={};indexes.slice(0,Math.floor(TOTAL*.45)).forEach((i,n)=>{board[i]=(["letter","word","math"] as const)[n%3]});return board}
function createChallenge(type:"letter"|"word"|"math",settings:Settings):Challenge{
 const pick=<T,>(items:T[])=>items[Math.floor(Math.random()*items.length)];
 const groups=words[settings.language] as Record<string,string[]>;
 const candidates=Object.entries(groups).filter(([length])=>Number(length)<=settings.maxLetters).flatMap(([,items])=>items);
 const word=pick(candidates.length?candidates:["mama"]);
 if(type==="word")return {type,prompt:"Напиши слово: "+word.toLocaleUpperCase(),answer:word};
 if(type==="letter"){const letter=pick(Array.from(word));const alphabet=Array.from(new Set(candidates.join(""))).filter(c=>c!==letter);return {type,prompt:"Нажми букву "+letter.toLocaleUpperCase(),answer:letter,options:[letter,...alphabet.sort(()=>Math.random()-.5).slice(0,3)].sort(()=>Math.random()-.5)}}
 const max=settings.mathMax;const minus=settings.subtraction&&(!settings.addition||Math.random()<.5);
 const a=Math.floor(Math.random()*(max+1)),b=Math.floor(Math.random()*(minus?a+1:max-a+1));
 return {type,prompt:`${a} ${minus?"−":"+"} ${b} = ?`,answer:String(minus?a-b:a+b)};
}
function RobotFigure(){return <svg className="robot-figure" viewBox="0 0 80 128" xmlns="http://www.w3.org/2000/svg" aria-label="Робот в полный рост" role="img"><defs><linearGradient id="robot-metal" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#e4faff"/><stop offset=".5" stopColor="#7dc4e4"/><stop offset="1" stopColor="#367ca9"/></linearGradient></defs><path d="M40 18V8" stroke="#315c83" strokeWidth="5" strokeLinecap="round"/><circle cx="40" cy="7" r="6" fill="#ffb547"/><rect x="13" y="17" width="54" height="41" rx="13" fill="url(#robot-metal)" stroke="#285b82" strokeWidth="3"/><rect x="21" y="27" width="38" height="22" rx="9" fill="#183e69"/><circle cx="31" cy="38" r="6" fill="#80ffef"/><circle cx="49" cy="38" r="6" fill="#80ffef"/><path d="M34 48h12" stroke="#ffdc73" strokeWidth="3" strokeLinecap="round"/><rect x="23" y="60" width="34" height="40" rx="8" fill="url(#robot-metal)" stroke="#285b82" strokeWidth="3"/><rect x="29" y="69" width="22" height="19" rx="5" fill="#356e9b"/><circle cx="40" cy="78" r="6" fill="#ffce6e"/><path d="M21 68L10 88M59 68l11 20" stroke="#3b83af" strokeWidth="9" strokeLinecap="round"/><circle cx="9" cy="91" r="7" fill="#ffbd74"/><circle cx="71" cy="91" r="7" fill="#ffbd74"/><path d="M33 100v15M47 100v15" stroke="#376c9c" strokeWidth="10" strokeLinecap="round"/><rect x="20" y="111" width="19" height="10" rx="5" fill="#285b82"/><rect x="41" y="111" width="19" height="10" rx="5" fill="#285b82"/></svg>}
export default function Home(){
 const [pos,setPos]=useState([-1,-1]),[turn,setTurn]=useState(0),[die,setDie]=useState<number|null>(null),[message,setMessage]=useState("Брось кубик, чтобы начать приключение!"),[won,setWon]=useState(false),[holding,setHolding]=useState(false),[sound,setSound]=useState(true);
 const [stepsLeft,setStepsLeft]=useState(0);
 const [settings,setSettings]=useState<Settings>(DEFAULT_SETTINGS);
 const [players,setPlayers]=useState<PlayerInfo[]>([{name:"Игрок 1",avatar:"flamingo"},{name:"Игрок 2",avatar:"robot"}]);
 const [myName,setMyName]=useState("");
 const [myAvatar,setMyAvatar]=useState<Avatar>("flamingo");
 const [avatarChosen,setAvatarChosen]=useState(false);
 const [roomPreview,setRoomPreview]=useState<{room:string;players:(PlayerInfo|null)[];exists:boolean;full:boolean}|null>(null);
 function changeAvatar(index:number,avatar:Avatar){setPlayers(old=>old.map((p,i)=>i===index?{...p,avatar}:i===1-index&&p.avatar===avatar?{...p,avatar:old[index].avatar}:p))}

 const [board,setBoard]=useState<Record<number,"letter"|"word"|"math">>({});
 useEffect(()=>{
  const blockMenu=(event:MouseEvent)=>event.preventDefault();
  document.addEventListener("contextmenu",blockMenu);
  document.addEventListener("auxclick",blockSecondaryMouse);
  document.addEventListener("mousedown",blockSecondaryMouse);
  return ()=>{
   document.removeEventListener("contextmenu",blockMenu);
   document.removeEventListener("auxclick",blockSecondaryMouse);
   document.removeEventListener("mousedown",blockSecondaryMouse);
  };
 },[]);
 const [challenge,setChallenge]=useState<Challenge|null>(null);
 const [answer,setAnswer]=useState("");
 const [bonusNotice,setBonusNotice]=useState(false);
 const [winner,setWinner]=useState<number|null>(null);
 const [finishPlayer,setFinishPlayer]=useState<number|null>(null);
 const [confettiKey,setConfettiKey]=useState(0);
 function finish(player:number){setPos(old=>old.map((p,i)=>i===player?FINISH:p));setConfettiKey(n=>n+1);setWinner(player);setFinishPlayer(player);setWon(true);setDie(null);setStepsLeft(0);setChallenge(null);setMessage(players[player].name+" победил! Ура!")}
 function completeTurn(skipped=false){setChallenge(null);setAnswer("");if(skipped){setTurn(1-turn);setMessage("Задание пропущено. Ход другого игрока.")}else{setMessage("Молодец! Ты правильно решил задачу и получаешь дополнительный ход. Ходи ещё раз!");setBonusNotice(true)}}
 function skipChallenge(){if(!challenge)return;if(mode==="online"){onlineSend("skip");return}completeTurn(true)}
 function checkAnswer(value:string){if(!challenge)return;if(mode==="online"){onlineSend("answer",{answer:value});return}const ok=value.trim().toLocaleLowerCase()===challenge.answer.toLocaleLowerCase();if(ok)completeTurn(false);else setMessage("Попробуй ещё раз!")}
 function resolveCell(index:number,player:number){if(index>=FINISH){finish(player);return}const kind=board[index];if(kind){setChallenge(createChallenge(kind,settings));setAnswer("");setMessage("Выполни задание!")}else{setTurn(1-player);setMessage("Теперь ход другого героя.")}}

 const [coconuts,setCoconuts]=useState([0,0,0]);
 const [shakingPalm,setShakingPalm]=useState<number|null>(null);
 const palmGesture=useRef<{id:number;index:number;lastX:number;direction:number;swings:number;triggered:boolean}|null>(null);
 function palmDown(e:React.PointerEvent<HTMLSpanElement>,index:number){
  e.preventDefault();e.stopPropagation();
  palmGesture.current={id:e.pointerId,index,lastX:e.clientX,direction:0,swings:0,triggered:false};
  setShakingPalm(index);if(mode==="online")onlineSend("palm_start",{index});e.currentTarget.setPointerCapture(e.pointerId);
 }
 function palmMove(e:React.PointerEvent<HTMLSpanElement>){
  const g=palmGesture.current;if(!g||g.id!==e.pointerId)return;
  const delta=e.clientX-g.lastX;
  if(Math.abs(delta)<16)return;
  const direction=Math.sign(delta);g.lastX=e.clientX;
  if(g.direction!==0&&direction!==g.direction)g.swings++;
  g.direction=direction;
  if(g.swings>=4&&!g.triggered){
   g.triggered=true;
   setCoconuts(old=>old.map((n,i)=>i===g.index?Math.min(n+2,8):n));
   if(mode==="online")onlineSend("palm_drop",{index:g.index});
  }
 }
 function palmUp(){const index=palmGesture.current?.index;if(index!==undefined&&mode==="online")onlineSend("palm_stop",{index});palmGesture.current=null;setShakingPalm(null)}

 const [mode,setMode]=useState<Mode|null>(null);
 const [room,setRoom]=useState("");
 const [roomError,setRoomError]=useState("");
 const [onlineSeat,setOnlineSeat]=useState<number|null>(null);
 const [onlinePlayers,setOnlinePlayers]=useState(0);
 const socketRef=useRef<WebSocket|null>(null);
 const [botVisual,setBotVisual]=useState<{from:number,to:number}|null>(null);
 const [botTravel,setBotTravel]=useState(false);
 const wsUrl=process.env.NEXT_PUBLIC_GAME_WS_URL;
 useEffect(()=>{
  if(roomPreview?.room!==room||!roomPreview.exists)return;
  if(roomPreview.players.some(p=>p?.avatar===myAvatar)){
   const free=avatarOptions.find(a=>!roomPreview.players.some(p=>p?.avatar===a.id));
   if(free){setMyAvatar(free.id);setAvatarChosen(true)}
  }
 },[roomPreview,room,myAvatar]);
 useEffect(()=>{
  if(mode!=="online"||room.length!==6||!wsUrl){setRoomPreview(null);return}
  const ws=new WebSocket(wsUrl);
  ws.onopen=()=>ws.send(JSON.stringify({type:"preview",room}));
  ws.onmessage=e=>{try{const d=JSON.parse(e.data);if(d.type==="room_preview"){setRoomPreview(d);ws.close()}}catch{}};
  ws.onerror=()=>setRoomPreview(null);
  return ()=>ws.close();
 },[room,mode,wsUrl]);

 function connectRoom(action:"create"|"join"){
  if(!wsUrl){setRoomError("Сервер комнат ещё не подключён");return}
  if(action==="join"&&!/^\d{6}$/.test(room)){setRoomError("Введи 6 цифр");return}
  if(action==="join"&&roomPreview?.room===room&&roomPreview.players.some(p=>p?.avatar===myAvatar)){setRoomError("Этот персонаж уже занят. Выбери другого.");return}
  socketRef.current?.close();
  setRoomError("Подключение…");
  const ws=new WebSocket(wsUrl);socketRef.current=ws;
  ws.onopen=()=>ws.send(JSON.stringify({type:action,room,settings,name:myName.trim()||"Игрок",avatar:myAvatar,avatarAuto:!avatarChosen}));
  ws.onmessage=event=>{try{
   const data=JSON.parse(event.data);
   if(data.type==="error"){setRoomError(data.message);return}
   if(data.type==="palm_start"){if(Number.isInteger(data.index))setShakingPalm(data.index);return}
   if(data.type==="palm_stop"){setShakingPalm(null);return}
   if(data.type==="palm_drop"){if(Array.isArray(data.coconuts))setCoconuts(data.coconuts);return}
   if(data.type==="state"){
    setRoomError("");setRoom(data.room);setOnlineSeat(data.seat);setOnlinePlayers(data.players);
    if(Array.isArray(data.state.players))setPlayers(data.state.players.map((p:PlayerInfo|null,i:number)=>p??{name:"Ожидаем игрока",avatar:i===0?"flamingo":"robot"}));
    setPos(data.state.pos);setTurn(data.state.turn);setDie(data.state.die);
    if(Array.isArray(data.state.coconuts))setCoconuts(data.state.coconuts);
    setStepsLeft(data.state.stepsLeft);setWon(data.state.won);setMessage(data.state.message);if(data.state.board)setBoard(data.state.board);setChallenge(data.state.challenge??null);if(data.state.settings)setSettings(data.state.settings);if(data.state.winner!==null&&data.state.winner!==undefined&&!won)setConfettiKey(n=>n+1);setWinner(data.state.winner??null);
   }
  }catch{}};
  ws.onerror=()=>setRoomError("Не удалось подключиться к серверу");
  ws.onclose=()=>{setOnlinePlayers(0);setOnlineSeat(null)};
 }
 function onlineSend(type:string,extra:Record<string,unknown>={}){socketRef.current?.send(JSON.stringify({type,...extra}))}

 const [loaded,setLoaded]=useState(false);
 const [botBusy,setBotBusy]=useState(false);
 const [diceScreen,setDiceScreen]=useState<{x:number,y:number}|null>(null);
 const [diceFlying,setDiceFlying]=useState(false);
 const [diceOrigin,setDiceOrigin]=useState<{x:number,y:number}|null>(null);
 const diceButtonRef=useRef<HTMLButtonElement>(null);
 const botTimers=useRef<ReturnType<typeof setTimeout>[]>([]);
 useEffect(()=>{
  try{const savedSettings=localStorage.getItem(SETTINGS_KEY);if(savedSettings)setSettings({...DEFAULT_SETTINGS,...JSON.parse(savedSettings)});}catch{}
  try{const raw=localStorage.getItem(STORAGE);if(raw){const d=JSON.parse(raw);
   if((d.mode==="local"||d.mode==="bot")&&d.pos&&Array.isArray(d.pos))setMode(d.mode);
   if(typeof d.room==="string")setRoom(d.room);
   if(Array.isArray(d.pos)&&d.pos.length===2)setPos(d.pos.map((n:number)=>Math.max(-1,Math.min(FINISH,Number(n)||0))));
   if(d.turn===0||d.turn===1)setTurn(d.turn);
   if(Number.isInteger(d.die)&&d.die>=1&&d.die<=6)setDie(d.die);
   if(Number.isInteger(d.stepsLeft)&&d.stepsLeft>=0&&d.stepsLeft<=6)setStepsLeft(d.stepsLeft);
   if(typeof d.won==="boolean")setWon(d.won);
   if(typeof d.message==="string")setMessage(d.message);
   if(d.board&&typeof d.board==="object")setBoard(d.board);else setBoard(createBoard());
   if(d.challenge)setChallenge(d.challenge);
   if(Array.isArray(d.players)&&d.players.length===2)setPlayers(d.players);
   if(d.winner===0||d.winner===1){setWinner(d.winner);setFinishPlayer(d.winner)}
   if(Array.isArray(d.coconuts)&&d.coconuts.length===3)setCoconuts(d.coconuts.map((n:number)=>Math.max(0,Math.min(8,Number(n)||0))));
  }else setBoard(createBoard());}catch{setBoard(createBoard())}setLoaded(true);
 },[]);
 useEffect(()=>{if(!loaded)return;try{if(mode===null){localStorage.removeItem(STORAGE);return}localStorage.setItem(STORAGE,JSON.stringify({mode,room,pos,turn,die,stepsLeft,won,message,coconuts,board,challenge,winner,players}));}catch{}},[loaded,mode,room,pos,turn,die,stepsLeft,won,message,coconuts,board,challenge,winner,players]);
 useEffect(()=>{if(loaded)localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))},[settings,loaded]);
 useEffect(()=>()=>{botTimers.current.forEach(clearTimeout)},[]);
 function scheduleBot(fn:()=>void,delay:number){const t=setTimeout(fn,delay);botTimers.current.push(t)}
 function selectMode(next:Mode){reset();if(next==="online"){setMyAvatar("flamingo");setAvatarChosen(false)}setMode(next);setMessage("Брось кубик, чтобы начать приключение!")}
 function clearProgress(){socketRef.current?.close();setOnlineSeat(null);setOnlinePlayers(0);botTimers.current.forEach(clearTimeout);botTimers.current=[];setMode(null);setRoom("");setBotBusy(false);botStepPending.current=false;reset();try{localStorage.removeItem(STORAGE)}catch{}}
 
 const [heroDrag,setHeroDrag]=useState<{player:number,x:number,y:number}|null>(null);
 const heroPointer=useRef<{player:number,id:number,startX:number,startY:number,moved:boolean}|null>(null);
 const pathRef=useRef<HTMLDivElement>(null);
 function heroDown(e:React.PointerEvent<HTMLSpanElement>,player:number){
  if(player!==turn||die===null||won||(mode==="bot"&&turn===1)||(mode==="online"&&(onlineSeat!==turn||onlinePlayers<2)))return;
  e.preventDefault();e.stopPropagation();
  heroPointer.current={player,id:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false};
  setHeroDrag({player,x:e.clientX,y:e.clientY});
 }
 function heroMove(_e:React.PointerEvent<HTMLSpanElement>){}
 function heroUp(_e:React.PointerEvent<HTMLSpanElement>){}
 useEffect(()=>{
  if(!heroDrag)return;
  const onMove=(e:PointerEvent)=>{
   const d=heroPointer.current;if(!d||d.id!==e.pointerId)return;
   if(Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>4)d.moved=true;
   setHeroDrag({player:d.player,x:e.clientX,y:e.clientY});
  };
  const onUp=(e:PointerEvent)=>{
   const d=heroPointer.current;if(!d||d.id!==e.pointerId)return;
   heroPointer.current=null;setHeroDrag(null);
   if(!d.moved)return;
   const bounds=pathRef.current?.getBoundingClientRect();if(!bounds)return;
   const target=destination(pos[d.player],stepsLeft);
   const c=target===FINISH?FINISH_POINT:cells[target];
   const cx=bounds.left+bounds.width*c.x/100,cy=bounds.top+bounds.height*c.y/100;
   const tolerance=Math.max(34,Math.min(bounds.width/12,70));
   if(Math.hypot(e.clientX-cx,e.clientY-cy)<=tolerance)move(target);
   else setMessage("Отпусти фламинго или робота на жёлтой клетке!");
  };
  const cancel=()=>{heroPointer.current=null;setHeroDrag(null)};
  window.addEventListener("pointermove",onMove);
  window.addEventListener("pointerup",onUp);
  window.addEventListener("pointercancel",cancel);
  return ()=>{window.removeEventListener("pointermove",onMove);window.removeEventListener("pointerup",onUp);window.removeEventListener("pointercancel",cancel)};
 },[heroDrag!==null,pos,stepsLeft,turn,die,won,mode]);
 const pointer=useRef(false);
 const drag=useRef({x:0,y:0,lastX:0,lastY:0,shake:0});
 const [diceMotion,setDiceMotion]=useState({x:0,y:0,rx:0,ry:0,rz:0});
 const [rolling,setRolling]=useState(false);
 const [face,setFace]=useState(1);
 const [diceRotation,setDiceRotation]=useState({x:0,y:0});
 const diceFaces=[[0,0],[0,-90],[-90,0],[90,0],[0,90],[0,180]];
 function beginDrag(e:React.PointerEvent<HTMLButtonElement>){if(die!==null||won||rolling||botBusy||challenge||bonusNotice||(mode==="online"&&(onlineSeat!==turn||onlinePlayers<2)))return;pointer.current=true;drag.current={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,shake:0};const r=e.currentTarget.getBoundingClientRect();setDiceOrigin({x:r.left+r.width/2,y:r.top+r.height/2});setDiceScreen({x:e.clientX,y:e.clientY});setHolding(true);e.currentTarget.setPointerCapture(e.pointerId)}
 function dragDice(e:React.PointerEvent<HTMLButtonElement>){if(!pointer.current)return;const d=drag.current;const dx=e.clientX-d.x,dy=e.clientY-d.y;d.shake+=Math.abs(e.clientX-d.lastX)+Math.abs(e.clientY-d.lastY);d.lastX=e.clientX;d.lastY=e.clientY;setDiceScreen({x:e.clientX,y:e.clientY});setDiceMotion({x:dx,y:dy,rx:-dy*.8,ry:dx*.8,rz:Math.sin(d.shake/20)*18})}
 function rollResult(n:number,bot=false){
  setRolling(true);setDiceFlying(true);setDiceMotion({x:0,y:0,rx:0,ry:0,rz:0});
  const [rx,ry]=diceFaces[n-1];setFace(n);
  setDiceRotation(old=>({x:Math.ceil(old.x/360)*360+720+rx,y:Math.ceil(old.y/360)*360+720+ry}));
  if(bot){const r=diceButtonRef.current?.getBoundingClientRect();if(r){setDiceOrigin({x:r.left+r.width/2,y:r.top+r.height/2});setDiceScreen({x:r.left+r.width/2-80,y:r.top+r.height/2-110})}}
  scheduleBot(()=>{setRolling(false);setDiceFlying(false);setDiceScreen(null);setDie(n);setStepsLeft(n);setMessage(`Выпало ${n}! ${bot?"Робот делает ход.":`С клетки ${pos[turn]+1} переходи на ${(destination(pos[turn],n)===FINISH?"FINISH":String(destination(pos[turn],n)+1))}.`}`)},950);
 }
 function releaseDice(){if(!pointer.current)return;pointer.current=false;setHolding(false);if(mode==="online"){setDiceScreen(null);onlineSend("roll")}else rollResult(Math.floor(Math.random()*6)+1)}
 const botStepPending=useRef(false);
 useEffect(()=>{
  if(!loaded||mode!=="bot"||turn!==1||won||rolling||challenge||bonusNotice)return;
  if(die===null&&stepsLeft===0&&!botBusy){
   setBotBusy(true);scheduleBot(()=>rollResult(Math.floor(Math.random()*6)+1,true),800);return;
  }
  if(die!==null&&stepsLeft>0&&!botStepPending.current){
   botStepPending.current=true;
   const target=destination(pos[1],1);
   setBotVisual({from:pos[1],to:target});
   setBotTravel(false);
   scheduleBot(()=>setBotTravel(true),40);
   scheduleBot(()=>{
    setBotVisual(null);setBotTravel(false);
    botStepPending.current=false;
    const target=destination(pos[1],1);
    setPos(previous=>[previous[0],target]);
    const remaining=stepsLeft-1;
    setStepsLeft(remaining);
    if(target===FINISH){setBotBusy(false);finish(1)}
    else if(remaining===0){setDie(null);setBotBusy(false);if(board[target]){setMessage("Робот выполнил задание и получает дополнительный бросок!")}else{setTurn(0);setMessage("Робот допрыгал! Теперь твоя очередь!")}}
    else setMessage(`Робот прыгает: шаг ${die-remaining} из ${die}!`);
   },1450);
  }
 },[loaded,mode,turn,won,rolling,die,stepsLeft,pos,botBusy]);
 function move(i:number){
  if(die===null||won||stepsLeft<=0||challenge||(mode==="bot"&&turn===1))return;
  const target=destination(pos[turn],stepsLeft);
  if(i!==target){setMessage(`Нужна подсвеченная клетка № ${target+1}!`);return}
  if(mode==="online"){if(onlineSeat!==turn||onlinePlayers<2)return;onlineSend("move",{target});return}
  const next=[...pos];next[turn]=target;setPos(next);setStepsLeft(0);setDie(null);
  resolveCell(target,turn);
 }
 function restartToMenu(){socketRef.current?.close();socketRef.current=null;setOnlineSeat(null);setOnlinePlayers(0);setRoom("");reset();setMode(null);try{localStorage.removeItem(STORAGE)}catch{}}
 function reset(){botTimers.current.forEach(clearTimeout);botTimers.current=[];botStepPending.current=false;setBotVisual(null);setBotTravel(false);setBoard(createBoard());setChallenge(null);setBonusNotice(false);setWinner(null);setFinishPlayer(null);setAnswer("");setCoconuts([0,0,0]);botTimers.current.forEach(clearTimeout);botTimers.current=[];setBotBusy(false);botStepPending.current=false;setDiceScreen(null);setDiceFlying(false);setPos([-1,-1]);setConfettiKey(0);setTurn(0);setDie(null);setStepsLeft(0);setHeroDrag(null);setWon(false);setRolling(false);setFace(1);setDiceRotation({x:0,y:0});setDiceMotion({x:0,y:0,rx:0,ry:0,rz:0});setMessage("Брось кубик, чтобы начать приключение!")}
 if(!loaded)return <main className="game-loading">Загрузка игры…</main>;
 if(mode===null||(mode==="online"&&onlineSeat===null))return <main className="mode-screen"><div className="mode-dialog"><h1>🏝️ Остров сокровищ</h1><p>Выбери, как будем играть</p><details className="game-settings"><summary>⚙️ Настройки заданий</summary><label>Язык букв и слов<select value={settings.language} onChange={e=>setSettings(v=>({...v,language:e.target.value as Language}))}><option value="ru">Русский</option><option value="pl">Польский</option><option value="en">Английский</option></select></label><label>Максимум букв<select value={settings.maxLetters} onChange={e=>setSettings(v=>({...v,maxLetters:Number(e.target.value)}))}>{[3,4,5,6,7,8].map(n=><option key={n} value={n}>{n}</option>)}</select></label><label><input type="checkbox" checked={settings.addition} onChange={e=>setSettings(v=>({...v,addition:e.target.checked,subtraction:!e.target.checked&&!v.subtraction?true:v.subtraction}))}/> Сложение</label><label><input type="checkbox" checked={settings.subtraction} onChange={e=>setSettings(v=>({...v,subtraction:e.target.checked,addition:!e.target.checked&&!v.addition?true:v.addition}))}/> Вычитание</label><label>Числа до<select value={settings.mathMax} onChange={e=>setSettings(v=>({...v,mathMax:Number(e.target.value)}))}>{Array.from({length:10},(_,i)=>(i+1)*10).map(n=><option key={n} value={n}>{n}</option>)}</select></label></details><div className="mode-options"><button onClick={()=>selectMode("local")}>👫 Вдвоём на одном компьютере <small>Ходите по очереди</small></button><button onClick={()=>selectMode("bot")}>🤖 Играть с роботом <small>Робот бросает кубик и ходит сам</small></button><button onClick={()=>selectMode("online")}>🌐 Играть по сети <small>Играть вдвоём через интернет</small></button></div>{mode==="online"&&<div className="room-form"><h2>Игра по сети</h2><label>Твоё имя<input maxLength={24} value={myName} onChange={e=>setMyName(e.target.value)} placeholder="Как тебя зовут?"/></label><div className="avatar-picker">{avatarOptions.filter(a=>!(room.length===6&&roomPreview?.room===room&&roomPreview.players.some(p=>p?.avatar===a.id))).map(a=><button key={a.id} type="button" title={a.label} aria-label={a.label} aria-pressed={myAvatar===a.id} className={myAvatar===a.id?"selected":""} onClick={()=>{setMyAvatar(a.id);setAvatarChosen(true)}}><AvatarFigure avatar={a.id}/></button>)}</div><button onClick={()=>connectRoom("create")}>Создать новую комнату</button><label>Или введи номер комнаты<input inputMode="numeric" pattern="[0-9]*" value={room} onChange={e=>setRoom(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="6 цифр"/></label>{roomPreview?.room===room&&roomPreview.exists&&<p>В комнате: {roomPreview.players.filter(Boolean).map(p=><span key={p!.name}>{p!.name} · </span>)}</p>}<button onClick={()=>connectRoom("join")}>Присоединиться</button>{roomError&&<p role="alert">{roomError}</p>}<button onClick={()=>setMode(null)}>Назад</button></div>}<button className="clear-save" onClick={clearProgress}>Стереть сохранение и начать заново</button></div></main>;
 return <main className="game"><section className="world"><div className="sky"><span className="cloud cloud1">☁️</span><span className="cloud cloud2">☁️</span></div><div className="ocean"></div><div className="island"><div className="hill hill1"></div><div className="hill hill2"></div><div className="lagoon"></div><div className="waterfall"></div><div className="bridge"></div><span className={"decoration palm-interactive palm-a"+(shakingPalm===0?" palm-shaking":"")} onPointerDown={e=>palmDown(e,0)} onPointerMove={palmMove} onPointerUp={palmUp} onPointerCancel={palmUp} role="button" aria-label="Потряси пальму, чтобы упали кокосы">🌴{Array.from({length:coconuts[0]},(_,j)=><span key={j} className="coconut" style={{left:`${22+(j%3)*16}%`,top:`${75+Math.floor(j/3)*12}%`,animationDelay:`${j*110}ms`}}>🥥</span>)}</span><span className={"decoration palm-interactive palm-b"+(shakingPalm===1?" palm-shaking":"")} onPointerDown={e=>palmDown(e,1)} onPointerMove={palmMove} onPointerUp={palmUp} onPointerCancel={palmUp} role="button" aria-label="Потряси пальму, чтобы упали кокосы">🌴{Array.from({length:coconuts[1]},(_,j)=><span key={j} className="coconut" style={{left:`${22+(j%3)*16}%`,top:`${75+Math.floor(j/3)*12}%`,animationDelay:`${j*110}ms`}}>🥥</span>)}</span><span className={"decoration palm-interactive palm-c"+(shakingPalm===2?" palm-shaking":"")} onPointerDown={e=>palmDown(e,2)} onPointerMove={palmMove} onPointerUp={palmUp} onPointerCancel={palmUp} role="button" aria-label="Потряси пальму, чтобы упали кокосы">🌴{Array.from({length:coconuts[2]},(_,j)=><span key={j} className="coconut" style={{left:`${22+(j%3)*16}%`,top:`${75+Math.floor(j/3)*12}%`,animationDelay:`${j*110}ms`}}>🥥</span>)}</span><span className="decoration flower-a">🌺</span><span className="decoration flower-b">🌸</span><span className="decoration rock">🪨</span><span className="decoration treasure">🏆</span><span className="decoration shell">🐚</span></div><div className="path" ref={pathRef}><svg className="path-line" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={[START_POINT,...cells,FINISH_POINT].map(c=>`${c.x},${c.y}`).join(" ")} fill="none" stroke="#a56c3b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 1"/><polyline points={cells.map(c=>`${c.x},${c.y}`).join(" ")} fill="none" stroke="#ffe8a3" strokeWidth=".55" strokeLinecap="round" strokeLinejoin="round"/></svg>{pos.map((p,j)=>p===-1&&!(j===1&&botVisual)?<span key={j} className={"hero hero-start hero-character "+(players[j].avatar==="robot"?"hero-robot":"hero-flamingo")+(heroDrag?.player===j||botVisual&&j===1?" hero-origin-dragging":"")} style={{left:`calc(${START_POINT.x}% + ${j===0?"1":"-1"} * var(--start-piece-offset))`,top:START_POINT.y+"%"}} onPointerDown={e=>heroDown(e,j)} onPointerMove={heroMove} onPointerUp={heroUp} onPointerCancel={()=>{heroPointer.current=null;setHeroDrag(null)}} onClick={e=>e.stopPropagation()} role="button" aria-label={j===0?"Перетащить фламинго":"Перетащить робота"}>{<AvatarFigure avatar={players[j].avatar}/>}</span>:null)}<div className="start-finish-zone start-big" style={{left:START_POINT.x+"%",top:START_POINT.y+"%"}}>START</div><button type="button" className={"start-finish-zone finish-big"+(die!==null&&!won&&destination(pos[turn],stepsLeft)===FINISH?" suggested":"")} style={{left:FINISH_POINT.x+"%",top:FINISH_POINT.y+"%"}} onClick={()=>{if(die!==null&&!won&&destination(pos[turn],stepsLeft)===FINISH)move(FINISH);else setConfettiKey(n=>n+1)}} aria-label="Финиш — перейти на финиш или запустить конфетти">🏁 FINISH</button>{pos.map((p,j)=>p===FINISH&&!(j===1&&botVisual)?<span key={j} className={"hero finish-hero hero-character "+(players[j].avatar==="robot"?"hero-robot":"hero-flamingo")} style={{left:FINISH_POINT.x+"%",top:FINISH_POINT.y+"%"}}>{<AvatarFigure avatar={players[j].avatar}/>}</span>:null)}{cells.map((c,i)=><button key={i} className={"stone "+(die!==null&&i===destination(pos[turn],stepsLeft)?"suggested":"")} style={{left:c.x+"%",top:c.y+"%"}} aria-label={`Клетка ${i+1}`} onClick={()=>{if(!(mode==="bot"&&turn===1))move(i)}}><span className="stone-label">{i+1}</span>{board[i]&&<span className="stone-task-icon" aria-hidden="true">{board[i]==="letter"?"🔤":board[i]==="word"?"✏️":"➕"}</span>}{pos.map((p,j)=>p===i&&!(j===1&&botVisual)?<span key={j} className={"hero hero-character "+(players[j].avatar==="robot"?"hero-robot":"hero-flamingo")+(heroDrag?.player===j?" hero-origin-dragging":"")} onPointerDown={e=>heroDown(e,j)} onPointerMove={heroMove} onPointerUp={heroUp} onPointerCancel={()=>{heroPointer.current=null;setHeroDrag(null)}} onClick={e=>e.stopPropagation()} role="button" aria-label={`Перетащить ${j===0?"фламинго":"робота"}`}>{j===0?"🦩":<RobotFigure/>}</span>:null)}</button>)}</div>{botVisual&&<div className={"bot-moving-piece"+(botTravel?" bot-moving-piece-active":"")} style={{left:(botTravel?(botVisual.to===FINISH?FINISH_POINT:cells[botVisual.to]).x:(botVisual.from<0?START_POINT.x:cells[botVisual.from].x))+"%",top:(botTravel?(botVisual.to===FINISH?FINISH_POINT:cells[botVisual.to]).y:(botVisual.from<0?START_POINT.y:cells[botVisual.from].y))+"%"}}><AvatarFigure avatar={players[1].avatar}/></div>}{heroDrag&&<div className="hero-drag-overlay" style={{left:heroDrag.x,top:heroDrag.y}}>{<AvatarFigure avatar={players[heroDrag.player].avatar}/>}</div>}<div className="world-title">ОСТРОВ СОКРОВИЩ</div></section><aside className="panel"><div className="panel-top"><span className="eyebrow">ПРИКЛЮЧЕНИЕ</span><h1>Фламинго <span>и</span> Робот</h1><p>Вместе к сокровищам!</p>{mode==="online"&&<div className="online-match">{players.map((p,i)=><span key={i}><AvatarFigure avatar={p.avatar}/>{p.name}{i===onlineSeat?" (ты)":""}</span>)}</div>}<small>{mode==="bot"?"Игра с роботом":mode==="online"?`Комната ${room} · игроков ${onlinePlayers}/2 · ты ${onlineSeat===null?"ожидаешь":players[onlineSeat].name}`:"Два игрока на одном устройстве"}</small></div><div className="turn-card"><div className="turn-avatar"><AvatarFigure avatar={players[turn].avatar}/></div><div><small>СЕЙЧАС ХОДИТ</small><strong>{players[turn].name}</strong></div></div><div className="message" aria-live="polite">{message}</div>{bonusNotice&&<div className="challenge-backdrop"><div className="challenge-modal" role="dialog" aria-modal="true"><h2>Молодец!</h2><p>Ты правильно решил задачу и получаешь дополнительный ход. Ходи ещё раз!</p><button onClick={()=>setBonusNotice(false)}>Бросить кубик ещё раз</button></div></div>}{challenge&&<div className="challenge-backdrop" role="presentation"><div className="challenge-modal" role="dialog" aria-modal="true" aria-label="Задание"><div className="challenge"><div className="challenge-title">Задание · приз: дополнительный бросок</div><strong>{challenge.prompt}</strong>{challenge.type==="letter"?<div className="letter-options">{challenge.options?.map((option,i)=><button key={i} onClick={()=>checkAnswer(option)}>{option.toLocaleUpperCase()}</button>)}</div>:<form onSubmit={e=>{e.preventDefault();checkAnswer(answer)}}><input autoFocus value={answer} onChange={e=>setAnswer(challenge.type==="math"?e.target.value:e.target.value.toLocaleUpperCase())} autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder={challenge.type==="math"?"Ответ":"Введи слово"} inputMode={challenge.type==="math"?"numeric":"text"}/><button type="submit">Проверить</button></form>}<button type="button" className="challenge-skip" onClick={skipChallenge}>Пропустить — без бонуса</button></div></div></div>}<div className="dice-area"><span className="section-label">БРОСЬ КУБИК</span><button ref={diceButtonRef} className={"die "+(holding?"held ":"")+(rolling?"rolling ":"")+((holding||diceFlying)?"die-in-flight":"")} disabled={die!==null||won||rolling||botBusy||(mode==="online"&&(onlineSeat!==turn||onlinePlayers<2))} onPointerDown={beginDrag} onPointerMove={dragDice} onPointerUp={releaseDice} onPointerCancel={()=>{pointer.current=false;setHolding(false);setDiceScreen(null);setDiceMotion({x:0,y:0,rx:0,ry:0,rz:0})}} aria-label="Подними, потряси и брось кубик"><span className="die-float" style={{transform:`rotateZ(${diceMotion.rz}deg) scale(${holding?1.15:rolling?.72:1})`}}><span className="die-cube" style={{transform:`rotateX(${diceRotation.x+diceMotion.rx}deg) rotateY(${diceRotation.y+diceMotion.ry}deg)`}}>{[1,2,3,4,5,6].map((n)=><span key={n} className={"die-face face-"+n}>{Array.from({length:n},(_,i)=><i key={i} className={"pip pip-"+n+"-"+i}/>)}</span>)}</span></span></button><span className="dice-hint">{die!==null?`Выпало ${die} · цель: клетка ${(destination(pos[turn],stepsLeft)===FINISH?"FINISH":String(destination(pos[turn],stepsLeft)+1))}`:"Захвати, потряси и отпусти"}</span></div>{(holding||diceFlying)&&diceScreen&&<div className={"dice-overlay "+(diceFlying?"dice-overlay-flying":"")} style={{left:diceScreen.x,top:diceScreen.y,["--dice-return-x" as string]:`${(diceOrigin?.x??diceScreen.x)-diceScreen.x}px`,["--dice-return-y" as string]:`${(diceOrigin?.y??diceScreen.y)-diceScreen.y}px`}}><span className="die-cube" style={{transform:`rotateX(${diceRotation.x+diceMotion.rx}deg) rotateY(${diceRotation.y+diceMotion.ry}deg)`}}>{[1,2,3,4,5,6].map(n=><span key={n} className={"die-face face-"+n}>{Array.from({length:n},(_,i)=><i key={i} className={"pip pip-"+n+"-"+i}/>)}</span>)}</span></div>}{confettiKey>0&&<div key={confettiKey} className="board-confetti" aria-hidden="true">{Array.from({length:110},(_,i)=><i key={i} style={{left:(i*43%100)+"%",animationDelay:(i%19*.08)+"s",background:["#ff5e9d","#ffd33d","#49cfd2","#7edb80","#9d7bee"][i%5]}}/>)}</div>}{won&&winner!==null&&<div className="victory" role="status"><div className="confetti">{Array.from({length:80},(_,i)=><i key={i} style={{left:(i*37%100)+"%",animationDelay:(i%17*.13)+"s",background:["#ff5e9d","#ffd33d","#49cfd2","#7edb80","#9d7bee"][i%5]}}/>)}</div><strong>🏆 {winner===0?"Фламинго":"Робот"} победил!</strong></div>}<div className="score">{players.map((p,i)=><div key={i}><AvatarFigure avatar={p.avatar}/> <span>{p.name}</span> <b>{Math.max(0,pos[i]+1)}</b><small>/ {TOTAL}</small></div>)}</div><div className="panel-actions"><button onClick={()=>setSound(!sound)} aria-label="Переключить звук">{sound?"🔊":"🔇"} Звук</button></div><p className="tip">Перетащи героя сразу на жёлтую клетку — число на кубике определяет расстояние.</p><button className="restart-game-button" onClick={restartToMenu}>Начать игру заново</button></aside></main>
}