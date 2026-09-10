(() => {
"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;
const WORLD_W = 4200;
const GROUND_Y = 438;

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const progressEl = document.getElementById("progress");
const startOverlay = document.getElementById("startOverlay");
const pauseOverlay = document.getElementById("pauseOverlay");
const clearOverlay = document.getElementById("clearOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const clearScore = document.getElementById("clearScore");

const keys = {};
const input = {left:false,right:false,dash:false};
let running=false, paused=false, gameOver=false, cleared=false;
let score=0, lives=3, cameraX=0, last=0, time=0;
let particles=[], texts=[];

const catImg = new Image();
catImg.src = "images/cat.png";

const player = {
  x:120,y:GROUND_Y-74,w:76,h:74,
  vx:0,vy:0,dir:1,onGround:true,
  state:"idle",anim:0,inv:0,
  jumpCount:0
};

const items = [
  [420,"fish",10],[610,"snack",30],[820,"star",100],[1040,"fish",10],
  [1290,"snack",30],[1500,"fish",10],[1700,"star",100],[1950,"fish",10],
  [2200,"snack",30],[2450,"star",100],[2710,"fish",10],[2950,"snack",30],
  [3210,"fish",10],[3450,"star",100],[3690,"snack",30],[3920,"star",100]
].map(([x,type,val])=>({x,y: type==="star"?315:365,type,val,r:16,taken:false,bob:Math.random()*6}));

const obstacles = [
  {x:720,y:402,w:100,h:36,type:"vacuum"},
  {x:1160,y:410,w:85,h:28,type:"puddle"},
  {x:1840,y:402,w:110,h:36,type:"vacuum"},
  {x:2320,y:410,w:95,h:28,type:"puddle"},
  {x:3060,y:402,w:100,h:36,type:"vacuum"},
  {x:3570,y:410,w:100,h:28,type:"puddle"}
];

const platforms = [
  {x:880,y:350,w:150,h:18},{x:1360,y:330,w:160,h:18},
  {x:2020,y:350,w:150,h:18},{x:2570,y:320,w:170,h:18},
  {x:3310,y:345,w:150,h:18}
];

const goal = {x:4020,y:340,w:90,h:98};

function reset(){
  score=0;lives=3;cameraX=0;time=0;particles=[];texts=[];
  player.x=120;player.y=GROUND_Y-player.h;player.vx=0;player.vy=0;
  player.dir=1;player.state="idle";player.anim=0;player.inv=0;player.onGround=true;player.jumpCount=0;
  items.forEach(i=>i.taken=false);
  running=true;paused=false;gameOver=false;cleared=false;
  hideAll(); updateHud();
}
function hideAll(){[startOverlay,pauseOverlay,clearOverlay,gameOverOverlay].forEach(e=>e.classList.add("hidden"))}
function updateHud(){
  scoreEl.textContent=score;
  livesEl.textContent=lives;
  progressEl.textContent=Math.min(100,Math.floor(player.x/(goal.x+goal.w)*100))+"%";
}
function addParticle(x,y,kind="spark"){
  for(let i=0;i<10;i++) particles.push({
    x,y,vx:(Math.random()-.5)*180,vy:(Math.random()-.8)*180,
    life:.6+Math.random()*.5,max:.9,kind
  });
}
function addText(x,y,text){
  texts.push({x,y,text,life:1.0});
}
function beep(freq,dur=.08,type="sine"){
  try{
    const A=window.AudioContext||window.webkitAudioContext;
    if(!A)return;
    const ac=new A(); const o=ac.createOscillator(), g=ac.createGain();
    o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.035,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+dur);
    o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+dur);
  }catch(e){}
}
function jump(){
  if(!running||paused||gameOver||cleared)return;
  if(player.onGround){
    player.vy=-720; player.onGround=false; player.jumpCount=1;
    player.state="jump"; beep(520,.09,"triangle"); addParticle(player.x+38,GROUND_Y,"dust");
  }
}
function hurt(){
  if(player.inv>0||gameOver||cleared)return;
  lives--;player.inv=1.4;player.vx=-player.dir*160;player.vy=-360;
  addParticle(player.x+38,player.y+35,"hit"); addText(player.x+38,player.y-8,"-1 ❤️"); beep(130,.16,"sawtooth");
  if(lives<=0){gameOver=true;running=false;document.getElementById("gameOverOverlay").classList.remove("hidden")}
  updateHud();
}
function collect(item){
  item.taken=true;score+=item.val;
  addParticle(item.x,item.y,item.type);addText(item.x,item.y-25,"+"+item.val);
  beep(item.type==="star"?880:620,.09,"sine"); updateHud();
}
function rectHit(a,b){
  return a.x < b.x+b.w && a.x+a.w>b.x && a.y < b.y+b.h && a.y+a.h>b.y;
}

function update(dt){
  time+=dt;
  if(!running||paused||gameOver||cleared)return;

  const dir=(input.right?1:0)-(input.left?1:0);
  const maxSpeed=input.dash?390:250;
  const accel=dir?1200:1500;
  if(dir){player.vx += dir*accel*dt;player.dir=dir}
  else {player.vx*=Math.pow(.001,dt)}
  player.vx=Math.max(-maxSpeed,Math.min(maxSpeed,player.vx));

  player.vy += 1850*dt;
  const oldY=player.y;
  player.x += player.vx*dt;
  player.y += player.vy*dt;
  player.x=Math.max(20,Math.min(WORLD_W-player.w-20,player.x));

  let landed=false;
  if(player.y+player.h>=GROUND_Y){
    player.y=GROUND_Y-player.h;player.vy=0;player.onGround=true;landed=oldY+player.h<GROUND_Y;
  }else player.onGround=false;

  for(const p of platforms){
    if(player.vy>=0 && player.x+player.w>p.x && player.x<p.x+p.w &&
       oldY+player.h<=p.y && player.y+player.h>=p.y){
      player.y=p.y-player.h;player.vy=0;player.onGround=true;landed=true;
    }
  }
  if(landed){addParticle(player.x+38,player.y+player.h,"dust"); if(player.state==="jump") beep(220,.05)}
  if(!player.onGround)player.state="jump";
  else if(Math.abs(player.vx)>285)player.state="run";
  else if(Math.abs(player.vx)>45)player.state="walk";
  else player.state="idle";

  if(player.inv>0)player.inv-=dt;

  const hitbox={x:player.x+10,y:player.y+10,w:player.w-20,h:player.h-8};
  for(const o of obstacles){
    if(rectHit(hitbox,o))hurt();
  }
  for(const i of items){
    if(!i.taken){
      const iy=i.y+Math.sin(time*4+i.bob)*6;
      const dx=(player.x+38)-(i.x),dy=(player.y+35)-iy;
      if(dx*dx+dy*dy<42*42)collect(i);
    }
  }
  if(player.x+player.w>goal.x){
    cleared=true;running=false;clearScore.textContent=score;document.getElementById("clearOverlay").classList.remove("hidden");
    beep(980,.15,"triangle");setTimeout(()=>beep(1280,.18,"triangle"),120);
  }

  cameraX += ((player.x-300)-cameraX)*Math.min(1,dt*5);
  cameraX=Math.max(0,Math.min(WORLD_W-W,cameraX));
  updateHud();

  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt;p.life-=dt}
  particles=particles.filter(p=>p.life>0);
  for(const t of texts){t.y-=35*dt;t.life-=dt}
  texts=texts.filter(t=>t.life>0);
  player.anim += dt*(player.state==="run"?14:player.state==="walk"?8:3);
}

