const canvas=document.getElementById("gameCanvas");
const ctx=canvas.getContext("2d");
const W=canvas.width,H=canvas.height;

const ui={
 score:document.getElementById("score"),high:document.getElementById("highScore"),
 lives:document.getElementById("lives"),time:document.getElementById("time"),
 start:document.getElementById("startOverlay"),pause:document.getElementById("pauseOverlay"),
 over:document.getElementById("gameOverOverlay"),final:document.getElementById("finalScore"),
 record:document.getElementById("newRecord"),resultTitle:document.getElementById("resultTitle")
};
const catImg=new Image();catImg.src="images/cat.png";

let highScore=Number(localStorage.getItem("uchinokoHighScore")||0);
let running=false,paused=false,last=0,elapsed=0,spawnTimer=0;
let score=0,lives=3,timeLeft=60,items=[],particles=[];
const keys={left:false,right:false,dash:false};
const player={x:W/2-58,y:H-132,w:116,h:112,speed:400,invincible:0,bob:0,face:1};

ui.high.textContent=highScore;

function resetGame(){score=0;lives=3;timeLeft=60;elapsed=0;spawnTimer=0;items=[];particles=[];player.x=W/2-player.w/2;player.invincible=0;player.bob=0;updateHUD()}
function startGame(){resetGame();running=true;paused=false;ui.start.classList.add("hidden");ui.pause.classList.add("hidden");ui.over.classList.add("hidden");beep(520,.12,"triangle");last=performance.now();requestAnimationFrame(loop)}
function endGame(){running=false;ui.final.textContent=score;if(score>highScore){highScore=score;localStorage.setItem("uchinokoHighScore",highScore);ui.high.textContent=highScore;ui.record.classList.remove("hidden")}else ui.record.classList.add("hidden");ui.resultTitle.textContent=timeLeft<=0?"タイムアップ！":"おつかれさま！";ui.over.classList.remove("hidden");beep(220,.22,"sine")}
function updateHUD(){ui.score.textContent=score;ui.high.textContent=highScore;ui.lives.textContent="❤️".repeat(lives)+"🖤".repeat(3-lives);ui.time.textContent=Math.max(0,Math.ceil(timeLeft))}

function spawnItem(){
 const r=Math.random();let type="fish",value=10,emoji="🐟",size=38;
 if(r>.84&&r<=.95){type="snack";value=30;emoji="🍖";size=40}
 else if(r>.95&&r<=.985){type="star";value=100;emoji="⭐";size=42}
 else if(r<.055){type="heart";emoji="❤️";size=38}
 else if(r<.13){type="obstacle";value=-1;emoji="🧹";size=48}
 items.push({type,value,emoji,size,x:30+Math.random()*(W-60),y:-60,vy:125+Math.random()*120,spin:Math.random()*6.28})
}
function addParticles(x,y,text){for(let i=0;i<10;i++)particles.push({x,y,vx:(Math.random()-.5)*110,vy:-60-Math.random()*110,life:.75,text})}
function hit(a,b){return Math.abs(a.x+a.w/2-b.x)<a.w/2+b.size*.38&&Math.abs(a.y+a.h/2-b.y)<a.h/2+b.size*.38}

function update(dt){
 elapsed+=dt;timeLeft-=dt;player.invincible=Math.max(0,player.invincible-dt);player.bob+=dt*8;
 const boost=keys.dash?1.65:1;
 if(keys.left){player.x-=player.speed*boost*dt;player.face=-1}
 if(keys.right){player.x+=player.speed*boost*dt;player.face=1}
 player.x=Math.max(6,Math.min(W-player.w-6,player.x));
 spawnTimer-=dt;
 if(spawnTimer<=0){spawnItem();spawnTimer=Math.max(.30,.70-elapsed*.004)}
 for(let i=items.length-1;i>=0;i--){
  const it=items[i];it.y+=it.vy*dt;it.spin+=dt*4;
  if(hit(player,it)){
   if(it.type==="obstacle"){
    if(player.invincible<=0){lives--;player.invincible=1;addParticles(it.x,it.y,"-1 ❤️");beep(180,.14,"sawtooth");if(lives<=0){items.splice(i,1);updateHUD();endGame();return}}
   }else if(it.type==="heart"){lives=Math.min(3,lives+1);addParticles(it.x,it.y,"+❤️");beep(740,.1,"sine")}
   else{score+=it.value;addParticles(it.x,it.y,"+"+it.value);beep(it.type==="star"?880:660,.08,it.type==="star"?"triangle":"sine")}
   items.splice(i,1);continue
  }
  if(it.y>H+70)items.splice(i,1)
 }
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=130*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
 updateHUD();if(timeLeft<=0)endGame()
}

