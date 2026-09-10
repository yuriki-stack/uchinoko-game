const canvas=document.getElementById("gameCanvas"),ctx=canvas.getContext("2d");
const W=canvas.width,H=canvas.height;
const ui={
 score:document.getElementById("score"),lives:document.getElementById("lives"),progress:document.getElementById("progress"),
 start:document.getElementById("startOverlay"),pause:document.getElementById("pauseOverlay"),
 clear:document.getElementById("clearOverlay"),over:document.getElementById("overOverlay"),
 clearScore:document.getElementById("clearScore"),clearItems:document.getElementById("clearItems"),final:document.getElementById("finalScore")
};
const catImg=new Image();catImg.src="images/cat.png";

const WORLD=3600,GROUND=438;
let running=false,paused=false,last=0,score=0,lives=3,collected=0,elapsed=0;
let cameraX=0,items=[],obstacles=[],particles=[];
const keys={left:false,right:false};
const player={x:100,y:350,w:86,h:86,vx:0,vy:0,onGround:false,face:1,inv:0,jumpLock:false};

function reset(){
 score=0;lives=3;collected=0;elapsed=0;cameraX=0;items=[];obstacles=[];particles=[];
 Object.assign(player,{x:100,y:350,vx:0,vy:0,onGround:false,face:1,inv:0,jumpLock:false});
 buildStage();updateHUD();
}
function buildStage(){
 // Items distributed through the house.
 const specs=[
  [360,330,"🐟",10],[520,270,"🍖",30],[700,350,"🐟",10],[860,245,"⭐",100],
  [1080,330,"🐟",10],[1260,300,"🍖",30],[1450,340,"🐟",10],[1640,250,"⭐",100],
  [1880,330,"🐟",10],[2050,280,"🍖",30],[2250,350,"🐟",10],[2440,245,"⭐",100],
  [2700,320,"🐟",10],[2890,275,"🍖",30],[3080,340,"🐟",10],[3260,240,"⭐",100]
 ];
 items=specs.map(([x,y,emoji,value])=>({x,y,emoji,value,size:38,taken:false,spin:Math.random()*6.28}));
 obstacles=[
  {x:620,y:398,w:55,h:40,type:"vacuum"},
  {x:1180,y:402,w:45,h:36,type:"water"},
  {x:1780,y:398,w:55,h:40,type:"vacuum"},
  {x:2360,y:402,w:45,h:36,type:"water"},
  {x:3000,y:398,w:55,h:40,type:"vacuum"}
 ];
}
function start(){reset();running=true;paused=false;ui.start.classList.add("hidden");ui.clear.classList.add("hidden");ui.over.classList.add("hidden");last=performance.now();beep(520,.12,"triangle");requestAnimationFrame(loop)}
function gameOver(){running=false;ui.final.textContent=score;ui.over.classList.remove("hidden");beep(180,.2,"sawtooth")}
function clearStage(){running=false;ui.clearScore.textContent=score;ui.clearItems.textContent=collected;ui.clear.classList.remove("hidden");beep(880,.1,"triangle");setTimeout(()=>beep(1040,.12,"triangle"),100)}
function updateHUD(){ui.score.textContent=score;ui.lives.textContent="❤️".repeat(lives)+"🖤".repeat(3-lives);ui.progress=Math.min(100,Math.floor(player.x/(WORLD-180)*100))+"%";ui.progress.textContent=ui.progress}
function addParticles(x,y,t){for(let i=0;i<8;i++)particles.push({x,y,vx:(Math.random()-.5)*100,vy:-50-Math.random()*100,life:.7,t})}
function rectHit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}

