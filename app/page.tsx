"use client";
import {useState,useRef,useEffect} from "react";
import "./style.css";
const TOTAL=60;
const cells=Array.from({length:TOTAL},(_,i)=>{const row=Math.floor(i/10),col=i%10;return {x:9+(row%2?9-col:col)*9.1,y:23+row*12.4}});
type Mode="local"|"bot"|"online";
const STORAGE="flamingo-robot-island:v2";
const tasks:Record<number,string>={3:"Назови три цвета на острове!",7:"Посчитай пальмы!",11:"Найди круг на дорожке!",15:"Назови цвет моря!",19:"Посчитай до пяти!"};
function RobotFigure(){return <svg className="robot-figure" viewBox="0 0 80 128" xmlns="http://www.w3.org/2000/svg" aria-label="Робот в полный рост" role="img"><defs><linearGradient id="robot-metal" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#e4faff"/><stop offset=".5" stopColor="#7dc4e4"/><stop offset="1" stopColor="#367ca9"/></linearGradient></defs><path d="M40 18V8" stroke="#315c83" strokeWidth="5" strokeLinecap="round"/><circle cx="40" cy="7" r="6" fill="#ffb547"/><rect x="13" y="17" width="54" height="41" rx="13" fill="url(#robot-metal)" stroke="#285b82" strokeWidth="3"/><rect x="21" y="27" width="38" height="22" rx="9" fill="#183e69"/><circle cx="31" cy="38" r="6" fill="#80ffef"/><circle cx="49" cy="38" r="6" fill="#80ffef"/><path d="M34 48h12" stroke="#ffdc73" strokeWidth="3" strokeLinecap="round"/><rect x="23" y="60" width="34" height="40" rx="8" fill="url(#robot-metal)" stroke="#285b82" strokeWidth="3"/><rect x="29" y="69" width="22" height="19" rx="5" fill="#356e9b"/><circle cx="40" cy="78" r="6" fill="#ffce6e"/><path d="M21 68L10 88M59 68l11 20" stroke="#3b83af" strokeWidth="9" strokeLinecap="round"/><circle cx="9" cy="91" r="7" fill="#ffbd74"/><circle cx="71" cy="91" r="7" fill="#ffbd74"/><path d="M33 100v15M47 100v15" stroke="#376c9c" strokeWidth="10" strokeLinecap="round"/><rect x="20" y="111" width="19" height="10" rx="5" fill="#285b82"/><rect x="41" y="111" width="19" height="10" rx="5" fill="#285b82"/></svg>}
export default function Home(){
 const [pos,setPos]=useState([-1,-1]),[turn,setTurn]=useState(0),[die,setDie]=useState<number|null>(null),[message,setMessage]=useState("Брось кубик, чтобы начать приключение!"),[won,setWon]=useState(false),[holding,setHolding]=useState(false),[sound,setSound]=useState(true);
 const [stepsLeft,setStepsLeft]=useState(0);
 const [coconuts,setCoconuts]=useState([0,0,0]);
 const [shakingPalm,setShakingPalm]=useState<number|null>(null);
 const palmGesture=useRef<{id:number;index:number;lastX:number;direction:number;swings:number;triggered:boolean}|null>(null);
 function palmDown(e:React.PointerEvent<HTMLSpanElement>,index:number){
  e.preventDefault();e.stopPropagation();
  palmGesture.current={id:e.pointerId,index,lastX:e.clientX,direction:0,swings:0,triggered:false};
  setShakingPalm(index);e.currentTarget.setPointerCapture(e.pointerId);
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
  }
 }
 function palmUp(){palmGesture.current=null;setShakingPalm(null)}

 const [mode,setMode]=useState<Mode|null>(null);
 const [room,setRoom]=useState("");
 const [loaded,setLoaded]=useState(false);
 const [botBusy,setBotBusy]=useState(false);
 const [diceScreen,setDiceScreen]=useState<{x:number,y:number}|null>(null);
 const [diceFlying,setDiceFlying]=useState(false);
 const [diceOrigin,setDiceOrigin]=useState<{x:number,y:number}|null>(null);
 const diceButtonRef=useRef<HTMLButtonElement>(null);
 const botTimers=useRef<ReturnType<typeof setTimeout>[]>([]);
 useEffect(()=>{
  try{const raw=localStorage.getItem(STORAGE);if(raw){const d=JSON.parse(raw);
   if(d.mode==="local"||d.mode==="bot"||d.mode==="online")setMode(d.mode);
   if(typeof d.room==="string")setRoom(d.room);
   if(Array.isArray(d.pos)&&d.pos.length===2)setPos(d.pos.map((n:number)=>Math.max(-1,Math.min(TOTAL-1,Number(n)||0))));
   if(d.turn===0||d.turn===1)setTurn(d.turn);
   if(Number.isInteger(d.die)&&d.die>=1&&d.die<=6)setDie(d.die);
   if(Number.isInteger(d.stepsLeft)&&d.stepsLeft>=0&&d.stepsLeft<=6)setStepsLeft(d.stepsLeft);
   if(typeof d.won==="boolean")setWon(d.won);
   if(typeof d.message==="string")setMessage(d.message);
   if(Array.isArray(d.coconuts)&&d.coconuts.length===3)setCoconuts(d.coconuts.map((n:number)=>Math.max(0,Math.min(8,Number(n)||0))));
  }}catch{}setLoaded(true);
 },[]);
 useEffect(()=>{if(!loaded)return;try{localStorage.setItem(STORAGE,JSON.stringify({mode,room,pos,turn,die,stepsLeft,won,message,coconuts}));}catch{}},[loaded,mode,room,pos,turn,die,stepsLeft,won,message,coconuts]);
 useEffect(()=>()=>{botTimers.current.forEach(clearTimeout)},[]);
 function scheduleBot(fn:()=>void,delay:number){const t=setTimeout(fn,delay);botTimers.current.push(t)}
 function selectMode(next:Mode){if(next==="online"){setMode("online");return}setMode(next);setMessage("Брось кубик, чтобы начать приключение!")}
 function clearProgress(){botTimers.current.forEach(clearTimeout);botTimers.current=[];setMode(null);setRoom("");setBotBusy(false);botStepPending.current=false;reset();try{localStorage.removeItem(STORAGE)}catch{}}
 
 const [heroDrag,setHeroDrag]=useState<{player:number,x:number,y:number}|null>(null);
 const heroPointer=useRef<{player:number,id:number,startX:number,startY:number,moved:boolean}|null>(null);
 const pathRef=useRef<HTMLDivElement>(null);
 function heroDown(e:React.PointerEvent<HTMLSpanElement>,player:number){
  if(player!==turn||die===null||won||(mode==="bot"&&turn===1)||mode==="online")return;
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
   const target=Math.min(TOTAL-1,pos[d.player]+stepsLeft);
   const c=cells[target];
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
 function beginDrag(e:React.PointerEvent<HTMLButtonElement>){if(die!==null||won||rolling||botBusy||mode==="online")return;pointer.current=true;drag.current={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,shake:0};const r=e.currentTarget.getBoundingClientRect();setDiceOrigin({x:r.left+r.width/2,y:r.top+r.height/2});setDiceScreen({x:e.clientX,y:e.clientY});setHolding(true);e.currentTarget.setPointerCapture(e.pointerId)}
 function dragDice(e:React.PointerEvent<HTMLButtonElement>){if(!pointer.current)return;const d=drag.current;const dx=e.clientX-d.x,dy=e.clientY-d.y;d.shake+=Math.abs(e.clientX-d.lastX)+Math.abs(e.clientY-d.lastY);d.lastX=e.clientX;d.lastY=e.clientY;setDiceScreen({x:e.clientX,y:e.clientY});setDiceMotion({x:dx,y:dy,rx:-dy*.8,ry:dx*.8,rz:Math.sin(d.shake/20)*18})}
 function rollResult(n:number,bot=false){
  setRolling(true);setDiceFlying(true);setDiceMotion({x:0,y:0,rx:0,ry:0,rz:0});
  const [rx,ry]=diceFaces[n-1];setFace(n);
  setDiceRotation(old=>({x:Math.ceil(old.x/360)*360+720+rx,y:Math.ceil(old.y/360)*360+720+ry}));
  if(bot){const r=diceButtonRef.current?.getBoundingClientRect();if(r){setDiceOrigin({x:r.left+r.width/2,y:r.top+r.height/2});setDiceScreen({x:r.left+r.width/2-80,y:r.top+r.height/2-110})}}
  scheduleBot(()=>{setRolling(false);setDiceFlying(false);setDiceScreen(null);setDie(n);setStepsLeft(n);setMessage(`Выпало ${n}! ${bot?"Робот делает ход.":`С клетки ${pos[turn]+1} переходи на ${Math.min(TOTAL,pos[turn]+n+1)}.`}`)},950);
 }
 function releaseDice(){if(!pointer.current)return;pointer.current=false;setHolding(false);rollResult(Math.floor(Math.random()*6)+1)}
 const botStepPending=useRef(false);
 useEffect(()=>{
  if(!loaded||mode!=="bot"||turn!==1||won||rolling)return;
  if(die===null&&stepsLeft===0&&!botBusy){
   setBotBusy(true);scheduleBot(()=>rollResult(Math.floor(Math.random()*6)+1,true),800);return;
  }
  if(die!==null&&stepsLeft>0&&!botStepPending.current){
   botStepPending.current=true;
   scheduleBot(()=>{
    botStepPending.current=false;
    const target=Math.min(TOTAL-1,pos[1]+1);
    setPos(previous=>[previous[0],target]);
    const remaining=stepsLeft-1;
    setStepsLeft(remaining);
    if(target===TOTAL-1){setWon(true);setDie(null);setBotBusy(false);setMessage("Робот нашёл сокровища!")}
    else if(remaining===0){setDie(null);setTurn(0);setBotBusy(false);setMessage("Робот допрыгал! Теперь твоя очередь!")}
    else setMessage(`Робот прыгает: шаг ${die-remaining} из ${die}!`);
   },1050);
  }
 },[loaded,mode,turn,won,rolling,die,stepsLeft,pos,botBusy]);
 function move(i:number){
  if(die===null||won||stepsLeft<=0||(mode==="bot"&&turn===1))return;
  const target=Math.min(TOTAL-1,pos[turn]+stepsLeft);
  if(i!==target){setMessage(`Нужна подсвеченная клетка № ${target+1}!`);return}
  const next=[...pos];next[turn]=target;setPos(next);setStepsLeft(0);setDie(null);
  if(target===TOTAL-1){setWon(true);setMessage("Ура! Сокровища найдены!");return}
  setMessage(tasks[target]||"Отлично! Теперь ход другого героя.");setTurn(1-turn);
 }
 function reset(){setCoconuts([0,0,0]);botTimers.current.forEach(clearTimeout);botTimers.current=[];setBotBusy(false);botStepPending.current=false;setDiceScreen(null);setDiceFlying(false);setPos([-1,-1]);setTurn(0);setDie(null);setStepsLeft(0);setHeroDrag(null);setWon(false);setRolling(false);setFace(1);setDiceRotation({x:0,y:0});setDiceMotion({x:0,y:0,rx:0,ry:0,rz:0});setMessage("Брось кубик, чтобы начать приключение!")}
 if(!loaded)return <main className="game-loading">Загрузка игры…</main>;
 if(mode===null||mode==="online")return <main className="mode-screen"><div className="mode-dialog"><h1>🏝️ Остров сокровищ</h1><p>Выбери, как будем играть</p><div className="mode-options"><button onClick={()=>selectMode("local")}>👫 Вдвоём на одном компьютере <small>Ходите по очереди</small></button><button onClick={()=>selectMode("bot")}>🤖 Играть с роботом <small>Робот бросает кубик и ходит сам</small></button><button onClick={()=>selectMode("online")}>🌐 По номеру комнаты <small>Мультиплеер — скоро</small></button></div>{mode==="online"&&<div className="room-form"><label>Номер комнаты <input inputMode="numeric" pattern="[0-9]*" value={room} onChange={e=>setRoom(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="Например, 1234" /></label><p>Подключение по WebSocket ещё не реализовано. Номер комнаты сохранится, но онлайн-игра пока недоступна.</p><button onClick={()=>setMode(null)}>Назад</button></div>}<button className="clear-save" onClick={clearProgress}>Стереть сохранение и начать заново</button></div></main>;
 return <main className="game"><section className="world"><div className="sky"><span className="cloud cloud1">☁️</span><span className="cloud cloud2">☁️</span></div><div className="ocean"></div><div className="island"><div className="hill hill1"></div><div className="hill hill2"></div><div className="lagoon"></div><div className="waterfall"></div><div className="bridge"></div><span className={"decoration palm-interactive palm-a"+(shakingPalm===0?" palm-shaking":"")} onPointerDown={e=>palmDown(e,0)} onPointerMove={palmMove} onPointerUp={palmUp} onPointerCancel={palmUp} role="button" aria-label="Потряси пальму, чтобы упали кокосы">🌴{Array.from({length:coconuts[0]},(_,j)=><span key={j} className="coconut" style={{left:`${22+(j%3)*16}%`,top:`${75+Math.floor(j/3)*12}%`,animationDelay:`${j*110}ms`}}>🥥</span>)}</span><span className={"decoration palm-interactive palm-b"+(shakingPalm===1?" palm-shaking":"")} onPointerDown={e=>palmDown(e,1)} onPointerMove={palmMove} onPointerUp={palmUp} onPointerCancel={palmUp} role="button" aria-label="Потряси пальму, чтобы упали кокосы">🌴{Array.from({length:coconuts[1]},(_,j)=><span key={j} className="coconut" style={{left:`${22+(j%3)*16}%`,top:`${75+Math.floor(j/3)*12}%`,animationDelay:`${j*110}ms`}}>🥥</span>)}</span><span className={"decoration palm-interactive palm-c"+(shakingPalm===2?" palm-shaking":"")} onPointerDown={e=>palmDown(e,2)} onPointerMove={palmMove} onPointerUp={palmUp} onPointerCancel={palmUp} role="button" aria-label="Потряси пальму, чтобы упали кокосы">🌴{Array.from({length:coconuts[2]},(_,j)=><span key={j} className="coconut" style={{left:`${22+(j%3)*16}%`,top:`${75+Math.floor(j/3)*12}%`,animationDelay:`${j*110}ms`}}>🥥</span>)}</span><span className="decoration flower-a">🌺</span><span className="decoration flower-b">🌸</span><span className="decoration rock">🪨</span><span className="decoration treasure">🏆</span><span className="decoration shell">🐚</span></div><div className="path" ref={pathRef}><svg className="path-line" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={cells.map(c=>`${c.x},${c.y}`).join(" ")} fill="none" stroke="#a56c3b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 1"/><polyline points={cells.map(c=>`${c.x},${c.y}`).join(" ")} fill="none" stroke="#ffe8a3" strokeWidth=".55" strokeLinecap="round" strokeLinejoin="round"/></svg>{pos.map((p,j)=>p===-1?<span key={j} className={"hero hero-start "+(j===0?"hero-flamingo":"hero-robot")+(heroDrag?.player===j?" hero-origin-dragging":"")} style={{left:"4%",top:j===0?"8%":"17%"}} onPointerDown={e=>heroDown(e,j)} onPointerMove={heroMove} onPointerUp={heroUp} onPointerCancel={()=>{heroPointer.current=null;setHeroDrag(null)}} onClick={e=>e.stopPropagation()} role="button" aria-label={j===0?"Перетащить фламинго":"Перетащить робота"}>{j===0?"🦩":<RobotFigure/>}</span>:null)}<div className="start-zone start-flamingo">СТАРТ 🦩</div><div className="start-zone start-robot">СТАРТ 🤖</div>{cells.map((c,i)=><button key={i} className={"stone "+(die!==null&&i===Math.min(TOTAL-1,pos[turn]+stepsLeft)?"suggested":"")} style={{left:c.x+"%",top:c.y+"%"}} aria-label={`Клетка ${i+1}`} onClick={()=>{if(!(mode==="bot"&&turn===1))move(i)}}><span className="stone-label">{i===TOTAL-1?"🎁":tasks[i]?"⭐":i+1}</span>{pos.map((p,j)=>p===i?<span key={j} className={"hero "+(j===0?"hero-flamingo":"hero-robot")+(heroDrag?.player===j?" hero-origin-dragging":"")} onPointerDown={e=>heroDown(e,j)} onPointerMove={heroMove} onPointerUp={heroUp} onPointerCancel={()=>{heroPointer.current=null;setHeroDrag(null)}} onClick={e=>e.stopPropagation()} role="button" aria-label={`Перетащить ${j===0?"фламинго":"робота"}`}>{j===0?"🦩":<RobotFigure/>}</span>:null)}</button>)}</div>{heroDrag&&<div className="hero-drag-overlay" style={{left:heroDrag.x,top:heroDrag.y}}>{heroDrag.player===0?"🦩":<RobotFigure/>}</div>}<div className="world-title">ОСТРОВ СОКРОВИЩ</div></section><aside className="panel"><div className="panel-top"><span className="eyebrow">ПРИКЛЮЧЕНИЕ</span><h1>Фламинго <span>и</span> Робот</h1><p>Вместе к сокровищам!</p><small>{mode==="bot"?"Игра с роботом":"Два игрока на одном устройстве"}</small></div><div className="turn-card"><div className="turn-avatar">{turn===0?"🦩":"🤖"}</div><div><small>СЕЙЧАС ХОДИТ</small><strong>{turn===0?"Фламинго":"Робот"}</strong></div></div><div className="message" aria-live="polite">{message}</div><div className="dice-area"><span className="section-label">БРОСЬ КУБИК</span><button ref={diceButtonRef} className={"die "+(holding?"held ":"")+(rolling?"rolling ":"")+((holding||diceFlying)?"die-in-flight":"")} disabled={die!==null||won||rolling||botBusy} onPointerDown={beginDrag} onPointerMove={dragDice} onPointerUp={releaseDice} onPointerCancel={()=>{pointer.current=false;setHolding(false);setDiceScreen(null);setDiceMotion({x:0,y:0,rx:0,ry:0,rz:0})}} aria-label="Подними, потряси и брось кубик"><span className="die-float" style={{transform:`rotateZ(${diceMotion.rz}deg) scale(${holding?1.15:rolling?.72:1})`}}><span className="die-cube" style={{transform:`rotateX(${diceRotation.x+diceMotion.rx}deg) rotateY(${diceRotation.y+diceMotion.ry}deg)`}}>{[1,2,3,4,5,6].map((n)=><span key={n} className={"die-face face-"+n}>{Array.from({length:n},(_,i)=><i key={i} className={"pip pip-"+n+"-"+i}/>)}</span>)}</span></span></button><span className="dice-hint">{die!==null?`Выпало ${die} · цель: клетка ${Math.min(TOTAL,pos[turn]+stepsLeft+1)}`:"Захвати, потряси и отпусти"}</span></div>{(holding||diceFlying)&&diceScreen&&<div className={"dice-overlay "+(diceFlying?"dice-overlay-flying":"")} style={{left:diceScreen.x,top:diceScreen.y,["--dice-return-x" as string]:`${(diceOrigin?.x??diceScreen.x)-diceScreen.x}px`,["--dice-return-y" as string]:`${(diceOrigin?.y??diceScreen.y)-diceScreen.y}px`}}><span className="die-cube" style={{transform:`rotateX(${diceRotation.x+diceMotion.rx}deg) rotateY(${diceRotation.y+diceMotion.ry}deg)`}}>{[1,2,3,4,5,6].map(n=><span key={n} className={"die-face face-"+n}>{Array.from({length:n},(_,i)=><i key={i} className={"pip pip-"+n+"-"+i}/>)}</span>)}</span></div>}<div className="score"><div>🦩 <b>{Math.max(0,pos[0]+1)}</b><small>/ {TOTAL}</small></div><div>🤖 <b>{Math.max(0,pos[1]+1)}</b><small>/ {TOTAL}</small></div></div><div className="panel-actions"><button onClick={reset}>↻ Заново</button><button onClick={clearProgress}>Стереть всё</button><button onClick={()=>setSound(!sound)} aria-label="Переключить звук">{sound?"🔊":"🔇"} Звук</button></div><p className="tip">Перетащи героя сразу на жёлтую клетку — число на кубике определяет расстояние.</p></aside></main>
}