function draw(){
  ctx.clearRect(0,0,W,H);
  drawSky();
  ctx.save();ctx.translate(-cameraX,0);
  drawFarBackground();
  drawGround();
  drawPlatforms();
  drawDecor();
  drawItems();
  drawObstacles();
  drawGoal();
  drawPlayer();
  drawEffects();
  ctx.restore();
}

function drawSky(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"#b9ddeb");g.addColorStop(.72,"#eaf2e8");g.addColorStop(1,"#d9c4a9");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle="rgba(255,255,255,.65)";
  for(let i=0;i<6;i++){const x=(i*210-(cameraX*.08)%210);ctx.beginPath();ctx.ellipse(x,90+(i%2)*55,55,18,0,0,Math.PI*2);ctx.fill()}
}
function drawFarBackground(){
  ctx.fillStyle="#a9c4b2";
  for(let x=-100;x<WORLD_W+200;x+=240){
    ctx.beginPath();ctx.arc(x,350,100,Math.PI,0);ctx.lineTo(x+100,438);ctx.lineTo(x-100,438);ctx.fill();
  }
  ctx.fillStyle="#8eac96";
  for(let x=80;x<WORLD_W;x+=380){
    ctx.fillRect(x,315,12,123);ctx.beginPath();ctx.arc(x+6,305,42,0,Math.PI*2);ctx.fill();
  }
}
function drawGround(){
  ctx.fillStyle="#d6bb94";ctx.fillRect(0,GROUND_Y,WORLD_W,H-GROUND_Y);
  ctx.fillStyle="#c6a77c";
  for(let x=0;x<WORLD_W;x+=48){ctx.fillRect(x,GROUND_Y+10,28,3)}
  ctx.fillStyle="#b49a73";ctx.fillRect(0,GROUND_Y,WORLD_W,8);
}
function drawPlatforms(){
  for(const p of platforms){
    ctx.fillStyle="#9b6d4d";ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.fillStyle="#c99568";ctx.fillRect(p.x,p.y,p.w,5);
  }
}
function drawDecor(){
  // house-like furniture and windows
  for(let x=180;x<WORLD_W;x+=760){
    ctx.fillStyle="#d9c7b5";ctx.fillRect(x,250,230,188);
    ctx.fillStyle="#b8d8e2";ctx.fillRect(x+30,280,75,62);
    ctx.strokeStyle="#fff";ctx.lineWidth=6;ctx.strokeRect(x+30,280,75,62);
    ctx.fillStyle="#9b6d4d";ctx.fillRect(x+145,330,55,108);
    ctx.fillStyle="#7e5a43";ctx.fillRect(x+135,438,80,8);
  }
  for(let x=500;x<WORLD_W;x+=900){
    ctx.fillStyle="#a77750";ctx.fillRect(x,365,120,10);ctx.fillRect(x+15,375,8,63);ctx.fillRect(x+97,375,8,63);
    ctx.fillStyle="#6e9b69";ctx.beginPath();ctx.arc(x+60,345,27,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#5f885e";ctx.beginPath();ctx.arc(x+40,356,18,0,Math.PI*2);ctx.fill();
  }
}
function drawItems(){
  for(const i of items){
    if(i.taken)continue;
    const y=i.y+Math.sin(time*4+i.bob)*6;
    ctx.save();ctx.translate(i.x,y);ctx.rotate(Math.sin(time*2+i.bob)*.08);
    if(i.type==="fish"){
      ctx.fillStyle="#e2a86c";ctx.beginPath();ctx.ellipse(0,0,20,11,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.moveTo(-18,0);ctx.lineTo(-32,-12);ctx.lineTo(-29,0);ctx.lineTo(-32,12);ctx.closePath();ctx.fill();
      ctx.fillStyle="#382c26";ctx.beginPath();ctx.arc(8,-3,2,0,Math.PI*2);ctx.fill();
    }else if(i.type==="snack"){
      ctx.fillStyle="#f0c35c";ctx.fillRect(-17,-14,34,28);ctx.fillStyle="#fff2b5";ctx.fillRect(-12,-8,24,4);ctx.fillRect(-12,0,18,4);
    }else{
      ctx.fillStyle="#f4d45d";ctx.beginPath();
      for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,r=k%2?9:19;const x=Math.cos(a)*r,y2=Math.sin(a)*r;k===0?ctx.moveTo(x,y2):ctx.lineTo(x,y2)}ctx.closePath();ctx.fill();
    }
    ctx.restore();
  }
}
function drawObstacles(){
  for(const o of obstacles){
    if(o.type==="vacuum"){
      ctx.fillStyle="#6e7780";ctx.fillRect(o.x,o.y,o.w,o.h);
      ctx.fillStyle="#414950";ctx.fillRect(o.x+12,o.y-18,10,18);ctx.strokeStyle="#414950";ctx.lineWidth=7;
      ctx.beginPath();ctx.moveTo(o.x+18,o.y-15);ctx.quadraticCurveTo(o.x+55,o.y-55,o.x+92,o.y-15);ctx.stroke();
      ctx.fillStyle="#9ba5ad";ctx.fillRect(o.x+8,o.y+6,o.w-16,6);
    }else{
      ctx.fillStyle="rgba(90,125,150,.48)";ctx.beginPath();ctx.ellipse(o.x+o.w/2,o.y+o.h/2,o.w/2,o.h/2,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,.55)";ctx.lineWidth=3;ctx.stroke();
    }
  }
}
function drawGoal(){
  ctx.fillStyle="#e9d8c0";ctx.fillRect(goal.x,goal.y,goal.w,goal.h);
  ctx.fillStyle="#8f6b4e";ctx.fillRect(goal.x+18,goal.y+28,54,70);
  ctx.fillStyle="#d6ad67";ctx.beginPath();ctx.arc(goal.x+60,goal.y+63,4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#fffaf4";ctx.font="bold 15px sans-serif";ctx.textAlign="center";ctx.fillText("おうち",goal.x+45,goal.y-12);
}
function drawPlayer(){
  const bob=player.onGround?Math.sin(player.anim)*2:0;
  const moving=Math.abs(player.vx)>45;
  const swing=moving?Math.sin(player.anim)*5:0;
  const x=player.x,y=player.y+bob;
  ctx.save();
  if(player.inv>0 && Math.floor(player.inv*12)%2===0)ctx.globalAlpha=.45;
  ctx.translate(x+player.w/2,y+player.h/2);
  ctx.scale(player.dir,1);
  // shadow
  ctx.restore();
  ctx.fillStyle="rgba(60,45,35,.16)";ctx.beginPath();ctx.ellipse(x+38,GROUND_Y+3,34,7,0,0,Math.PI*2);ctx.fill();
  ctx.save();
  if(player.inv>0 && Math.floor(player.inv*12)%2===0)ctx.globalAlpha=.45;
  ctx.translate(x+38,y+37+bob);
  if(player.state==="jump")ctx.rotate(player.vy<0?-0.05:0.05);
  if(catImg.complete && catImg.naturalWidth){
    const iw=catImg.naturalWidth,ih=catImg.naturalHeight,scale=Math.min(78/iw,68/ih);
    const dw=iw*scale,dh=ih*scale;
    ctx.drawImage(catImg,-dw/2,-dh/2,dw,dh);
  }else{
    ctx.fillStyle="#777";ctx.beginPath();ctx.ellipse(0,5,32,23,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#777";ctx.beginPath();ctx.arc(0,-18,23,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#333";ctx.beginPath();ctx.arc(-8,-20,2,0,Math.PI*2);ctx.arc(8,-20,2,0,Math.PI*2);ctx.fill();
  }
  // subtle motion marks to make states readable
  ctx.strokeStyle="rgba(80,55,40,.55)";ctx.lineWidth=3;ctx.lineCap="round";
  if(player.state==="run"){
    ctx.beginPath();ctx.moveTo(-35,18+swing);ctx.lineTo(-50,22+swing);ctx.moveTo(30,18-swing);ctx.lineTo(45,22-swing);ctx.stroke();
  }else if(player.state==="walk"){
    ctx.beginPath();ctx.moveTo(-34,20+swing);ctx.lineTo(-44,23+swing);ctx.stroke();
  }
  if(player.state==="jump"){
    ctx.beginPath();ctx.moveTo(-31,18);ctx.lineTo(-43,12);ctx.moveTo(31,18);ctx.lineTo(43,12);ctx.stroke();
  }
  ctx.restore();
}
function drawEffects(){
  for(const p of particles){
    ctx.globalAlpha=Math.max(0,p.life/p.max);
    ctx.fillStyle=p.kind==="hit"?"#e37b66":p.kind==="star"?"#f3d35b":"#d4a06f";
    ctx.beginPath();ctx.arc(p.x,p.y,3+4*(p.life/p.max),0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  for(const t of texts){
    ctx.globalAlpha=Math.max(0,t.life);
    ctx.fillStyle="#4f382a";ctx.font="bold 18px sans-serif";ctx.textAlign="center";ctx.fillText(t.text,t.x,t.y);
  }
  ctx.globalAlpha=1;
}

function loop(ts){
  const dt=Math.min(.033,(ts-last)/1000||.016);last=ts;
  update(dt);draw();requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener("keydown",e=>{
  keys[e.code]=true;
  if(["ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault();
  if(e.code==="ArrowLeft")input.left=true;
  if(e.code==="ArrowRight")input.right=true;
  if(e.code==="ShiftLeft"||e.code==="ShiftRight")input.dash=true;
  if(e.code==="Space" && !e.repeat)jump();
  if(e.code==="KeyP"&&!e.repeat&&running){paused=!paused;pauseOverlay.classList.toggle("hidden",!paused)}
});
window.addEventListener("keyup",e=>{
  keys[e.code]=false;
  if(e.code==="ArrowLeft")input.left=false;
  if(e.code==="ArrowRight")input.right=false;
  if(e.code==="ShiftLeft"||e.code==="ShiftRight")input.dash=false;
});

function bindHold(id,prop){
  const b=document.getElementById(id);
  const on=e=>{e.preventDefault();input[prop]=true;b.setPointerCapture?.(e.pointerId)};
  const off=e=>{e.preventDefault();input[prop]=false};
  b.addEventListener("pointerdown",on);b.addEventListener("pointerup",off);b.addEventListener("pointercancel",off);b.addEventListener("pointerleave",off);
}
bindHold("leftBtn","left");bindHold("rightBtn","right");bindHold("dashBtn","dash");
document.getElementById("jumpBtn").addEventListener("pointerdown",e=>{e.preventDefault();jump()});
document.getElementById("startBtn").onclick=reset;
document.getElementById("resumeBtn").onclick=()=>{paused=false;pauseOverlay.classList.add("hidden")};
document.getElementById("retryBtn").onclick=reset;
document.getElementById("retryBtn2").onclick=reset;

canvas.addEventListener("pointerdown",()=>{if(running&&!paused&&!gameOver&&!cleared)jump()});
})();
