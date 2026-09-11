const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const W=canvas.width,H=canvas.height,ground=455;
const ui={score:byId("score"),best:byId("best"),level:byId("level"),lives:byId("lives"),progress:byId("progress"),combo:byId("combo"),fish:byId("fish"),snack:byId("snack"),star:byId("star"),speed:byId("speed"),jumpPower:byId("jumpPower"),dashPower:byId("dashPower"),nextExp:byId("nextExp"),missionText:byId("missionText"),missionStatus:byId("missionStatus"),abilityText:byId("abilityText")};
const catImg=new Image();catImg.src="images/cat.png";
let keys={},running=false,paused=false,last=0,score=0,best=Number(localStorage.getItem("uchinokoBest")||0);
let level=1,exp=0,lives=3,world=0,shake=0,notice="",noticeTime=0,combo=0,comboTimer=0;
let collection={fish:0,snack:0,star:0},ability={name:"なし",time:0,shield:0};
let mission={type:"fish",target:3,reward:100,done:false};
const player={x:90,y:390,w:54,h:54,vy:0,onGround:false,face:1};
let items=[],obstacles=[],goalX=900;
function byId(x){return document.getElementById(x)}
function reset(){
 score=0;level=1;exp=0;lives=3;world=0;combo=0;comboTimer=0;ability={name:"なし",time:0,shield:0};
 collection={fish:0,snack:0,star:0};mission={type:["fish","combo","star"][Math.floor(Math.random()*3)],target:3,reward:100,done:false};
 if(mission.type==="combo"){mission.target=5;mission.reward=150}
 if(mission.type==="star"){mission.target=1;mission.reward=200}
 player.x=90;player.y=390;player.vy=0;
 items=[
  ...[180,310,470,650].map((x,i)=>({x,y:360-(i%2)*65,r:14,type:"fish",value:10,got:false})),
  ...[250,550,760].map(x=>({x,y:300,r:16,type:"snack",value:30,got:false})),
  ...[400,720].map(x=>({x,y:220,r:18,type:"star",value:100,got:false}))
 ];
 obstacles=[{x:350,y:421,w:70,h:34},{x:590,y:421,w:80,h:34},{x:800,y:421,w:55,h:34}];
 updateUI();
}
function updateUI(){
 ui.score.textContent=score;ui.best.textContent=best;ui.level.textContent=level;ui.lives.textContent=lives;ui.combo.textContent=combo;
 ui.progress.textContent=Math.min(100,Math.floor(player.x/goalX*100))+"%";
 ui.fish.textContent=collection.fish;ui.snack.textContent=collection.snack;ui.star.textContent=collection.star;
 ui.speed.textContent=(1+(level-1)*.18).toFixed(2);ui.jumpPower.textContent=(1+(level-1)*.22).toFixed(2);ui.dashPower.textContent=(1+(level-1)*.28).toFixed(2);
 ui.nextExp.textContent=(50-exp%50)+"pt";ui.abilityText.textContent=ability.name+(ability.time>0?" ("+Math.ceil(ability.time/60)+"秒)":"");
 let label=mission.type==="fish"?"魚を"+mission.target+"個集める":mission.type==="combo"?"コンボを"+mission.target+"までつなぐ":"星を"+mission.target+"個集める";
 let progress=mission.type==="fish"?collection.fish:mission.type==="combo"?combo:collection.star;
 ui.missionText.textContent=label+"（報酬 "+mission.reward+"pt）";ui.missionStatus.textContent=mission.done?"達成！":progress+"/"+mission.target;
}
function addScore(n){score+=n;if(score>best){best=score;localStorage.setItem("uchinokoBest",best)}}
function levelUp(){level++;notice="レベルアップ！能力が上がった！";noticeTime=110}
function collect(it){
 it.got=true;combo++;comboTimer=180;
 let multiplier=combo>=10?5:combo>=5?3:combo>=3?2:1;
 addScore(it.value*multiplier);collection[it.type]++;exp+=it.value;
 if(it.type==="star"&&Math.random()<.45)activate("🐾 猫ダッシュ",300);
 if(it.type==="snack"&&Math.random()<.35)activate("🍖 おやつ2倍",360);
 if(combo>=5&&Math.random()<.25)activate("🧲 お魚 magnet",300);
 while(exp>=50){exp-=50;levelUp()}
 checkMission();
 notice=(multiplier>1?"COMBO x"+multiplier+"! ":"")+(it.type==="fish"?"🐟 +"+it.value:it.type==="snack"?"🍪 +"+it.value:"⭐ +"+it.value);noticeTime=65;updateUI();
}
function checkMission(){
 let progress=mission.type==="fish"?collection.fish:mission.type==="combo"?combo:collection.star;
 if(!mission.done&&progress>=mission.target){mission.done=true;addScore(mission.reward);exp+=mission.reward;notice="ミッション達成！ +"+mission.reward+"pt";noticeTime=120;while(exp>=50){exp-=50;levelUp()}}
}
function activate(name,time){ability.name=name;ability.time=time;if(name.includes("バリア"))ability.shield=1}
function start(){reset();running=true;paused=false;hideOverlay();last=performance.now();requestAnimationFrame(loop)}
function showOverlay(title,text,button="もう一度遊ぶ"){byId("overlayTitle").textContent=title;byId("overlayText").textContent=text;byId("startBtn").textContent=button;byId("overlay").style.display="flex"}
function hideOverlay(){byId("overlay").style.display="none"}
function gameOver(){running=false;showOverlay("ゲームオーバー","スコア："+score+" / コンボ："+combo+" / コレクション："+(collection.fish+collection.snack+collection.star)+"個")}
function clearGame(){running=false;showOverlay("ステージクリア！","スコア："+score+" / レベル："+level+" / ミッション："+(mission.done?"達成":"未達成")+" / アイテム："+(collection.fish+collection.snack+collection.star)+"個")}
function jump(){if(player.onGround){player.vy=-(10.5+(level-1)*.22);player.onGround=false}}
function togglePause(){if(!running)return;paused=!paused;notice=paused?"一時停止中":"再開";noticeTime=50}
function update(dt){
 if(paused)return;
 if(comboTimer>0)comboTimer-=dt;else combo=0;
 if(ability.time>0)ability.time-=dt;else ability.name="なし";
 const speed=3.1+(level-1)*.18;
 let dir=(keys.ArrowRight||keys.right?1:0)-(keys.ArrowLeft||keys.left?1:0);
 const dash=keys.Shift||keys.dash;
 let abilityBoost=ability.name.includes("猫ダッシュ")?1.7:1;
 player.vx=dir*speed*(dash?1.8+(level-1)*.28:1)*abilityBoost;
 if(dir)player.face=dir;
 if((keys[" "]||keys.jump)&&player.onGround){jump();keys[" "]=false;keys.jump=false}
 player.x+=player.vx*dt;player.x=Math.max(20,Math.min(goalX,player.x));
 player.vy+=.52*dt;player.y+=player.vy*dt;
 if(player.y+player.h>=ground){player.y=ground-player.h;player.vy=0;player.onGround=true}
 for(const it of items)if(!it.got&&Math.hypot(player.x+player.w/2-it.x,player.y+player.h/2-it.y)<35)collect(it);
 for(const o of obstacles){
  if(player.x+player.w-8>o.x&&player.x+8<o.x+o.w&&player.y+player.h>o.y+4&&player.y<o.y+o.h){
   if(ability.name.includes("バリア")&&ability.shield){ability.shield=0;ability.name="なし";notice="バリアで防いだ！";noticeTime=70;player.x=Math.max(30,player.x-25)}
   else{lives--;combo=0;player.x=Math.max(30,player.x-55);player.vy=-5;shake=10;notice="ぶつかった！";noticeTime=45;if(lives<=0)gameOver()}
   updateUI();
  }
 }
 world+=dt;shake=Math.max(0,shake-dt);noticeTime=Math.max(0,noticeTime-dt);updateUI();
 if(player.x>=goalX-20)clearGame();
}
function draw(){
 ctx.save();if(shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#a9ddff");g.addColorStop(1,"#fff1cf");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.fillStyle="#f7d7a7";ctx.fillRect(0,ground,W,H-ground);ctx.fillStyle="#d49a62";for(let x=0;x<W;x+=70)ctx.fillRect(x,ground,2,H-ground);
 ctx.fillStyle="#8bcf7a";ctx.beginPath();ctx.arc(120,ground,90,Math.PI,2*Math.PI);ctx.arc(270,ground,120,Math.PI,2*Math.PI);ctx.fill();
 ctx.fillStyle="#9d6b45";ctx.fillRect(goalX,300,48,155);ctx.fillStyle="#f4c56e";ctx.fillRect(goalX+8,315,32,140);ctx.fillStyle="#6e4b35";ctx.beginPath();ctx.arc(goalX+33,385,4,0,7);ctx.fill();
 for(const o of obstacles){ctx.fillStyle="#777";ctx.fillRect(o.x,o.y,o.w,o.h);ctx.fillStyle="#c9e6ff";ctx.fillRect(o.x+8,o.y+7,o.w-16,9);ctx.fillStyle="#444";ctx.fillRect(o.x+10,o.y+o.h-5,10,5);ctx.fillRect(o.x+o.w-20,o.y+o.h-5,10,5)}
 for(const it of items)if(!it.got){ctx.save();ctx.translate(it.x,it.y+Math.sin(world/12+it.x)*4);ctx.rotate(Math.sin(world/18+it.x)*.1);ctx.font=(it.r*2)+"px serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(it.type==="fish"?"🐟":it.type==="snack"?"🍪":"⭐",0,0);ctx.restore()}
 ctx.save();ctx.translate(player.x+player.w/2,player.y+player.h/2);ctx.scale(player.face,1);if(catImg.complete&&catImg.naturalWidth)ctx.drawImage(catImg,-player.w/2,-player.h/2,player.w,player.h);else{ctx.font="48px serif";ctx.textAlign="center";ctx.fillText("🐱",0,12)}ctx.restore();
 if(noticeTime>0){ctx.fillStyle="rgba(73,59,50,.85)";ctx.font="bold 24px sans-serif";ctx.textAlign="center";ctx.fillText(notice,W/2,70)}
 ctx.restore();
}
function loop(t){if(!running)return;const dt=Math.min(2,(t-last)/16.67);last=t;update(dt);draw();requestAnimationFrame(loop)}
window.addEventListener("keydown",e=>{keys[e.key]=true;if(e.key==="p"||e.key==="P")togglePause();if(e.key==="c"||e.key==="C"){notice="図鑑：🐟"+collection.fish+" 🍪"+collection.snack+" ⭐"+collection.star;noticeTime=100}if(["ArrowLeft","ArrowRight"," ","Shift"].includes(e.key))e.preventDefault()});
window.addEventListener("keyup",e=>keys[e.key]=false);
document.querySelectorAll("[data-key]").forEach(b=>{const k=b.dataset.key;b.addEventListener("pointerdown",()=>{keys[k]=true;if(k==="jump")jump()});["pointerup","pointerleave","pointercancel"].forEach(ev=>b.addEventListener(ev,()=>keys[k]=false))});
byId("startBtn").onclick=start;byId("pauseBtn").onclick=togglePause;byId("collectionBtn").onclick=()=>{notice="図鑑：🐟"+collection.fish+" 🍪"+collection.snack+" ⭐"+collection.star;noticeTime=100};
reset();draw();