"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type BoardRow = { name: string; score: number };
type RunState = "intro" | "countdown" | "playing" | "over";
const pad = (n:number) => Math.max(0,Math.floor(n)).toString().padStart(4,"0");

export function Game(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const stateRef=useRef<RunState>("intro");
  const targetXRef=useRef(0);
  const scoreRef=useRef(0);
  const livesRef=useRef(3);
  const runRef=useRef(0);
  const audioRef=useRef<AudioContext|null>(null);
  const musicTimerRef=useRef<number|null>(null);
  const mutedRef=useRef(false);
  const [state,setState]=useState<RunState>("intro");
  const [countdown,setCountdown]=useState("3");
  const [score,setScore]=useState(0);
  const [best,setBest]=useState(0);
  const [lives,setLives]=useState(3);
  const [muted,setMuted]=useState(false);
  const [name,setName]=useState("PLAYER");
  const [board,setBoard]=useState<BoardRow[]>([]);

  const sync=(s:RunState)=>{stateRef.current=s;setState(s)};
  const tone=useCallback((frequency:number,duration=.1,volume=.035,type:OscillatorType="sine")=>{
    if(mutedRef.current)return;const audio=audioRef.current;if(!audio)return;const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;osc.type=type;osc.frequency.setValueAtTime(frequency,now);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain).connect(audio.destination);osc.start(now);osc.stop(now+duration+.02)
  },[]);
  const startMusic=useCallback(()=>{
    if(mutedRef.current)return;if(!audioRef.current)audioRef.current=new AudioContext();audioRef.current.resume();if(musicTimerRef.current!==null)return;
    const notes=[220,277,330,415,330,277,247,330];let step=0;musicTimerRef.current=window.setInterval(()=>{tone(notes[step++%notes.length],.16,.018,step%4===0?"triangle":"sine")},210)
  },[tone]);
  const toggleSound=()=>{mutedRef.current=!mutedRef.current;setMuted(mutedRef.current);if(!mutedRef.current){startMusic();tone(660,.12,.04,"square")}};
  const loadBoard=useCallback(()=>fetch("/api/scores").then(r=>r.json()).then(d=>setBoard(d.scores||[])).catch(()=>{}),[]);
  useEffect(()=>{setBest(Number(localStorage.getItem("neon-drop-best")||0));setName(localStorage.getItem("neon-drop-name")||"PLAYER");loadBoard()},[loadBoard]);

  const begin=useCallback(()=>{
    const safe=(name.trim().toUpperCase().replace(/[^A-Z0-9_-]/g,"").slice(0,12)||"PLAYER");
    startMusic();tone(440,.12,.04,"square");setName(safe);localStorage.setItem("neon-drop-name",safe);scoreRef.current=0;livesRef.current=3;setScore(0);setLives(3);runRef.current+=1;sync("countdown");
    setCountdown("3");setTimeout(()=>setCountdown("2"),600);setTimeout(()=>setCountdown("1"),1200);setTimeout(()=>setCountdown("GO!"),1800);setTimeout(()=>sync("playing"),2200);
  },[name,startMusic,tone]);

  useEffect(()=>()=>{if(musicTimerRef.current!==null)clearInterval(musicTimerRef.current);musicTimerRef.current=null;audioRef.current?.close();audioRef.current=null},[]);

  useEffect(()=>{
    const canvas=canvasRef.current!;const ctx=canvas.getContext("2d")!;
    let raf=0,last=performance.now(),width=0,height=0,dpr=1,seenRun=-1,invincible=0,shake=0,dragging=false,pointerStart=0,targetStart=0;
    let player={x:0,y:0,r:12};
    let gates:{y:number;gapX:number;gapW:number;passed:boolean;color:string}[]=[];
    let particles:{x:number;y:number;vx:number;vy:number;life:number;color:string}[]=[];
    const colors=["#d9ff43","#52e5ff","#ff4ea3","#9b7bff"];
    const makeGate=(y:number,index:number)=>{const gapW=Math.max(120,width*(.45-Math.min(scoreRef.current,25)*.006));const centered=index<2;return{y,gapX:centered?width/2-gapW/2:24+Math.random()*(width-gapW-48),gapW,passed:false,color:colors[index%colors.length]}};
    const reset=()=>{player={x:width/2,y:height*.34,r:Math.max(11,width*.03)};targetXRef.current=width/2;gates=[];for(let i=0;i<7;i++)gates.push(makeGate(height*(.72+i*.18),i));particles=[];invincible=0;dragging=false};
    const resize=()=>{dpr=Math.min(2,devicePixelRatio||1);width=canvas.clientWidth;height=canvas.clientHeight;canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);reset()};
    const burst=(x:number,y:number,color:string,n=14)=>{for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=45+Math.random()*150;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.45+Math.random()*.35,color})}};
    const saveScore=(final:number)=>{const high=Math.max(final,Number(localStorage.getItem("neon-drop-best")||0));localStorage.setItem("neon-drop-best",String(high));setBest(high);const playerName=localStorage.getItem("neon-drop-name")||"PLAYER";fetch("/api/scores",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:playerName,score:final})}).then(r=>r.json()).then(d=>setBoard(d.scores||[])).catch(()=>{})};
    const finish=()=>{shake=14;burst(player.x,player.y,"#ff4ea3",34);tone(95,.42,.055,"sawtooth");saveScore(scoreRef.current);sync("over")};
    const hitGate=(g:typeof gates[number])=>{
      g.passed=true;shake=9;burst(player.x,g.y,"#ff4ea3",20);livesRef.current-=1;setLives(livesRef.current);
      tone(130,.2,.05,"square");if(livesRef.current<=0){finish();return} invincible=1.1;
    };
    const frame=(now:number)=>{
      const dt=Math.min(.033,(now-last)/1000);last=now;
      if(seenRun!==runRef.current){seenRun=runRef.current;reset()}
      if(stateRef.current==="playing"){
        invincible=Math.max(0,invincible-dt);player.x+=(targetXRef.current-player.x)*Math.min(1,dt*10);
        const speed=Math.min(230,92+scoreRef.current*4);for(const g of gates){const previousY=g.y;g.y-=speed*dt;if(!g.passed&&previousY>player.y+player.r&&g.y<=player.y+player.r){const safe=player.x-player.r>g.gapX&&player.x+player.r<g.gapX+g.gapW;if(safe){g.passed=true;scoreRef.current+=1;setScore(scoreRef.current);tone(520+(scoreRef.current%5)*70,.09,.035,"square");burst(player.x,g.y,g.color,9)}else if(invincible<=0)hitGate(g)}}
        gates=gates.filter(g=>g.y>-40);while(gates.length<7){const maxY=Math.max(...gates.map(g=>g.y),height*.55);gates.push(makeGate(maxY+height*.18,scoreRef.current+gates.length))}
      }
      particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;p.life-=dt});particles=particles.filter(p=>p.life>0);
      ctx.save();ctx.fillStyle="#100e18";ctx.fillRect(0,0,width,height);ctx.globalAlpha=.13;ctx.strokeStyle="#9b7bff";for(let x=0;x<width;x+=44){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke()}for(let y=-(now*.025%44);y<height;y+=44){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke()}ctx.globalAlpha=1;
      if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.84}
      gates.forEach(g=>{ctx.fillStyle=g.color;ctx.fillRect(0,g.y,g.gapX,9);ctx.fillRect(g.gapX+g.gapW,g.y,width-g.gapX-g.gapW,9);ctx.fillStyle="rgba(255,255,255,.12)";ctx.fillRect(0,g.y+9,g.gapX,12);ctx.fillRect(g.gapX+g.gapW,g.y+9,width-g.gapX-g.gapW,12);ctx.fillStyle="rgba(217,255,67,.14)";ctx.fillRect(g.gapX,g.y-30,g.gapW,3)});
      const blink=invincible>0&&Math.floor(now/90)%2===0;ctx.globalAlpha=blink?.25:1;ctx.shadowBlur=25;ctx.shadowColor="#d9ff43";ctx.fillStyle="#f4f0e6";ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#ff4ea3";ctx.fillRect(player.x-3,player.y-3,6,6);ctx.globalAlpha=1;
      particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,5,5)});ctx.globalAlpha=1;ctx.restore();raf=requestAnimationFrame(frame)
    };
    const down=(e:PointerEvent)=>{if(stateRef.current!=="playing")return;dragging=true;pointerStart=e.clientX;targetStart=targetXRef.current;canvas.setPointerCapture(e.pointerId)};
    const aim=(e:PointerEvent)=>{if(!dragging||stateRef.current!=="playing")return;targetXRef.current=Math.max(18,Math.min(width-18,targetStart+(e.clientX-pointerStart)*1.08))};
    const up=(e:PointerEvent)=>{dragging=false;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)};
    const key=(e:KeyboardEvent)=>{if(stateRef.current!=="playing")return;if(e.code==="ArrowLeft")targetXRef.current-=55;if(e.code==="ArrowRight")targetXRef.current+=55};
    resize();window.addEventListener("resize",resize);canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",aim);canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",up);window.addEventListener("keydown",key);raf=requestAnimationFrame(frame);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointermove",aim);canvas.removeEventListener("pointerup",up);canvas.removeEventListener("pointercancel",up);window.removeEventListener("keydown",key)}
  },[tone]);

  const share=async()=>{const text=`I scored ${score} in NEON DROP. Beat me. ⚡`;if(navigator.share)await navigator.share({title:"NEON DROP",text,url:location.href});else{await navigator.clipboard.writeText(`${text} ${location.href}`);alert("Challenge copied!")}};
  return <main className="game-shell"><section className="game-frame" aria-label="Neon Drop game">
    <canvas ref={canvasRef} aria-hidden="true"/><header className="hud"><div className="logo">NEON <span>DROP</span></div><div className="score-wrap"><strong className="score">{pad(score)}</strong><span className="best">BEST {pad(best)}</span></div></header><button className="sound-toggle" onClick={toggleSound} aria-label={muted?"Turn sound on":"Mute sound"}>{muted?"SOUND OFF":"MUSIC ON"}</button>
    {(state==="playing"||state==="countdown")&&<div className="lives" aria-label={`${lives} lives`}>{[0,1,2].map(i=><span className={i<lives?"alive":"lost"} key={i}>●</span>)}</div>}
    {state==="playing"&&score<3&&<div className="tap-hint">DRAG THE BALL LEFT ↔ RIGHT</div>}
    <section className={`screen ${state!=="intro"?"hidden":""}`}><p className="eyebrow">Learn it in one move</p><h1>NEON<span>DROP</span></h1><div className="control-demo"><span className="demo-gap"/><span className="demo-ball"/><span className="demo-hand">☝</span></div><p className="tagline"><strong>Drag your finger left and right.</strong><br/>Put the ball above the glowing gap. You get 3 lives—your first two gates are practice.</p><input className="player-name" value={name} onChange={e=>setName(e.target.value)} maxLength={12} aria-label="Leaderboard name" autoCapitalize="characters"/><button className="play" onClick={begin}>Practice first</button><p className="micro">Drag · aim · drop · survive</p></section>
    <section className={`screen countdown-screen ${state!=="countdown"?"hidden":""}`}><p className="eyebrow">Finger on the ball</p><div className="countdown">{countdown}</div><p className="tagline">Move it over the first gap.</p></section>
    <section className={`screen ${state!=="over"?"hidden":""}`}><p className="eyebrow">Score saved automatically</p><div className="end-score">{pad(score)}</div><p className="result-label">{score>=best&&score>0?"NEW PERSONAL BEST":"ONE MORE RUN?"}</p><button className="play" onClick={begin}>Play again</button><button className="share" onClick={share}>Challenge a friend ↗</button><div className="leaderboard"><h2><span>WORLD TOP 5</span><span>ALL TIME</span></h2>{board.length?board.slice(0,5).map((r,i)=><div className="leader-row" key={`${r.name}-${i}`}><span>{i+1}.</span><span>{r.name}</span><b>{pad(r.score)}</b></div>):<p className="leader-empty">Your score is saved. The board is loading.</p>}</div></section>
  </section><aside className="ad-slot">FUTURE AD SPACE</aside></main>
}