function update(dt){
 elapsed+=dt;player.inv=Math.max(0,player.inv-dt);
 const accel=keys.left?-1:keys.right?1:0;
 const target=accel*250;player.vx+=(target-player.vx)*Math.min(1,dt*8);
 if(!accel)player.vx*=Math.pow(.001,dt);
 if(accel)player.face=accel;
 player.x+=player.vx*dt;
 player.x=Math.max(20,Math.min(WORLD-130,player.x));
 player.vy+=1050*dt;player.y+=player.vy*dt;
 if(player.y+player.h>=GROUND){player.y=GROUND-player.h;player.vy=0;player.onGround=true}else player.onGround=false;
 // Simple platform ledges for vertical variety.
 const platforms=[{x:480,y:345,w:170,h:18},{x:830,y:320,w:190,h:18},{x:1210,y:350,w:170,h:18},{x:1600,y:315,w:180,h:18},{x:1980,y:345,w:180,h:18},{x:2380,y:315,w:170,h:18},{x:2750,y:345,w:180,h:18},{x:3150,y:305,w:180,h:18}];
 if(player.vy>0){
  for(const p of platforms){
   if(player.x+player.w>p.x&&player.x<p.x+p.w&&player.y+player.h>=p.y&&player.y+player.h<=p.y+22){
    player.y=p.y-player.h;player.vy=0;player.onGround=true;break;
   }
  }
 }
 // collect
 for(const it of items){
  if(it.taken)continue;it.spin+=dt*4;
  const cx=it.x,cy=it.y;
  if(Math.abs(player.x+player.w/2-cx)<48&&Math.abs(player.y+player.h/2-cy)<48){
   it.taken=true;score+=it.value;collected++;addParticles(cx,cy,"+"+it.value);beep(it.value>=100?880:660,.08,it.value>=100?"triangle":"sine")
  }
 }
 // obstacles
 for(const o of obstacles){
  if(rectHit(player,{x:o.x,y:o.y,w:o.w,h:o.h})&&player.inv<=0){
   lives--;player.inv=1.0;player.vx=-player.face*170;player.vy=-320;addParticles(player.x,player.y,"-1 ❤️");beep(180,.13,"sawtooth");
   if(lives<=0){updateHUD();gameOver();return}
  }
 }
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
 cameraX+=(Math.max(0,Math.min(WORLD-W,player.x-W*.38))-cameraX)*Math.min(1,dt*5);
 updateHUD();
 if(player.x>WORLD-190)clearStage();
}