function drawBackground(){
 ctx.fillStyle="#e8d6b8";ctx.fillRect(0,0,W,H);
 ctx.fillStyle="#caa87e";ctx.fillRect(0,H*.68,W,H*.32);
 // soft wall decorations
 ctx.fillStyle="#d2b48e";ctx.beginPath();ctx.arc(770,105,54,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#f5e7cf";ctx.beginPath();ctx.arc(770,105,42,0,Math.PI*2);ctx.fill();
 // window
 ctx.fillStyle="#8f745d";ctx.fillRect(42,52,195,139);ctx.fillStyle="#a9d4e7";ctx.fillRect(54,64,171,115);
 ctx.strokeStyle="#8f745d";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(140,64);ctx.lineTo(140,179);ctx.moveTo(54,121);ctx.lineTo(225,121);ctx.stroke();
 // sofa
 ctx.fillStyle="#8f6d52";ctx.fillRect(W-250,128,192,178);ctx.fillStyle="#a98363";ctx.fillRect(W-266,105,225,72);
 // plant
 ctx.fillStyle="#76513b";ctx.fillRect(285,165,24,70);ctx.fillStyle="#5e805e";
 for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(300+Math.cos(i*.9)*30,143+Math.sin(i*.9)*23,27,13,i*.75,0,Math.PI*2);ctx.fill()}
 // rug
 ctx.fillStyle="#a58b72";ctx.globalAlpha=.55;ctx.fillRect(W*.22,H*.78,W*.56,H*.15);ctx.globalAlpha=1;
 ctx.strokeStyle="#b9956d";ctx.lineWidth=2;for(let x=0;x<W;x+=80){ctx.beginPath();ctx.moveTo(x,H*.68);ctx.lineTo(x-30,H);ctx.stroke()}
 // small bowl
 ctx.fillStyle="#a66d4d";ctx.beginPath();ctx.ellipse(455,470,42,13,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#d49a70";ctx.beginPath();ctx.ellipse(455,466,34,9,0,0,Math.PI*2);ctx.fill()
}
function drawPlayer(){
 if(player.invincible>0&&Math.floor(player.invincible*14)%2===0)return;
 const bob=Math.sin(player.bob)*2;
 if(catImg.complete&&catImg.naturalWidth){
  const ratio=catImg.naturalWidth/catImg.naturalHeight;let dw=player.w,dh=dw/ratio;
  if(dh>player.h){dh=player.h;dw=dh*ratio}
  ctx.save();
  ctx.translate(player.x+player.w/2,player.y+player.h-dh/2+bob);
  ctx.scale(player.face,1);
  ctx.drawImage(catImg,-dw/2,-dh/2,dw,dh);
  ctx.restore();
 }else{ctx.font="82px serif";ctx.fillText("🐱",player.x+10,player.y+82)}
 // dash shadow
 if(keys.dash){ctx.fillStyle="#0002";ctx.beginPath();ctx.ellipse(player.x+player.w/2,H-19,48,8,0,0,Math.PI*2);ctx.fill()}
}
function drawItems(){ctx.textAlign="center";ctx.textBaseline="middle";for(const it of items){ctx.save();ctx.translate(it.x,it.y);ctx.rotate(Math.sin(it.spin)*.12);ctx.font=`${it.size}px serif`;ctx.fillText(it.emoji,0,0);ctx.restore()}}
function drawParticles(){ctx.font="bold 20px system-ui";ctx.textAlign="center";for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/.75);ctx.fillText(p.text,p.x,p.y)}ctx.globalAlpha=1}
function draw(){drawBackground();drawItems();drawPlayer();drawParticles()}

function loop(now){if(!running)return;if(!paused){const dt=Math.min((now-last)/1000,.033);last=now;update(dt);draw()}else last=now;if(running)requestAnimationFrame(loop)}

window.addEventListener("keydown",e=>{
 if(e.key==="ArrowLeft"||e.key==="ArrowRight"||e.key===" "){e.preventDefault()}
 if(e.key==="ArrowLeft")keys.left=true;if(e.key==="ArrowRight")keys.right=true;if(e.key==="Shift")keys.dash=true;
 if((e.key==="p"||e.key==="P")&&!e.repeat)togglePause()
});
window.addEventListener("keyup",e=>{if(e.key==="ArrowLeft")keys.left=false;if(e.key==="ArrowRight")keys.right=false;if(e.key==="Shift")keys.dash=false});
function bindHold(id,dir){const el=document.getElementById(id);el.addEventListener("pointerdown",e=>{e.preventDefault();keys[dir]=true;el.setPointerCapture?.(e.pointerId)});["pointerup","pointercancel","pointerleave"].forEach(t=>el.addEventListener(t,e=>{e.preventDefault();keys[dir]=false}))}
bindHold("leftBtn","left");bindHold("rightBtn","right");bindHold("dashBtn","dash");

function togglePause(){if(!running)return;paused=!paused;ui.pause.classList.toggle("hidden",!paused)}
document.getElementById("startBtn").onclick=startGame;document.getElementById("restartBtn").onclick=startGame;document.getElementById("resumeBtn").onclick=togglePause;document.getElementById("pauseBtn").onclick=togglePause;

let soundOn=true,audioCtx=null;
document.getElementById("soundBtn").onclick=()=>{soundOn=!soundOn;document.getElementById("soundBtn").textContent=soundOn?"🔊":"🔇"};
function beep(freq,duration=.08,type="sine"){if(!soundOn)return;audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=.035;o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}
resetGame();draw();
