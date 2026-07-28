"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type BoardRow = { name: string; score: number };
type RunState = "intro" | "playing" | "over";

const pad = (n: number) => Math.max(0, Math.floor(n)).toString().padStart(4, "0");

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RunState>("intro");
  const directionRef = useRef(1);
  const scoreRef = useRef(0);
  const [state, setState] = useState<RunState>("intro");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [combo, setCombo] = useState(0);
  const [muted, setMuted] = useState(false);
  const [name, setName] = useState("PLAYER");
  const [board, setBoard] = useState<BoardRow[]>([]);

  const syncState = (next: RunState) => { stateRef.current = next; setState(next); };
  const start = useCallback(() => { scoreRef.current = 0; setScore(0); setCombo(0); directionRef.current = 1; syncState("playing"); }, []);

  useEffect(() => {
    setBest(Number(localStorage.getItem("neon-drop-best") || 0));
    setName(localStorage.getItem("neon-drop-name") || "PLAYER");
    fetch("/api/scores").then(r => r.json()).then(d => setBoard(d.scores || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!; const ctx = canvas.getContext("2d")!;
    let raf = 0, last = performance.now(), width = 0, height = 0, dpr = 1;
    let player = { x:0, y:0, r:12, vy:0 }, platforms: { y:number; gapX:number; gapW:number; passed:boolean }[] = [];
    let particles: {x:number;y:number;vx:number;vy:number;life:number;color:string}[] = [];
    let shake = 0;
    const colors = ["#d9ff43", "#ff4ea3", "#52e5ff", "#9b7bff"];
    const resize = () => { dpr=Math.min(2,devicePixelRatio||1); width=canvas.clientWidth; height=canvas.clientHeight; canvas.width=width*dpr; canvas.height=height*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); reset(); };
    const reset = () => { player={x:width/2,y:height*.22,r:Math.max(10,width*.028),vy:0}; platforms=[]; for(let i=0;i<7;i++) platforms.push(makePlatform(height*.56+i*height*.17,i)); };
    const makePlatform = (y:number, order=-1) => { const gapW=Math.max(92,width*(.38-Math.min(scoreRef.current,40)*.003)); const randomX=24+Math.random()*(width-gapW-48); const gapX=order===0?width/2-gapW/2:randomX; return {y,gapX,gapW,passed:false}; };
    const burst = (x:number,y:number,color:string,count=12) => { for(let i=0;i<count;i++){ const a=Math.random()*Math.PI*2,s=50+Math.random()*180; particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5+Math.random()*.4,color}); } };
    const finish = () => { shake=12; burst(player.x,player.y,"#ff4ea3",30); const final=scoreRef.current; const high=Math.max(final,Number(localStorage.getItem("neon-drop-best")||0)); localStorage.setItem("neon-drop-best",String(high)); setBest(high); syncState("over"); };
    const frame = (now:number) => {
      const dt=Math.min(.033,(now-last)/1000); last=now; ctx.save();
      if(stateRef.current==="playing"){
        player.x+=directionRef.current*Math.min(210,105+scoreRef.current*3)*dt; player.x=Math.max(player.r+8,Math.min(width-player.r-8,player.x)); player.vy+=520*dt; player.y+=player.vy*dt;
        platforms.forEach(p=>p.y-=Math.min(220,72+scoreRef.current*3.2)*dt);
        const lineY=player.y+player.r;
        for(const p of platforms){ if(!p.passed && player.vy>0 && lineY>=p.y-5 && lineY-player.vy*dt<p.y+7){ if(player.x-player.r>p.gapX && player.x+player.r<p.gapX+p.gapW){ p.passed=true; player.vy=-395; scoreRef.current+=1; setScore(scoreRef.current); const c=scoreRef.current%5; setCombo(c===0?5:c); burst(player.x,p.y,colors[scoreRef.current%colors.length],8); } else finish(); } }
        platforms=platforms.filter(p=>p.y>-30); while(platforms.length<7){ const maxY=Math.max(...platforms.map(p=>p.y),height*.5); platforms.push(makePlatform(maxY+height*.16)); }
        if(player.y>height+40 || player.y<-80) finish();
      }
      particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.life-=dt}); particles=particles.filter(p=>p.life>0);
      ctx.fillStyle="#100e18"; ctx.fillRect(0,0,width,height);
      ctx.globalAlpha=.16; ctx.strokeStyle="#9b7bff"; ctx.lineWidth=1; const grid=42; for(let x=-(now*.02%grid);x<width;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke()} for(let y=-(now*.04%grid);y<height;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke()} ctx.globalAlpha=1;
      if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.86}
      platforms.forEach((p,i)=>{ const color=colors[(i+scoreRef.current)%colors.length]; ctx.fillStyle=color; ctx.fillRect(0,p.y,p.gapX,9); ctx.fillRect(p.gapX+p.gapW,p.y,width-(p.gapX+p.gapW),9); ctx.fillStyle="rgba(255,255,255,.14)";ctx.fillRect(0,p.y+9,p.gapX,12);ctx.fillRect(p.gapX+p.gapW,p.y+9,width-(p.gapX+p.gapW),12); });
      ctx.shadowBlur=24;ctx.shadowColor="#d9ff43";ctx.fillStyle="#f4f0e6";ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#ff4ea3";ctx.fillRect(player.x-3,player.y-3,6,6);
      particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,4,4)});ctx.globalAlpha=1;ctx.restore();
      raf=requestAnimationFrame(frame);
    };
    const turn=()=>{ if(stateRef.current==="playing") directionRef.current*=-1; };
    const keyDown=(e:KeyboardEvent)=>{if((e.code==="Space"||e.code==="ArrowLeft"||e.code==="ArrowRight")&&!e.repeat){e.preventDefault();turn()}};
    resize(); window.addEventListener("resize",resize); window.addEventListener("pointerdown",turn); window.addEventListener("keydown",keyDown); raf=requestAnimationFrame(frame);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);window.removeEventListener("pointerdown",turn);window.removeEventListener("keydown",keyDown)};
  }, []);

  const submit = async () => {
    const safe=(name.trim().toUpperCase().replace(/[^A-Z0-9_-]/g,"").slice(0,12)||"PLAYER"); setName(safe); localStorage.setItem("neon-drop-name",safe);
    try { const r=await fetch("/api/scores",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:safe,score})}); const d=await r.json(); setBoard(d.scores||board); } catch {}
    start();
  };
  const share = async () => { const text=`I scored ${score} in NEON DROP. Beat me. ⚡`; if(navigator.share) await navigator.share({title:"NEON DROP",text,url:location.href}); else { await navigator.clipboard.writeText(`${text} ${location.href}`); alert("Challenge copied!"); } };

  return <main className="game-shell"><section className="game-frame" aria-label="Neon Drop game">
    <canvas ref={canvasRef} aria-hidden="true" />
    <header className="hud"><div className="logo">NEON <span>DROP</span></div><div className="score-wrap"><strong className="score">{pad(score)}</strong><span className="best">BEST {pad(best)}</span></div></header>
    <div className={`streak ${combo===5?"show":""}`}>×5 HOT!</div>
    {state==="playing"&&<div className="tap-hint">TAP = CHANGE DIRECTION</div>}
    <section className={`screen ${state!=="intro"?"hidden":""}`}><p className="eyebrow">One thumb. Zero excuses.</p><h1>NEON<span>DROP</span></h1><p className="tagline"><strong>Tap anywhere to change direction.</strong><br/>Guide the ball through each gap. The first one is centered so you can learn the rhythm.</p><button className="play" onClick={start}>Start easy</button><p className="micro">Tap · turn · drop · repeat</p><div className="footer-actions"><button className="icon-btn" onClick={()=>setMuted(!muted)} aria-label="Toggle sound">{muted?"×":"♪"}</button><span className="daily">DAY #{Math.floor(Date.now()/86400000)%1000} · GLOBAL</span><span aria-hidden="true" style={{width:46}} /></div></section>
    <section className={`screen ${state!=="over"?"hidden":""}`}><p className="eyebrow">Run complete</p><div className="end-score">{pad(score)}</div><p className="result-label">{score>=best&&score>0?"NEW PERSONAL BEST":"SO CLOSE. AGAIN?"}</p><div className="name-row"><input value={name} onChange={e=>setName(e.target.value)} maxLength={12} aria-label="Player name" autoCapitalize="characters" /></div><button className="play" onClick={submit}>Save & go again</button><button className="share" onClick={share}>Challenge a friend ↗</button><div className="leaderboard"><h2><span>WORLD TOP 5</span><span>ALL TIME</span></h2>{board.length?board.slice(0,5).map((r,i)=><div className="leader-row" key={`${r.name}-${i}`}><span>{i+1}.</span><span>{r.name}</span><b>{pad(r.score)}</b></div>):<p className="leader-empty">Be the first name on the board.</p>}</div></section>
  </section><aside className="ad-slot">FUTURE AD SPACE</aside></main>;
}