function jump(){
 if(!running||paused)return;
 if(player.onGround){player.vy=-455;player.onGround=false;beep(520,.07,"triangle")}
}
function drawRoom(){
 const start=Math.floor(cameraX/480)*480;
 ctx.fillStyle="#ead9bd";ctx.fillRect(0,0,W,H);
 // wall panels
 for(let x=start-480;x<WORLD;x+=480){
  ctx.fillStyle="#e0c9a5";ctx.fillRect(x-cameraX,0,470,GROUND);
  ctx.strokeStyle="#d2b48e";ctx.lineWidth=2;ctx.strokeRect(x-cameraX+20,55,430,285);
 }
 // windows and furniture at world positions
 drawWindow(180);drawSofa(1030);drawPlant(1500);drawTable(2100);drawSofa(2760);drawPlant(3330);
 // floor
 ctx.fillStyle="#caa87e";ctx.fillRect(0,GROUND,W,H-GROUND);
 ctx.strokeStyle="#b18e67";ctx.lineWidth=2;
 for(let x=Math.floor(cameraX/70)*70;x<WORLD;x+=70){ctx.beginPath();ctx.moveTo(x-cameraX,GROUND);ctx.lineTo(x-cameraX-35,H);ctx.stroke()}
 // rug
 ctx.fillStyle="#9d8167";ctx.globalAlpha=.5;ctx.fillRect(850-cameraX,455,420,55);ctx.globalAlpha=1;
}
function drawWindow(x){const sx=x-cameraX;if(sx<-250||sx>W+50)return;ctx.fillStyle="#8f745d";ctx.fillRect(sx,75,190,135);ctx.fillStyle="#acd7e8";ctx.fillRect(sx+11,86,168,113);ctx.strokeStyle="#8f745d";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(sx+95,86);ctx.lineTo(sx+95,199);ctx.moveTo(sx+11,142);ctx.lineTo(sx+179,142);ctx.stroke()}
function drawSofa(x){const sx=x-cameraX;if(sx<-300||sx>W+50)return;ctx.fillStyle="#8e6d54";ctx.fillRect(sx,205,215,170);ctx.fillStyle="#a98363";ctx.fillRect(sx-14,180,242,75);ctx.fillStyle="#755943";ctx.fillRect(sx+20,220,80,18);ctx.fillRect(sx+120,220,70,18)}
function drawPlant(x){const sx=x-cameraX;if(sx<-100||sx>W+100)return;ctx.fillStyle="#76513b";ctx.fillRect(sx,265,30,90);ctx.fillStyle="#5e805e";for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(sx+15+Math.cos(i)*34,245+Math.sin(i)*27,28,13,i*.7,0,Math.PI*2);ctx.fill()}}
function drawTable(x){const sx=x-cameraX;if(sx<-200||sx>W+100)return;ctx.fillStyle="#8d684e";ctx.fillRect(sx,250,230,25);ctx.fillRect(sx+25,275,20,125);ctx.fillRect(sx+185,275,20,125)}
function drawPlatforms(){const ps=[{x:480,y:345,w:170},{x:830,y:320,w:190},{x:1210,y:350,w:170},{x:1600,y:315,w:180},{x:1980,y:345,w:180},{x:2380,y:315,w:170},{x:2750,y:345,w:180},{x:3150,y:305,w:180}];for(const p of ps){ctx.fillStyle="#9c7658";ctx.fillRect(p.x-cameraX,p.y,p.w,18);ctx.fillStyle="#b9906b";ctx.fillRect(p.x-cameraX,p.y,p.w,6)}}
function drawItems(){ctx.textAlign="center";ctx.textBaseline="middle";for(const it of items){if(it.taken)continue;const sx=it.x-cameraX;ctx.save();ctx.translate(sx,it.y+Math.sin(it.spin)*5);ctx.rotate(Math.sin(it.spin)*.12);ctx.font=`${it.size}px serif`;ctx.fillText(it.emoji,0,0);ctx.restore()}}
function drawObstacles(){for(const o of obstacles){const sx=o.x-cameraX;if(o.type==="vacuum"){ctx.font="44px serif";ctx.fillText("🧹",sx+o.w/2,o.y+38)}else{ctx.fillStyle="#78a8b8";ctx.beginPath();ctx.ellipse(sx+o.w/2,o.y+18,o.w/2,18,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#a8d1dd";ctx.beginPath();ctx.ellipse(sx+o.w/2,o.y+12,o.w/3,8,0,0,Math.PI*2);ctx.fill()}}}
function drawGoal(){const x=WORLD-150-cameraX;ctx.fillStyle="#7e5b42";ctx.fillRect(x,300,95,138);ctx.fillStyle="#b8d7e6";ctx.fillRect(x+14,314,67,90);ctx.font="42px serif";ctx.fillText("🚪",x+47,355);ctx.font="18px system-ui";ctx.fillStyle="#5a4232";ctx.fillText("GOAL",x+47,425)}
function drawPlayer(){if(player.inv>0&&Math.floor(player.inv*14)%2===0)return;const bob=player.onGround?Math.sin(elapsed*9)*2:0;const ratio=catImg.naturalWidth/catImg.naturalHeight;let dw=player.w,dh=dw/ratio;if(dh>player.h){dh=player.h;dw=dh*ratio}ctx.save();ctx.translate(player.x-cameraX+player.w/2,player.y+player.h-dh/2+bob);ctx.scale(player.face,1);if(catImg.complete&&catImg.naturalWidth)ctx.drawImage(catImg,-dw/2,-dh/2,dw,dh);else{ctx.font="70px serif";ctx.fillText("🐱",0,0)}ctx.restore()}
function drawParticles(){ctx.font="bold 19px system-ui";ctx.textAlign="center";for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/.7);ctx.fillText(p.t,p.x-cameraX,p.y)}ctx.globalAlpha=1}
function draw(){drawRoom();drawPlatforms();drawItems();drawObstacles();drawGoal();drawPlayer();drawParticles(); // progress line
 ctx.fillStyle="#0003";ctx.fillRect(0,0,W,5);ctx.fillStyle="#8b684b";ctx.fillRect(0,0,W*Math.min(1,player.x/(WORLD-190)),5)
}

function loop(now){if(!running)return;if(!paused){const dt=Math.min((now-last)/1000,.033);last=now;update(dt);draw()}else last=now;if(running)requestAnimationFrame(loop)}
window.addEventListener("keydown",e=>{
 if(["ArrowLeft","ArrowRight","ArrowUp"," "].includes(e.key))e.preventDefault();
 if(e.key==="ArrowLeft")keys.left=true;if(e.key==="ArrowRight")keys.right=true;
 if((e.key==="ArrowUp"||e.key===" ")&&!e.repeat)jump();if((e.key==="p"||e.key==="P")&&!e.repeat)togglePause()
});
window.addEventListener("keyup",e=>{if(e.key==="ArrowLeft")keys.left=false;if(e.key==="ArrowRight")keys.right=false});
function bindHold(id,dir){const el=document.getElementById(id);el.addEventListener("pointerdown",e=>{e.preventDefault();keys[dir]=true;el.setPointerCapture?.(e.pointerId)});["pointerup","pointercancel","pointerleave"].forEach(t=>el.addEventListener(t,e=>{e.preventDefault();keys[dir]=false}))}
bindHold("leftBtn","left");bindHold("rightBtn","right");
document.getElementById("jumpBtn").addEventListener("pointerdown",e=>{e.preventDefault();jump()});
function togglePause(){if(!running)return;paused=!paused;ui.pause.classList.toggle("hidden",!paused)}
document.getElementById("startBtn").onclick=start;document.getElementById("restartBtn").onclick=start;document.getElementById("replayBtn").onclick=start;document.getElementById("resumeBtn").onclick=togglePause;document.getElementById("pauseBtn").onclick=togglePause;

let soundOn=true,audioCtx=null;
document.getElementById("soundBtn").onclick=()=>{soundOn=!soundOn;document.getElementById("soundBtn").textContent=soundOn?"🔊":"🔇"};
function beep(freq,duration=.08,type="sine"){if(!soundOn)return;audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=.035;o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}
reset();draw();
