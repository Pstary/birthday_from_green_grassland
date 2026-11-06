import {starlightHall} from './starlight-hall.js?v=voice-input';
import {gardenPostOffice} from './garden-post-office.js';
import {mountWishBook} from './magic-wish-book.js?v=edge-art';
var wishExperience;
import {mountMemoryFireflies} from './firefly-memory.js';
var memoryExperience;
const $ = id => document.getElementById(id);
const local = (key, fallback) => JSON.parse(localStorage.getItem('birthday:'+key) ?? JSON.stringify(fallback));
const save = (key,value) => localStorage.setItem('birthday:'+key,JSON.stringify(value));
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stations = [
 ['voice','sheep','喜羊羊的声音留声机','喜羊羊','painted-sheep.svg','嘿嘿，要不要留下你的声音呀？','留下声音'],
 ['photo','mei','美羊羊的云端拍立得','美羊羊','painted-mei.svg','我们一起把美好的瞬间收藏起来吧！','收藏照片'],
 ['letter','warm','暖羊羊的祝福邮局','暖羊羊','painted-warm.svg','有些温柔的话，要认真写下来哦。','写下祝福'],
 ['wish','lazy','懒羊羊的星愿瓶','懒羊羊','lazy-wish-bottle.svg','你的愿望是什么？说不定真的会实现哦！','写个愿望'],
 ['year','slow','沸羊羊的魔法回忆瓶','沸羊羊','strong-memory-jar.svg','这一年，有好多值得记住的故事呢。','翻开回忆'],
 ['candle','wolf','灰太狼的生日魔法','灰太狼','painted-wolf.svg','嘿嘿！本大王的生日魔法要开始啦！','生日魔法']
];
const panel=$('panel'), dialog=$('dialog');
let scene, active, timer, cleanup, owner=false, unlocked=local('surprise',false);
let sound=local('music',true), audio, musicTimer, birthdayUntil=0, musicIndex=0;
const melody=[60,60,62,60,65,64,60,60,62,60,67,65,60,60,72,69,65,64,62,70,70,69,65,67,65];
function notes(pitches,step=.23,volume=.045){
 if(!sound)return;
 try{
  audio??=new AudioContext(); audio.resume().catch(()=>{});
  pitches.forEach((pitch,i)=>{
   const start=audio.currentTime+i*step, tone=audio.createOscillator(), gain=audio.createGain();
   tone.frequency.value=440*2**((pitch-69)/12);tone.type='sine';
   gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.025);gain.gain.exponentialRampToValueAtTime(.0001,start+step*.95);
   tone.connect(gain).connect(audio.destination);tone.start(start);tone.stop(start+step);
  });
 }catch{}
}
function music(){
 if(!sound||musicTimer)return;
 musicTimer=setInterval(()=>{if(Date.now()>birthdayUntil)notes([[60,64,67],[57,60,64],[53,57,60],[55,59,62]][musicIndex++%4],.38,.016)},2400);
}
document.addEventListener('click',()=>{if(sound){audio?.resume().catch(()=>{});music()}},{once:true});
$('music').onclick=()=>{
 sound=!sound;save('music',sound);$('music').textContent=sound?'♫':'♩';
 if(sound){notes([67,72]);music()}else{clearInterval(musicTimer);musicTimer=null;audio?.suspend().catch(()=>{})}
};
$('music').textContent=sound?'♫':'♩';
function particles(n){return Array.from({length:n},(_,i)=>'<i style="--h:'+(i*47%360)+';--left:'+(i*37%100)+'%;--delay:'+(i%11*.09)+'s;--dx:'+Math.cos(i*2.4)*155+'px;--dy:'+(-35-Math.abs(Math.sin(i*2.4))*150)+'px">'+['✦','●','✧','♡','▰'][i%5]+'</i>').join('')}
document.querySelector('.burst').innerHTML=particles(29);
document.querySelector('.sky').innerHTML=Array.from({length:34},(_,i)=>'<span class="'+(i<5?'cloud drift':i<9?'balloon':i<14?'bubble':'spark')+'" style="left:'+((i*31+4)%99)+'%;top:'+((i*23+8)%95)+'%;animation-delay:-'+(i%7)+'s">'+(i>=14?['✦','·','♡'][i%3]:'')+'</span>').join('');
const introScenes=new Set(['introIdle','giftFirstClick','giftOpening','invitationReveal','invitationReading','characterEntrance','characterDialogue','readyToEnter','transitionToWorld']);
let lineIndex=0, noteIndex=-1, giftReadyAt=0;
const lines=[
 ['喜羊羊','你终于来啦！我们等你好久啦！'],
 ['灰太狼','嘿嘿！今天本大王可是准备了大惊喜！'],
 ['喜羊羊','快跟我们一起去看看吧！']
];
function setScene(next){
 clearTimeout(timer);scene=next;
 if(next==='introIdle'){
  leaveHouse(false);
  clearTalk();clearTimeout(transition);transition=null;meadow.classList.remove('approach');
  $('veil').classList.remove('cover');$('secretNote').hidden=true;noteIndex=-1;
  $('parcelHint').textContent='咦？里面好像有动静！';
 }
 const isIntro=introScenes.has(next);
 $('intro').hidden=!isIntro;
 $('intro').dataset.scene=next;
 $('home').hidden=isIntro;
 $('exploreToggle').hidden=isIntro;
 $('home').classList.toggle('welcome',next==='characterWelcome');
 $('gift').classList.toggle('opening',next==='giftOpening');
 $('gift').disabled=next==='giftOpening';
 $('ears').hidden=next!=='giftFirstClick';
 $('invitation').hidden=!['invitationReveal','invitationReading','characterEntrance'].includes(next);
 $('greetingStage').hidden=!['characterEntrance','characterDialogue','readyToEnter','transitionToWorld'].includes(next);
 $('greetingCopy').hidden=next==='characterEntrance'||next==='transitionToWorld';
 $('nextLine').hidden=next!=='characterDialogue';
 $('skipTalk').hidden=next!=='characterDialogue';
 $('depart').hidden=next!=='readyToEnter';
 $('skip').disabled=next==='transitionToWorld';
 $('replay').hidden=isIntro;
}
function home(welcome=false){
 sessionStorage.setItem('birthday:seen','1');refreshVillage();
 requestAnimationFrame(centerMobileVillage);
 setScene(welcome?'characterWelcome':'home');
 if(welcome)timer=setTimeout(()=>setScene('home'),reduce()?30:2550);
}
$('gift').onclick=()=>{
 if(scene==='introIdle'){
  giftReadyAt=performance.now()+(reduce()?0:230);
  setScene('giftFirstClick');notes([67,72],.13,.027);
  $('parcelHint').textContent='嘘！差点被发现啦！再点一下就能打开。';
  return;
 }
 if(scene!=='giftFirstClick'||performance.now()<giftReadyAt)return;
 setScene('giftOpening');notes([60,67,72,76,79],.16);
 timer=setTimeout(()=>{
  const name=String(local('card',{})?.name??'').trim()||'寿星';
  $('inviteName').textContent=name;
  $('parcelName').textContent='羊村快递 · '+name+' 亲启';
  setScene('invitationReveal');
  timer=setTimeout(()=>{setScene('invitationReading');$('meet').focus({preventScroll:true})},reduce()?20:800);
 },reduce()?20:1640);
};
$('ears').onclick=()=>{if(scene==='giftFirstClick'){notes([76,81],.11,.025);$('parcelHint').textContent='没错！这份礼物就是专门为你准备的。'}};
$('note').onclick=()=>{
 if(scene!=='invitationReading')return;
 const wishes=['愿你每天都有好天气。','希望今年的愿望都能实现。','要一直做快乐的小羊呀！'];
 noteIndex=(noteIndex+1+Math.floor(Math.random()*(wishes.length-1)))%wishes.length;
 $('secretNote').textContent=wishes[noteIndex];$('secretNote').hidden=false;
};
function speak(){
 const [speaker,line]=lines[lineIndex];
 $('speaker').textContent=speaker;$('greetingLine').textContent=line;
 $('greetingStage').dataset.speaker=lineIndex===1?'wolf':'sheep';
}
$('meet').onclick=()=>{
 if(scene!=='invitationReading')return;
 lineIndex=0;speak();setScene('characterEntrance');
 timer=setTimeout(()=>{setScene('characterDialogue');$('nextLine').focus({preventScroll:true})},reduce()?20:980);
};
function ready(){
 setScene('readyToEnter');$('speaker').textContent='羊村 · 下一站';$('greetingLine').textContent='大家都在青青草原等你。';$('depart').focus({preventScroll:true});
}
$('nextLine').onclick=()=>{if(scene==='characterDialogue'){if(++lineIndex<lines.length)speak();else ready()}};
$('skipTalk').onclick=()=>{if(scene==='characterDialogue')ready()};
$('depart').onclick=()=>{
 if(scene!=='readyToEnter')return;
 setScene('transitionToWorld');$('veil').classList.add('cover');notes([67,72,79],.14,.028);
 timer=setTimeout(()=>{home(true);window.scrollTo(0,0);setTimeout(()=>$('veil').classList.remove('cover'),450)},reduce()?20:570);
};
$('skip').onclick=()=>{home();window.scrollTo(0,0)};
$('replay').onclick=()=>{window.scrollTo(0,0);setScene('introIdle');$('gift').focus({preventScroll:true})};
const cast=$('stations'), meadow=$('meadow');
const locations=[[.335,.66,1],[.665,.67,.95],[.225,.78,.92],[.415,.90,1],[.755,.78,.90],[.695,.92,1.04]];
let talking=null, recentKey='', recentCount=0, recentTime=0, transition;
const greetings=['愿你今天被好多好多爱包围！','愿你每天都有一件期待的小事。','新的一岁，也要记得照顾自己呀！'];
cast.innerHTML=stations.map(([key,id,title,name,asset,line,action],i)=>
 '<section class="actor-slot '+id+'" id="actor-'+id+'" style="--entrance:'+i*.13+'s;--x:'+locations[i][0]*100+'%;--y:'+locations[i][1]*100+'%;--depth:'+locations[i][2]+'">'+
 '<div class="speech" hidden>'+(id==='mei'?'<img class="dialogue-art" src="/assets/fj9s7ZbHd.jpeg" alt="" hidden>':'')+'<p></p><div class="speech-options"><button type="button" class="continue">'+action+'</button> <button type="button" class="chat">聊聊天</button></div></div>'+
 '<button type="button" class="actor" data-key="'+key+'" aria-expanded="false" aria-label="'+name+' · '+title+'">'+
 (asset?'<img src="/assets/'+asset+'" alt="">':'<span class="stand-in" aria-hidden="true"><svg viewBox="0 0 100 90"><path d="M15 73V43q0-18 18-18h43v48z" fill="#bad6d9" stroke="#698f97" stroke-width="3"/><path d="M26 74V48q0-14 15-14t15 14v26z" fill="#f9e6c8" stroke="#698f97" stroke-width="3"/><path d="M74 23v-9l14 3-14 5" fill="#e6b5bd" stroke="#698f97" stroke-width="2"/><path d="M33 49l8 7 8-7" fill="none" stroke="#9f746a" stroke-width="2"/><path d="M8 76h82" stroke="#698f97" stroke-width="3" stroke-linecap="round"/></svg></span>')+
 '<span class="actor-name">'+name+'<small>'+action+'</small></span></button></section>').join('');
function clearTalk(){
 if(!talking)return;
 talking.querySelector('.speech-options').innerHTML=talking.dataset.originalOptions||talking.querySelector('.speech-options').innerHTML;
 talking.classList.remove('talking');talking.dataset.behavior='idle';
 talking.querySelector('.speech').hidden=true;
 talking.querySelector('.actor').setAttribute('aria-expanded','false');
 talking=null;
}
function drawStations(){
 $('role').textContent=owner?'♛ 我是寿星':'♡ 我是朋友';
 $('surprise').hidden=!unlocked;
 cast.querySelectorAll('.actor').forEach(button=>{
  const locked=false;
  button.classList.toggle('locked',locked);
  button.querySelector('small').title=locked?'寿星专属':'';
 });
}
cast.onclick=e=>{
 const slot=e.target.closest('.actor-slot');
 if(!slot||transition)return;
 const actor=slot.querySelector('.actor'), key=actor.dataset.key;
 if(e.target.closest('[data-road-action]')){
  handleRoadAction(e.target.closest('[data-road-action]').dataset.roadAction);return;
 }
 if(e.target.closest('.chat')){
  ambientUntil=0;exchange=null;speakWorld(slot,pick(chatter[key]));return;
 }
 if(e.target.closest('.continue')){
  if(key==='candle'){try{audio??=new AudioContext();audio.resume().catch(()=>{})}catch{}}
  replyActor=slot;storyVisit={key,actions:0};
  const bounds=slot.getBoundingClientRect(), world=meadow.getBoundingClientRect();
  meadow.style.transformOrigin=(bounds.left-world.left+bounds.width/2)+'px '+(bounds.top-world.top+bounds.height/2)+'px';
  meadow.classList.add('approach');
  clearTalk();behavior(slot,'interacting');
  transition=setTimeout(()=>{transition=null;if(!$('home').hidden&&!dialog.open)open(key);else meadow.classList.remove('approach')},reduce()?0:280);
  return;
 }
 if(!e.target.closest('.actor'))return;
 stopMotion();ambientUntil=0;exchange=null;award('actor:'+key);
 const [,id]=stations.find(item=>item[0]===key);
 const line=preparations[key][0];
 const now=Date.now();
 recentCount=key===recentKey&&now-recentTime<1700?recentCount+1:1;
 recentKey=key;recentTime=now;
 clearTalk();talking=slot;
 let text=line;
 if(id==='mei')slot.querySelector('.speech img').hidden=false;
 if(id==='wolf'&&recentCount===3){
  slot.classList.add('wolf-celebrating');
  text='哎呀！被你发现本大王的小秘密啦！祝你天天有蛋糕吃！';
  recentCount=0;
 }else if(id==='sheep'&&recentCount>=2){
  text=greetings[Math.floor(Math.random()*greetings.length)];
  slot.classList.add('bashful');
  setTimeout(()=>slot.classList.remove('bashful'),1200);
 }
 if(key==='wish')text='嘘，我把愿望藏进星星里啦！你的愿望呢？我保证不偷看……除非是好吃的。';
 if(key==='year')text='瓶子里的每一束光，都藏着一段珍贵的回忆。';
 speakWorld(slot,text);
 if(key==='wish'||key==='year')configureGuide(slot,key);
};
document.querySelector('.actor-slot.lazy').append($('snack'));
$('snack').onclick=()=>{
 $('villageStatus').textContent='懒羊羊悄悄说：嘘，最后一块饼干留给今天的寿星！';
};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.open)clearTalk()});
dialog.addEventListener('close',()=>{meadow.classList.remove('approach');if(replyActor){behavior(replyActor,'idle');const visit=storyVisit;
 $('villageStatus').textContent=visit?(visit.actions?preparations[visit.key][1]:preparations[visit.key][2]):'欢迎回来，草地上还有好多故事。';
 storyVisit=null;replyActor=null}});
function title(text,sub){return '<span class="eyebrow">✦ CLOUD POST ✦</span><h2>'+text+'</h2><small>'+sub+'</small>'}
function show(key,html){
 cleanup?.();cleanup=null;active=key;
 dialog.dataset.world=key==='zoom'?'photo':key;panel.innerHTML=html;
 if(!dialog.open)dialog.showModal();
 dialog.scrollTo(0,0);
}
$('close').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{if(dialog.open)return;cleanup?.();cleanup=null;active=null;if(['candleCeremony','birthdaySurprise'].includes(scene))setScene('home')});
function setOwner(value){
 owner=value;
 drawStations();
 paintVillage();
}
const sessionReady=fetch('/api/session',{cache:'no-store'}).then(async response=>{
 if(response.ok)setOwner((await response.json()).owner===true);
}).catch(()=>{});
$('role').onclick=()=>{
 show('role',title('今天，你是谁？','朋友可以查看自己的投稿，寿星可以查看全部。')+
 '<button id="friend" type="button">♡ 我是朋友</button><form id="ownerLogin"><label>寿星口令<input type="password" name="password" autocomplete="current-password" required maxlength="256"></label><button>以寿星身份进入</button></form><p id="roleStatus" role="status"></p>');
 const status=$('roleStatus');
 async function changeRole(method,data){
  try{
   await sessionReady;
   const result=method==='POST'?await api('session',data):await fetch('/api/session',{method:'DELETE'}).then(async response=>{
    if(!response.ok)throw Error('切换失败，请重试。');
    return response.json();
   });
   setOwner(result.owner===true);
   if(status.isConnected)dialog.close();
  }catch(error){status.textContent=error.message}
 }
 $('friend').onclick=()=>changeRole('DELETE');
 $('ownerLogin').onsubmit=event=>{
  event.preventDefault();
  changeRole('POST',{password:new FormData(event.currentTarget).get('password')});
 };
};
$('surprise').onclick=()=>card();
function open(key){
 if(key==='wish')return showTree();
 if(key==='year')return exploreMemoryPath();
 if(!owner&&['wish','year'].includes(key)){show('locked',title('🔒 寿星专属','这份小秘密保存在寿星使用的浏览器里。')+'<p><button id="switch">切换身份</button></p>');$('switch').onclick=$('role').onclick;return}
 if(key==='year'){earnGift('year');storyAction('year')}
 if(key==='wish')storyAction('wish');
 if(key==='year')return exploreMemoryPath();
 if(key==='wish')return privatePanel(key);
 if(key==='candle')return candle();
 shared(key);
}
async function api(key, data){
 await sessionReady;
 const r=await fetch('/api/'+key,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{cache:'no-store'});
 const result=await r.json();if(!r.ok)throw Error(result.error);return result;
}
function encode(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob)})}
function shared(key){
 if(key==='voice'){cleanup=starlightHall({show,dialog,panel,api,esc,reduce,onPlayed:()=>{earnGift('voice');storyAction('voice')},onSaved:()=>{earnGift('voice');storyAction('voice');refreshVillage(true)}});return}
 if(key==='letter'){cleanup=gardenPostOffice({show,dialog,panel,api,esc,reduce,onSent:()=>{earnGift('letter');storyAction('letter');refreshVillage(true);sendLetterHome()},onRead:()=>{earnGift('letter');storyAction('letter')}});return}

 const photo=key==='photo',voice=key==='voice';
 let sharedPage=0,allShared=[];const events=new AbortController();
 show(key,title(stations.find(s=>s[0]===key)[2],'公共互动 · 和打开同一链接的朋友分享')+
 '<div id="sharedActions" class="row stack"><button id="compose" class="primary">'+(photo?'上传照片':voice?'录制留言':'写祝福')+'</button></div><form id="post" hidden><button id="backToList" type="button">← 返回浏览</button><input name="name" maxlength="40" placeholder="署名（选填）" aria-label="署名">'+
 (photo?'<label>选择照片<input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif" required></label><input name="caption" maxlength="150" placeholder="照片说明" aria-label="照片说明">':
 voice?'<div class="row"><button type="button" id="record">🎙 开始录音</button><button type="button" id="stop" disabled>停止录音</button></div><div id="preview"></div>':
 '<textarea name="caption" maxlength="1200" required placeholder="把祝福写在这里…" aria-label="祝福"></textarea>')+
 '<button class="primary">寄出'+(voice?'录音':photo?'照片':'祝福')+'</button></form><p class="status" id="status" role="status"></p><div id="entries" class="'+(photo?'wall':'')+'"></div>');
 const form=$('post'), status=$('status'), entries=$('entries'),actions=$('sharedActions');
 panel.classList.add('shared-themed');panel.dataset.theme=key;
 if(photo){entries.tabIndex=0;entries.setAttribute('aria-label','回忆照片，可上下浏览');}
 entries.insertAdjacentHTML('afterend','<nav id="sharedPages" class="shared-pagination"></nav>');
 form.classList.add('storybook-compose');
 const theme={photo:{title:'美羊羊的回忆相册',en:'LITTLE MOMENTS, FOREVER',desc:'把一起走过的日子，好好收藏。',actor:'painted-mei.svg',note:'每一张照片，都是回忆的小窗。'},voice:{title:'喜羊羊的留声小屋',en:'A VOICE WORTH KEEPING',desc:'让熟悉的声音，陪着今天的你。',actor:'painted-sheep.svg',note:'按下唱片，听一听远方的心意。'},letter:{title:'暖羊羊的祝福邮局',en:'LETTERS WITH LOVE',desc:'有些温柔，想认真写给你。',actor:'painted-warm.svg',note:'拆开一封信，遇见一份小小的温暖。'}}[key];
 const heading=document.createElement('div');heading.className='keepsake-heading';heading.innerHTML='<div class="keepsake-title"><span>'+theme.en+'</span><h2>'+theme.title+'</h2><p>'+theme.desc+'</p></div><img src="/assets/'+theme.actor+'" alt="" aria-hidden="true">';
 [...panel.children].slice(0,3).forEach(n=>n.remove());panel.prepend(heading);
 if(photo){heading.innerHTML='<div class="keepsake-title"><h2>美羊羊的回忆相册</h2></div>';$('compose').innerHTML='<span aria-hidden="true">＋</span><small>收藏新回忆</small>';$('compose').setAttribute('aria-label','上传照片');}
 actions.insertAdjacentHTML('afterbegin','<p class="collection-note">'+theme.note+'</p>');
 form.insertAdjacentHTML('afterbegin','<div class="writing-heading"><span>'+ (photo?'一张新的回忆':voice?'把声音留在这里':'给今天最特别的你')+'</span><p>'+ (photo?'挑选照片，再写下当时的小故事。':voice?'准备好了吗？把想说的话慢慢讲给 TA 听。':'不必写得很长，真心的话就很好。')+'</p></div>');
 
 if(voice){$('record').textContent='开始录音';$('stop').insertAdjacentHTML('afterend','<button id="recordPause" type="button" disabled>暂停</button>')}

 function compose(enabled){form.hidden=!enabled;entries.hidden=enabled;actions.hidden=enabled;$('sharedPages').hidden=enabled;status.textContent='';dialog.scrollTop=0;if(enabled)form.querySelector('input').focus();else $('compose').focus()}
 $('compose').onclick=()=>compose(true);
 let recording, stream, blob, previewUrl, recordTimer, disposed=false;
 const alive=()=>!disposed&&dialog.open;
 function refresh(){
  return api(key).then(items=>{
   if(!alive()||entries.querySelector('audio:not([paused])')&&[...entries.querySelectorAll('audio')].some(a=>!a.paused))return;
   allShared=items;sharedPage=Math.min(sharedPage,Math.max(0,Math.ceil(items.length/6)-1));
   const stamp=sharedPage+':'+items.map(item=>item.id).join(',');
   if(entries.dataset.stamp===stamp)return;
   entries.dataset.stamp=stamp;
   entries.innerHTML=items.length?(photo?items:items.slice(sharedPage*6,sharedPage*6+6)).map(item=>{
    const name=esc(item.name||'匿名朋友'), caption=esc(item.caption), url='/media/'+item.id;
    if(photo)return '<button class="print gallery-frame frame-'+(items.indexOf(item)%3)+'" data-photo="'+url+'" data-name="'+name+'" data-date="'+esc(new Date(item.created).toLocaleDateString('zh-CN'))+'"><img loading="lazy" src="'+url+'" alt="'+(caption||'拍立得')+'"><b>'+caption+'</b><small data-date="'+esc(new Date(item.created).toLocaleDateString('zh-CN'))+'">— '+name+'</small></button>';
    if(!voice)return '<article class="letter-envelope"><button data-open-letter aria-expanded="false"><span class="letter-seal">♡</span><b>来自 '+name+' 的一封信</b><small>'+new Date(item.created).toLocaleDateString('zh-CN')+'</small></button><div class="letter-paper" hidden><p>'+caption+'</p><footer>— '+name+'</footer></div></article>';
    return '<article class="entry"><b>'+name+'</b> <small>'+new Date(item.created).toLocaleDateString('zh-CN')+'</small><br>'+
    (voice?'<audio preload="metadata" src="'+url+'"></audio><button class="record-play" data-audio-play aria-label="播放或暂停语音"><i class="vinyl-disc"></i><span>播放这份心意</span></button><input class="audio-seek" type="range" min="0" max="100" value="0" aria-label="播放进度"><div class="row"><select aria-label="播放速度"><option>.75</option><option selected>1</option><option>1.25</option><option>1.5</option><option>2</option></select><a href="'+url+'" download="生日语音.'+(item.mime.includes('mp4')?'m4a':item.mime.includes('ogg')?'ogg':'webm')+'">下载</a></div>':caption)+'</article>';
   }).join(''):'<div class="world-empty"><span>'+ (photo?'第一页回忆，等你来翻开':voice?'唱片还在等待第一段声音':'第一封来信，正在路上')+'</span><p>点上方的'+(photo?'「上传照片」':voice?'「录制留言」':'「写祝福」')+'，留下你的心意。</p></div>';
   const last=Math.max(0,Math.ceil(items.length/6)-1);$('sharedPages').innerHTML=last?'<button id="sharedPrev" '+(sharedPage?'':'disabled')+'>上一页</button><span>'+(sharedPage+1)+' / '+(last+1)+'</span><button id="sharedNext" '+(sharedPage<last?'':'disabled')+'>下一页</button>':'';
   if(last){$('sharedPrev').onclick=()=>{sharedPage--;entries.dataset.stamp='';refresh()};$('sharedNext').onclick=()=>{sharedPage++;entries.dataset.stamp='';refresh()}}

  }).catch(()=>{if(alive())status.textContent='暂时无法加载，请稍后再试。'});
 }
 refresh();const polling=setInterval(refresh,5500);
 function release(){stream?.getTracks().forEach(t=>t.stop());stream=null;clearTimeout(recordTimer)}
 cleanup=()=>{disposed=true;events.abort();clearInterval(polling);if(recording&&recording.state!=='inactive')recording.stop();panel.querySelectorAll('audio').forEach(a=>a.pause());panel.classList.remove('shared-themed','is-recording');delete panel.dataset.theme;release();if(previewUrl)URL.revokeObjectURL(previewUrl)};
 $('backToList').onclick=()=>{
  if(voice&&$('record').disabled){status.textContent='请先停止录音，再返回浏览。';return}
  if(form.querySelector('.primary').disabled)return;
  compose(false);
 };
 entries.addEventListener('play',()=>{if(voice){earnGift('voice');storyAction('voice')}},true);
 entries.onchange=e=>{if(e.target.matches('select'))e.target.closest('article').querySelector('audio').playbackRate=Number(e.target.value)};
 entries.onclick=e=>{
  const letter=e.target.closest('[data-open-letter]');if(letter){const paper=letter.nextElementSibling;paper.hidden=!paper.hidden;if(!paper.hidden){earnGift('letter');storyAction('letter')}letter.setAttribute('aria-expanded',String(!paper.hidden));letter.closest('article').classList.toggle('opened',!paper.hidden);return}
  const photoButton=e.target.closest('[data-photo]');if(!photoButton)return;earnGift('photo');storyAction('photo');
  const prints=[...entries.querySelectorAll('[data-photo]')];let current=photoButton,closing=false;
  const viewer=document.createElement('dialog');viewer.className='garden-photo-viewer treasured-viewer';viewer.innerHTML='<div class="treasure-shell"><button class="treasure-close" aria-label="关闭大图">×</button><button class="treasure-prev" aria-label="上一张照片">‹</button><figure class="treasure-frame"><img class="treasure-original" alt=""></figure><button class="treasure-next" aria-label="下一张照片">›</button><i class="treasure-floral floral-a" aria-hidden="true"></i><i class="treasure-floral floral-b" aria-hidden="true"></i></div>';document.body.append(viewer);viewer.showModal();
  const shell=viewer.querySelector('.treasure-shell'),image=viewer.querySelector('img');
  const motion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches;
  function flight(back=false){const from=current.getBoundingClientRect(),to=shell.getBoundingClientRect();const pose={transform:'translate('+(from.x+from.width/2-to.x-to.width/2)+'px,'+(from.y+from.height/2-to.y-to.height/2)+'px) scale('+Math.max(.12,from.width/to.width)+') rotate(-3deg)',opacity:.25};return shell.animate(back?[{transform:'none',opacity:1},pose]:[pose,{transform:'none',opacity:1}],{duration:motion()?520:0,easing:'cubic-bezier(.22,.7,.24,1)',fill:'both'})}
  function display(button,initial=false){current.style.visibility='';current=button;current.style.visibility='hidden';image.alt=current.querySelector('img').alt;image.src=current.dataset.photo;viewer.querySelector('.treasure-prev').disabled=prints.length<2;viewer.querySelector('.treasure-next').disabled=prints.length<2;image.onload=()=>{shell.classList.toggle('portrait',image.naturalHeight>image.naturalWidth);if(initial)requestAnimationFrame(()=>flight());else if(motion())image.animate([{opacity:0,transform:'translateX(16px)'},{opacity:1,transform:'none'}],{duration:350})};}
  async function restore(){if(closing)return;closing=true;current.scrollIntoView({block:'nearest'});await flight(true).finished;viewer.close();viewer.remove();current.style.visibility='';current.focus({preventScroll:true});}
  function step(delta){if(closing)return;display(prints[(prints.indexOf(current)+delta+prints.length)%prints.length])}
  viewer.querySelector('.treasure-close').onclick=restore;viewer.querySelector('.treasure-prev').onclick=()=>step(-1);viewer.querySelector('.treasure-next').onclick=()=>step(1);viewer.addEventListener('cancel',event=>{event.preventDefault();restore()});viewer.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();step(-1)}if(event.key==='ArrowRight'){event.preventDefault();step(1)}});viewer.onclick=event=>{if(event.target===viewer)restore()};display(photoButton,true);


 };
 if(voice){
  panel.addEventListener('click',e=>{const play=e.target.closest('[data-audio-play]');if(!play)return;const region=play.closest('article')||play.parentElement;const a=region.querySelector('audio');if(!a)return;if(a.paused){panel.querySelectorAll('audio').forEach(other=>{if(other!==a)other.pause()});a.play().catch(()=>{status.textContent='这条声音暂时无法播放，请重试。'})}else a.pause()},{signal:events.signal});
  panel.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')e.target.parentElement.classList.add('playing')},{capture:true,signal:events.signal});panel.addEventListener('pause',e=>{if(e.target.tagName==='AUDIO')e.target.parentElement.classList.remove('playing')},{capture:true,signal:events.signal});panel.addEventListener('ended',e=>e.target.parentElement?.classList.remove('playing'),{capture:true,signal:events.signal});
  panel.addEventListener('timeupdate',e=>{if(e.target.tagName==='AUDIO'){const seek=e.target.parentElement.querySelector('.audio-seek');if(seek)seek.value=e.target.duration?e.target.currentTime/e.target.duration*100:0}},{capture:true,signal:events.signal});panel.addEventListener('input',e=>{if(e.target.matches('.audio-seek')){const a=e.target.parentElement.querySelector('audio');if(a&&Number.isFinite(a.duration))a.currentTime=a.duration*Number(e.target.value)/100}},{signal:events.signal});
  $('recordPause').onclick=()=>{if(recording?.state==='recording'){recording.pause();$('recordPause').textContent='继续';panel.classList.remove('is-recording')}else if(recording?.state==='paused'){recording.resume();$('recordPause').textContent='暂停';panel.classList.add('is-recording')}};
  $('record').onclick=async()=>{
   const record=$('record'),stop=$('stop');record.disabled=true;status.textContent='';
   try{
    const input=await navigator.mediaDevices.getUserMedia({audio:true});
    if(!alive()){input.getTracks().forEach(t=>t.stop());return}
    stream=input;recording=new MediaRecorder(stream);const chunks=[];
    recording.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    recording.onstop=()=>{
     release();if(!alive())return;
     blob=new Blob(chunks,{type:recording.mimeType||chunks[0]?.type||'audio/webm'});if(previewUrl)URL.revokeObjectURL(previewUrl);
     previewUrl=URL.createObjectURL(blob);$('preview').innerHTML='<audio src="'+previewUrl+'"></audio><button type="button" data-audio-play class="record-play"><i class="vinyl-disc"></i><span>试听录音</span></button><input class="audio-seek" type="range" min="0" max="100" value="0" aria-label="试听进度">';panel.classList.remove('is-recording');$('recordPause').disabled=true;record.textContent='↻ 重录';record.disabled=false;stop.disabled=true;status.textContent='录音完成，可以先试听。';
    };
    recording.start();stop.disabled=false;$('recordPause').disabled=false;panel.classList.add('is-recording');status.textContent='正在录音… 最长 60 秒';
    recordTimer=setTimeout(()=>{if(recording.state!=='inactive')recording.stop()},60000);
   }catch{release();if(alive()){record.disabled=false;status.textContent='无法录音，请检查麦克风权限和安全连接。'}}
  };
  $('stop').onclick=()=>{if(recording&&recording.state!=='inactive')recording.stop()};
 }
 form.onsubmit=async e=>{
  e.preventDefault();const submit=form.querySelector('.primary'), data=new FormData(form), file=photo?data.get('file'):blob;
  if(voice&&(recording&&recording.state!=='inactive'||!file?.size)){status.textContent='请先完成一段录音。';return}
  if(file?.size>11e6){status.textContent='请选择小于 11 MB 的文件。';return}
  submit.disabled=true;status.textContent='正在寄送…';form.classList.add('sending-keepsake');
  try{
   await api(key,{name:data.get('name'),caption:data.get('caption'),media:file?await encode(file):null,mime:file?.type});
   earnGift(key);storyAction(key);refreshVillage(true);if(key==='letter')sendLetterHome();
   if(!alive())return;form.reset();blob=null;if(voice)$('preview').replaceChildren();compose(false);await refresh();if(alive())status.textContent=photo?'':'寄出成功 ♡';
  }catch(err){if(alive())status.textContent=err.message}finally{submit.disabled=false;form.classList.remove('sending-keepsake')}
 };
}
function privatePanel(key,editing,mode='browse'){
 if(key==='wish')return mode==='edit'?wishExperience?.edit(editing):wishExperience?.open();
 if(key==='year')return memoryExperience?.manage(editing,mode);
 const wish=key==='wish', items=local(key,[]), current=items.find(i=>i.id===editing);
 const ordered=[...items].sort((a,b)=>b.date.localeCompare(a.date));
 show(key,title(wish?'许下新愿':'今年回望','寿星专属 · 仅存于这台设备')+'<div class="row stack">'+(mode==='browse'?'<button id="addPrivate" class="primary">'+(wish?'新增愿望':'新增节点')+'</button><button id="managePrivate">管理内容</button>':'<button id="returnPrivate">← 返回浏览</button>')+'</div><form id="privateForm" '+(mode==='edit'?'':'hidden')+'>'+
 (wish?'':'<label>日期<input name="date" type="date" required value="'+esc(current?.date??new Date().toLocaleDateString('sv-SE'))+'"></label>')+
 '<input name="title" required maxlength="160" aria-label="标题" placeholder="'+(wish?'写下你的愿望':'记录一个值得记住的时刻')+'" value="'+esc(current?.title)+'">'+
 (wish?'':'<textarea name="detail" maxlength="1200" placeholder="关于这一天（选填）" aria-label="详情">'+esc(current?.detail)+'</textarea><label>回顾照片（选填）<input type="file" name="photo" accept="image/jpeg,image/png,image/webp"></label>')+
 '<button class="primary">'+(current?'保存修改':'添加'+(wish?'愿望':'节点'))+'</button></form><div id="privateList" '+(mode==='edit'?'hidden':'')+' class="'+(wish?'':'timeline')+'">'+
 (ordered.map(item=>'<article class="entry"><small>'+esc(item.date)+'</small><br><b>'+esc(item.title)+'</b>'+(!wish&&item.detail?'<br>'+esc(item.detail):'')+(!wish&&item.photo?'<img class="memory-photo" src="'+esc(item.photo)+'" alt="回顾照片">':'')+'<div class="row">'+
 (mode==='manage'?'<button data-action="edit" data-id="'+item.id+'">编辑</button><button data-action="delete" data-id="'+item.id+'">删除</button>':wish?'<button data-action="toggle" data-id="'+item.id+'">'+(item.done?'✓ 已完成':'标记完成')+'</button>':'')+'</div></article>').join('')||'<p>这里还空着，等你留下第一笔。</p>')+'</div>');
 if(mode==='browse'){
  $('addPrivate').onclick=()=>privatePanel(key,null,'edit');
  $('managePrivate').onclick=()=>privatePanel(key,null,'manage');
 }else $('returnPrivate').onclick=()=>privatePanel(key);
 $('privateForm').onsubmit=async e=>{
  e.preventDefault();const data=new FormData(e.target), name=String(data.get('title')).trim();if(!name)return;
  const item={id:current?.id??crypto.randomUUID(),title:name,date:wish?(current?.date??new Date().toLocaleDateString('sv-SE')):data.get('date'),detail:data.get('detail'),done:current?.done??false};
  const form=e.target, file=data.get('photo'), submit=form.querySelector('button');
  submit.disabled=true;
  item.photo=current?.photo;
  try{
   if(file?.size){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>800000)throw Error('请选择小于 800 KB 的 JPG、PNG 或 WebP。');
    item.photo='data:'+file.type+';base64,'+await encode(file);
   }
   if(!dialog.open||!form.isConnected)return;
   save(key,[...items.filter(i=>i.id!==item.id),item]);storyAction(key);if(wish)earnGift('wish');paintVillage();privatePanel(key);
  }catch(error){
   if(form.isConnected){submit.disabled=false;const status=form.querySelector('.status')??form.appendChild(document.createElement('p'));status.className='status';status.setAttribute('role','status');status.textContent=error.name==='QuotaExceededError'?'此设备的存储空间不足，请改用更小的照片。':error.message}
  }
 };
 $('privateList').onclick=e=>{
  const {action,id}=e.target.dataset;if(!action)return;
  if(action==='edit')return privatePanel(key,id,'edit');
  if(action==='delete'&&!confirm('确定删除这条记录吗？'))return;
  save(key,action==='delete'?items.filter(i=>i.id!==id):items.map(i=>i.id===id?{...i,done:!i.done}:i));paintVillage();privatePanel(key,null,mode);
 };
}


$('groupPhoto').onclick=()=>show('group',title('羊村全家福','青青草原 · 生日留影')+'<figure class="group-print"><img src="/assets/family-garden-portrait.svg" alt="青青草原伙伴们的合照"></figure>');
const celebration='/assets/fj9s73Igl.jpeg';
function candle(){
 setScene('candleCeremony');
 const tips=[[50,1.4],[32,13.1],[66,14.2],[73.8,19.4]];
 show('candle','<div class="ceremony banquet-scene">'+
 '<div class="banquet-table"><img class="watercolor-cake" src="/assets/castle-cake-cutout.svg" alt="彩色城堡生日蛋糕">'+
 tips.map(([x,y],index)=>'<button type="button" class="castle-tip" aria-label="点亮第'+(index+1)+'座塔尖" aria-pressed="false" style="left:'+x+'%;top:'+y+'%"><i></i><b>✦</b><em></em></button>').join('')+
 '</div><div class="castle-controls" hidden><button id="blow">手动吹灭</button><button id="mic">吹蜡烛</button></div><p id="candleStatus" class="status" role="status">轻点城堡塔尖，点亮生日魔法</p></div>');
 const towers=[...panel.querySelectorAll('.castle-tip')];
 const timers=[];
 let stage='ready', stream, context, frame, alive=true;
 function later(action,delay){const timer=setTimeout(action,delay);timers.push(timer);return timer}
 function release(){cancelAnimationFrame(frame);stream?.getTracks().forEach(track=>track.stop());context?.close().catch(()=>{});stream=null;context=null}
 cleanup=()=>{alive=false;timers.forEach(clearTimeout);release()};
 let song;
 try{
  audio??=new AudioContext();
  audio.resume().catch(()=>{});
  const rate=audio.sampleRate;
  const phrase=[60,60,62,60,65,64,60,60,62,60,67,65,60,60,72,69,65,64,62,70,70,69,65,67,65];
  const beats=[.5,.5,1,1,1,2,.5,.5,1,1,1,2,.5,.5,1,1,1,1,2,.5,.5,1,1,1,2];
  const beat=.43, duration=beats.reduce((total,value)=>total+value,0)*beat;
  const recording=audio.createBuffer(1,Math.ceil(rate*(duration+.2)),rate);
  const samples=recording.getChannelData(0);
  let offset=0;
  phrase.forEach((pitch,index)=>{
   const frequency=440*2**((pitch-69)/12), length=beats[index]*beat;
   for(let frame=0;frame<Math.floor(length*rate);frame++){
    const t=frame/rate, phase=2*Math.PI*frequency*t;
    const envelope=Math.min(1,t/.012,(length-t)/.045)*Math.exp(-t*2.4);
    samples[Math.floor(offset*rate)+frame]=.19*envelope*(Math.sin(phase)+.28*Math.sin(phase*2)+.09*Math.sin(phase*3));
   }
   offset+=length;
  });
  song=audio.createBufferSource();
  song.buffer=recording;
  song.connect(audio.destination);
  birthdayUntil=Date.now()+duration*1000;
  song.start();
 }catch{}
 const releaseScene=cleanup;
 cleanup=()=>{song?.disconnect();birthdayUntil=0;releaseScene()};

 towers.forEach(tower=>tower.onclick=()=>{
  if(stage!=='ready'||tower.classList.contains('is-lit'))return;
  tower.classList.add('is-lit');
  tower.setAttribute('aria-pressed','true');
  if(towers.every(tip=>tip.classList.contains('is-lit'))){
   stage='lit';
   panel.querySelector('.castle-controls').hidden=false;
   $('candleStatus').textContent='塔尖都亮了，许个愿吧。';
  }
 });
 $('blow').onclick=blow;
 function blow(){
  if(stage!=='lit')return;
  stage='out';release();
  panel.querySelector('.castle-controls').hidden=true;
  towers.forEach(tower=>{tower.classList.remove('is-lit');tower.classList.add('is-out')});
  $('candleStatus').textContent='生日快乐！';
  award('candle');earnGift('candle');storyAction('candle');unlocked=true;save('surprise',true);drawStations();
  later(()=>{
   if(!dialog.open)return;
   if(partyStage==='ceremony'){showPartyCelebration();return}
   setScene('birthdaySurprise');
   show('envelope','<div class="surprise"><div class="confetti" aria-hidden="true">'+particles(46)+'</div>'+title('生日快乐！','青青草原送来了一封信')+'<img class="celebration-art" src="'+celebration+'" alt="喜羊羊与灰太狼一起庆祝"><button class="envelope" id="envelope">To：今天最特别的你<br>打开生日贺卡</button></div>');
   $('envelope').onclick=card;
  },reduce()?30:850);
 }
 $('mic').onclick=async()=>{
  $('mic').disabled=true;
  try{
   const input=await navigator.mediaDevices.getUserMedia({audio:{autoGainControl:false,noiseSuppression:false,echoCancellation:false}});
   if(!alive||!dialog.open||stage!=='lit'){input.getTracks().forEach(track=>track.stop());return}
   stream=input;context=new AudioContext();await context.resume();
   if(!alive||!dialog.open||stage!=='lit')return;
   const analyser=context.createAnalyser();context.createMediaStreamSource(stream).connect(analyser);
   const values=new Float32Array(analyser.fftSize);let samples=0,ambient=0,hits=0;
   $('candleStatus').textContent='麦克风已开启，轻轻吹一口气…';
   function sample(){
    analyser.getFloatTimeDomainData(values);
    const rms=Math.sqrt(values.reduce((sum,value)=>sum+value*value,0)/values.length);
    if(samples++<20)ambient+=rms/20;else hits=rms>Math.max(.045,ambient*2.8)?hits+1:0;
    if(hits>=7)blow();else frame=requestAnimationFrame(sample);
   }
   sample();
  }catch{release();if(alive&&dialog.open&&stage==='lit'){$('mic').disabled=false;$('candleStatus').textContent='麦克风暂不可用，可以手动吹灭。'}}
 };
}
const defaultCard={name:'今天最特别的你',date:'',message:'愿你像喜羊羊一样勇敢，像美羊羊一样闪耀，像懒羊羊一样自在快乐。\n\n愿所有认真许下的愿望，都在未来的日子里慢慢实现。\n\n无论长大多少岁，都要记得保留心里的那片青青草原。'};
function card(){
 if(!unlocked)return;
 setScene('birthdaySurprise');
 const config={...defaultCard,...local('card',{})}, date=config.date||new Date().toLocaleDateString('sv-SE');
 show('card','<article class="card"><span class="eyebrow">A LETTER FROM THE CLOUDS</span><h2>Happy Birthday！</h2><img class="celebration-art" src="'+celebration+'" alt=""><h3>亲爱的 '+esc(config.name)+'</h3><small>今天是 '+esc(date)+'</small><p>'+esc(config.message)+'</p><b>生日快乐！♡</b><p>来自青青草原的全体朋友</p></article><div class="row stack"><button id="png" class="primary">保存贺卡 PNG</button><button id="again">重玩吹蜡烛</button></div>'+
 (owner?'<details><summary>配置专属贺卡</summary><form id="settings"><label>寿星名字<input name="name" maxlength="40" required value="'+esc(config.name)+'"></label><label>生日日期<input name="date" type="date" required value="'+esc(date)+'"></label><label>专属祝福<textarea name="message" maxlength="650" required>'+esc(config.message)+'</textarea></label><button>保存贺卡内容</button></form></details>':'')+'<p class="status" id="cardStatus" role="status"></p>');
 $('again').onclick=candle;
 if(owner)$('settings').onsubmit=e=>{e.preventDefault();save('card',Object.fromEntries(new FormData(e.target)));card()};
 $('png').onclick=async()=>{
  const button=$('png'),status=$('cardStatus');button.disabled=true;
  try{
   const picture=new Image();picture.src=celebration;await picture.decode();
   const canvas=document.createElement('canvas');canvas.width=1000;const ctx=canvas.getContext('2d');
   const font='34px sans-serif';ctx.font=font;
   const lines=config.message.split('\n').flatMap(paragraph=>{
    const rows=[];let line='';
    for(const char of paragraph){if(ctx.measureText(line+char).width>820){rows.push(line);line=''}line+=char}
    return [...rows,line];
   });
   canvas.height=810+lines.length*48;
   const sky=ctx.createLinearGradient(0,0,0,canvas.height);sky.addColorStop(0,'#b8e6ff');sky.addColorStop(1,'#fffdf5');ctx.fillStyle=sky;ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.lineWidth=4;ctx.strokeStyle='#fff';ctx.strokeRect(32,32,936,canvas.height-64);
   ctx.textAlign='center';ctx.fillStyle='#285982';ctx.font='italic bold 74px Georgia';ctx.fillText('Happy Birthday!',500,143);
   const height=300,width=height*picture.width/picture.height;
   ctx.save();ctx.beginPath();ctx.roundRect(500-width/2,178,width,height,26);ctx.clip();ctx.drawImage(picture,500-width/2,178,width,height);ctx.restore();
   ctx.font='bold 42px sans-serif';ctx.fillText('亲爱的 '+config.name,500,548,840);
   ctx.font=font;ctx.fillText('今天是 '+date,500,602);
   lines.forEach((line,i)=>ctx.fillText(line,500,675+i*48,820));
   ctx.fillText('生日快乐！♡',500,canvas.height-94);ctx.font='25px sans-serif';ctx.fillText('来自青青草原的全体朋友',500,canvas.height-55);
   const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!png)throw Error('PNG');
   const url=URL.createObjectURL(png), link=document.createElement('a');link.href=url;link.download='青青草原生日贺卡.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
   status.textContent='PNG 已生成 ♡';
  }catch{status.textContent='无法生成贺卡，请重试。'}finally{button.disabled=false}
 };
}
let installEvent;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('install').hidden=false});
if(/Android|iPhone|iPad/i.test(navigator.userAgent)&&!navigator.standalone&&!matchMedia('(display-mode: standalone)').matches)$('install').hidden=false;
$('install').onclick=()=>{
 if(installEvent){installEvent.prompt();installEvent=null;return}
 show('install',title('添加到主屏幕','从桌面回到青青草原')+'<p>打开手机浏览器的分享菜单，选择「添加到主屏幕」。</p>');
};
drawStations();



const chatter={
 voice:['今天的风吹起来像一首歌。','要是紧张，就先和我一起深呼吸。','你的笑声比铃铛还好听。','生日愿望可以慢慢想。','等会儿我们一起去看云吧！'],
 photo:['刚刚的云好像一朵棉花糖。','笑不出来也没关系，自然就很好。','今天的光照在草地上真温柔。','我想把这片蓝天夹进相册。','拍完这张，我们再合一张影吧。'],
 letter:['我给信封挑了最好看的邮票。','一句简单的生日快乐也很珍贵。','想念一个人时，我就给他写信。','这些祝福，读慢一点也没关系。','等你写完，我来帮你投递。'],
 wish:['我刚才梦见一座布丁山，醒来才发现抱着的是枕头……','如果愿望有味道，我猜一定是烤饼干味的！','我给你留了半块蛋糕。另一半？嘿嘿，替你尝过啦。','等你的愿望实现了，要记得叫醒我一起庆祝哦。','小灰灰说我的羊毛像云朵，那我午睡是不是就算躺在天上啦？'],
 year:['回头看看，你比去年又勇敢了一点。','这件小事也值得放进回忆里。','有些日子，光是坚持下来就很了不起。','运动完在这里吹吹风最舒服。','来年我们再一起比比谁跑得更快。'],
 candle:['本大王早就把蛋糕藏好了。','蜡烛点亮以前，愿望要保密！','这次本大王绝不会把糖当成盐。','谁说我不会做甜点？你等着看！','生日一年只有一次，今天全听你的。']
};
const actors=[...cast.querySelectorAll('.actor-slot')];
const sheep=actors[0], starGoal=11;
const stars=new Set(local('worldStars',[]));
const starButton=$('worldStars'), activity=$('worldActivity');
let move, roomTimer, beat=0, offer=null, eventIndex=Math.floor(Math.random()*3), nextEvent=Date.now()+24000;
let replyActor, ambientUntil=0;
const pick=items=>items[Math.floor(Math.random()*items.length)];
function updateStars(){starButton.textContent='生日星星 '+stars.size+' / '+starGoal}
function award(id){
 if(stars.has(id))return;
 stars.add(id);save('worldStars',[...stars]);updateStars();updateInvite();
 $('villageStatus').textContent=stars.size>=starGoal?'星星集齐啦！打开星星册，看看额外祝福。':'找到一颗生日星星！';
}
updateStars();
starButton.onclick=()=>show('stars',title('生日星星册',stars.size+' / '+starGoal+' 颗')+'<p>和六位朋友见面，探索云朵，参加三场小事件，再吹灭生日蜡烛。</p><p>'+(stars.size>=starGoal?'愿你记得，今天的每一点小快乐，都有人认真为你准备。生日快乐！':'每一段新回忆，都能点亮一颗星星。')+'</p>');
function speakWorld(slot,text,ambient=false){
 clearTalk();talking=slot;slot.dataset.behavior='talking';
 slot.classList.add('talking');slot.querySelector('.speech').hidden=false;
 slot.querySelector('.speech p').textContent=text;
 slot.querySelector('.speech-options').hidden=ambient;
 slot.querySelector('.actor').setAttribute('aria-expanded','true');
 positionSpeech(slot);
}
function behavior(slot,name){slot.dataset.behavior=name}
function stopMotion(){
 if(!move)return;
 move.cancel();move=null;behavior(sheep,'idle');
}
function moveSheep(x,y){
 if(sheep.hidden||wishExperience?.isOpen()||memoryExperience?.isOpen()||dialog.open||talking||transition||$('home').classList.contains('welcome'))return;
 const world=meadow.getBoundingClientRect(), box=sheep.querySelector('.actor').getBoundingClientRect();
 const currentX=Number(sheep.dataset.dx||0),currentY=Number(sheep.dataset.dy||0);
 const baseX=box.left+box.width/2-world.left-currentX, baseY=box.bottom-world.top-currentY;
 x=Math.min(world.width*.69,Math.max(world.width*.13,x));
 y=Math.min(world.height*.91,Math.max(world.height*.63,y));
 const targetX=x-baseX,targetY=y-baseY;
 const style=getComputedStyle(sheep).translate.split(' ').map(parseFloat);
 const fromX=style[0]||0,fromY=style[1]||0;
 stopMotion();
 sheep.dataset.dx=targetX;sheep.dataset.dy=targetY;
 sheep.style.translate=targetX+'px '+targetY+'px';
 sheep.classList.toggle('facing-left',targetX<fromX);
 behavior(sheep,'walking');
 if(reduce()){behavior(sheep,'idle');return}
 move=sheep.animate([{translate:fromX+'px '+fromY+'px'},{translate:targetX+'px '+targetY+'px'}],{duration:Math.min(1050,Math.max(230,Math.hypot(targetX-fromX,targetY-fromY)*4)),easing:'ease-in-out'});
 move.onfinish=()=>{move=null;if(!sheep.classList.contains('talking'))behavior(sheep,'idle')};
}
meadow.addEventListener('click',e=>{
 if(e.target.closest('button,.speech')||wishExperience?.isOpen()||memoryExperience?.isOpen()||dialog.open||transition)return;
 const rect=meadow.getBoundingClientRect(), x=e.clientX-rect.left,y=e.clientY-rect.top;
 if(y<rect.height*.62||y>rect.height*.94)return;
 clearTalk();ambientUntil=0;
 const ripple=$('worldRipple');ripple.style.left=x+'px';ripple.style.top=y+'px';ripple.hidden=false;
 ripple.getAnimations().forEach(a=>a.cancel());
 ripple.animate([{opacity:1,scale:.4},{opacity:0,scale:1.5}],{duration:reduce()?1:470,fill:'forwards'});
 moveSheep(x,y);
});
window.addEventListener('resize',()=>{stopMotion();sheep.style.translate='';sheep.dataset.dx=0;sheep.dataset.dy=0});
const objectLines={door:['愿今天的你被温柔包围。','屋里给你留了靠窗的位置。','生日快乐，进村来玩吧！'],flowers:['花瓣轻轻摇了摇，像在和你打招呼。'],cloud:['云里藏着一颗亮闪闪的生日星星。'],pond:['池塘泛起了一圈涟漪。','一条小鱼吐了个泡泡。'],balloons:['气球带着你的愿望飞高了一点。']};
document.querySelectorAll('[data-prop]').forEach(button=>button.onclick=()=>{
 const prop=button.dataset.prop;
 if(prop==='camera')return groupPhoto();
 if(prop==='door'){
  return enterHouse(true);
 }
 button.getAnimations().forEach(a=>a.cancel());
 const effect={door:{rotate:'-12deg',scale:'.87 1'},flowers:{rotate:'9deg'},cloud:{scale:'1.22',opacity:.55},pond:{scale:'1.17',opacity:.75},balloons:{translate:'0 -22px'}}[prop];
 if(!reduce())button.animate([{},effect,{}],{duration:prop==='balloons'?1000:570});
 if(prop==='cloud')award('cloud');
 $('villageStatus').textContent=pick(objectLines[prop]);
});
const events=[
 ['灰太狼的蛋糕','糟糕！蛋糕差点忘记拿出来！','帮灰太狼摆蛋糕','放到桌上啦，蜡烛要等你亲自点亮。'],
 ['懒羊羊的零食','草地上有一块饼干，要怎么分？','送给懒羊羊','懒羊羊把饼干掰成了两半，分你一半。'],
 ['喜羊羊的隐藏星星','花丛里好像有一颗星星。','一起找星星','喜羊羊指了指路边的花丛。']
];
activity.onclick=()=>{
 if(offer===null)return;
 const id=offer,[name,text,label,result]=events[id];
 show('event',title(name,'羊村偶遇')+'<p>'+text+'</p><div class="row"><button id="eventYes" class="primary">'+label+'</button>'+(id===1?'<button id="eventNo">自己留着</button>':'')+'</div><p id="eventResult" role="status"></p>');
 function finish(message){
  award('event:'+id);offer=null;activity.hidden=true;$('eventResult').textContent=message;
  $('eventYes').disabled=true;if($('eventNo'))$('eventNo').disabled=true;
 }
 $('eventYes').onclick=()=>finish(result);
 if($('eventNo'))$('eventNo').onclick=()=>finish('懒羊羊说：那你替我尝尝香不香！');
};
const exchanges=[[5,'本大王的蛋糕可是最厉害的！',3,'那我能先尝一口吗？'],[1,'今天拍的照片一定很好看！',0,'因为今天大家都特别开心呀！'],[2,'我收到了好多祝福。',4,'等会儿把今天也写进回忆吧。']];
let exchange=null, nextChat=Date.now()+26000, nextBehavior=Date.now()+4700;
setInterval(()=>{
 if(document.hidden||$('home').hidden||houseOpen||wishExperience?.isOpen()||memoryExperience?.isOpen()||dialog.open||$('exploreDrawer').open||transition){exchange=null;if(ambientUntil){clearTalk();ambientUntil=0}return}
 const now=Date.now();
 refreshVillage();
 if(ambientUntil&&now>=ambientUntil){
  ambientUntil=0;clearTalk();
  if(exchange){speakWorld(actors[exchange[2]],exchange[3],true);exchange=null;ambientUntil=now+2700}
 }
 if(talking)return;
 if(now>=nextChat){
  nextChat=now+20000+Math.random()*25000;exchange=pick(exchanges);
  speakWorld(actors[exchange[0]],exchange[1],true);ambientUntil=now+2600;return;
 }
 if(now>=nextEvent&&offer===null){
  nextEvent=now+23000+Math.random()*18000;
  for(let i=0;i<events.length;i++){
   const id=eventIndex++%events.length;
   if(!stars.has('event:'+id)){offer=id;activity.textContent=events[id][0]+' · 去看看';activity.hidden=false;break}
  }
 }
 if(now>=nextBehavior){
  nextBehavior=now+4500+Math.random()*3000;
  const slot=actors[beat++%actors.length];
  if(slot===sheep&&!move){
   const rect=meadow.getBoundingClientRect(), actor=sheep.getBoundingClientRect();
   moveSheep(actor.left-rect.left+actor.width/2+pick([-22,22]),Math.max(rect.height*.65,actor.bottom-rect.top));
  }else if(!reduce()){
   behavior(slot,'special');
   const poses=[{rotate:'-3deg'},{translate:'2px -3px',rotate:'4deg'},{rotate:'-4deg'},{scale:'1.04'},{translate:'0 -2px',rotate:'3deg'},{rotate:'5deg',scale:'1.02'}];
   slot.querySelector('.actor img').animate([{},poses[actors.indexOf(slot)],{}],{duration:550}).onfinish=()=>{if(slot.dataset.behavior==='special')behavior(slot,'idle')};
  }
 }
},550);
function groupPhoto(){
 clearTalk();ambientUntil=0;exchange=null;stopMotion();
 const config=local('card',{}), name=config.name||'今天的寿星',date=config.date||new Date().toLocaleDateString('sv-SE');
 show('group',title('羊村合照','三、二、一，生日快乐！')+'<div id="photoSet" class="photo-set"><b>'+esc(name)+' · '+esc(date)+'</b><div class="photo-cast">'+'<img class="group-original" src="/assets/family-garden-portrait.svg" alt="青青草原全家福">'+'</div></div><div class="row stack"><button id="shoot" class="primary">拍一张</button><button id="downloadGroup" hidden>下载 PNG</button></div><p id="photoStatus" role="status"></p>');
 const frame=$('photoSet'),shoot=$('shoot'),download=$('downloadGroup'),status=$('photoStatus');
 let png;
 shoot.onclick=async()=>{
  shoot.disabled=true;
  try{
   const images=[...frame.querySelectorAll('img')];await Promise.all(images.map(img=>img.decode()));
   const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=780;const ctx=canvas.getContext('2d');
   const sky=ctx.createLinearGradient(0,0,0,780);sky.addColorStop(0,'#c6e9f8');sky.addColorStop(1,'#deebbf');ctx.fillStyle=sky;ctx.fillRect(0,0,1200,780);
   ctx.strokeStyle='#fffdf3';ctx.lineWidth=14;ctx.strokeRect(24,24,1152,732);
   ctx.textAlign='center';ctx.fillStyle='#315669';ctx.font='bold 42px sans-serif';ctx.fillText('青青草原 · 生日合照',600,105);
   ctx.font='28px sans-serif';ctx.fillText(name+' · '+date,600,156,1050);
   const img=images[0], scale=Math.min(1080/img.naturalWidth,540/img.naturalHeight);
   const width=img.naturalWidth*scale,height=img.naturalHeight*scale;
   ctx.drawImage(img,(1200-width)/2,185+(540-height)/2,width,height);
   png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!png)throw Error();
   const preview=URL.createObjectURL(png),image=new Image();image.alt='生成的羊村生日合照';image.src=preview;image.onload=()=>URL.revokeObjectURL(preview);
   frame.replaceChildren(image);frame.classList.add('developed');download.hidden=false;status.textContent='合照拍好了。';
  }catch{shoot.disabled=false;status.textContent='合照生成失败，请再拍一次。'}
 };
 download.onclick=()=>{if(!png)return;const url=URL.createObjectURL(png),link=document.createElement('a');link.href=url;link.download='羊村生日合照.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000)};
}
$('groupPhoto').onclick=groupPhoto;
$('worldLocate').onchange=e=>{
 const slot=actors.find(actor=>actor.querySelector('.actor').dataset.key===e.target.value);
 if(slot){$('exploreDrawer').close();slot.scrollIntoView({block:'nearest',inline:'center',behavior:reduce()?'instant':'smooth'});slot.querySelector('.actor').focus({preventScroll:true})}
 e.target.value='';
};
$('worldLocate').insertAdjacentHTML('beforeend',stations.map(([key,,,name])=>'<option value="'+key+'">'+name+'</option>').join(''));

const explore=$('exploreDrawer'), viewport=$('worldViewport');
$('exploreToggle').onclick=()=>{clearTalk();explore.showModal()};
$('closeExplore').onclick=()=>explore.close();
$('drawerReplay').onclick=()=>{explore.close();$('replay').click()};
explore.addEventListener('click',e=>{if(e.target===explore)explore.close()});
for(const id of ['worldStars','worldActivity','groupPhoto','surprise','install','dailyLetter','partyInvite','storyBook']){
 $(id).addEventListener('click',()=>{if(explore.open)explore.close()},{capture:true});
}
function positionSpeech(slot){
 const bubble=slot.querySelector('.speech'), actor=slot.querySelector('.actor');
 bubble.style.bottom='auto';bubble.style.height='auto';bubble.style.transform='none';
 const actorRect=actor.getBoundingClientRect(), view=viewport.getBoundingClientRect();
 const width=bubble.offsetWidth,height=bubble.offsetHeight;
 const left=Math.min(Math.max(view.left+8,actorRect.left+(actorRect.width-width)/2),view.right-width-8);
 const gap=['wish','year'].includes(actor.dataset.key)?12:46;
 const top=Math.min(view.bottom-height-7,Math.max(view.top+7,actorRect.top-height-gap));
 const parent=slot.getBoundingClientRect();
 bubble.style.left=left-parent.left+'px';bubble.style.top=top-parent.top+'px';
}
viewport.addEventListener('scroll',()=>{if(talking)positionSpeech(talking)},{passive:true});
window.addEventListener('resize',()=>{if(talking)positionSpeech(talking)});


const giftNames={voice:'声音纪念卡',photo:'拍立得纪念卡',letter:'祝福信纸',wish:'幸运星卡',year:'时光纪念票',candle:'生日魔法徽章'};
const gifts=new Set(local('characterGifts',[]));
const modes=['day','dusk','night'], modeLabels=['晴天','黄昏','星空'];
let skyMode=modes.includes(local('skyMode','day'))?local('skyMode','day'):'day';
let partyData={letter:[],photo:[],voice:[]}, syncedAt=0, syncPending;
const birthdayToday=()=>{
 const date=local('card',{})?.date;
 return !!date&&date.slice(5)===new Date().toLocaleDateString('sv-SE').slice(5);
};
const giftReady=()=>Object.keys(giftNames).every(key=>gifts.has(key));
function earnGift(key){
 if(gifts.has(key))return;
 gifts.add(key);save('characterGifts',[...gifts]);paintVillage();
 $('villageStatus').textContent='获得「'+giftNames[key]+'」，可以到小屋查看。';
}
function paintVillage(){
 renderMemoryPath();
 if(houseOpen)renderHouseStats();
 paintStory();
 $('home').dataset.time=skyMode;
 $('home').classList.toggle('gold-house',owner&&giftReady());
 $('home').classList.toggle('party-house',birthdayToday()||partyData.letter.length+partyData.photo.length+partyData.voice.length>=5);
 $('skyToggle').textContent=modeLabels[modes.indexOf(skyMode)];
 $('gardenCount').textContent=partyData.letter.length||'';
 const flowers=partyData.letter.slice(0,5);
 const flowerMarkup=flowers.map((item,i)=>'<button data-bloom="'+i+'" aria-label="阅读'+esc(item.name)+'的祝福"><svg viewBox="0 0 32 40" aria-hidden="true"><path d="M16 36V20m0 10-6-5" fill="none" stroke="#5d9468" stroke-width="2"/><path fill="'+['#e09bb6','#efd18e','#b4a3dc'][i%3]+'" d="M16 8c6-9 13-1 9 4 9 2 6 11-1 11-2 8-11 8-13 0-8 2-11-8-3-11-2-7 6-10 8-4z"/><circle cx="16" cy="17" r="4" fill="#fff2bf"/></svg></button>').join('');
 if($('gardenBlooms').dataset.markup!==flowerMarkup){$('gardenBlooms').dataset.markup=flowerMarkup;$('gardenBlooms').innerHTML=flowerMarkup}
 wishExperience?.sync();
 if($('treeCount'))$('treeCount').textContent='';
 requestAnimationFrame(alignIllustration);
 $('dailyLetter').hidden=!owner;
}
function refreshVillage(force=false){
 if(syncPending)return syncPending;
 if(!force&&Date.now()-syncedAt<12000)return Promise.resolve();
 syncPending=Promise.allSettled(Object.keys(partyData).map(async key=>{
  partyData[key]=await api(key);
 })).then(results=>{
  syncedAt=Date.now();paintVillage();
  return results[0].status==='fulfilled';
 }).finally(()=>{syncPending=null});
 return syncPending;
}
function markSecret(id){
 const secrets=new Set(local('villageSecrets',[]));
 if(!secrets.has(id)){secrets.add(id);save('villageSecrets',[...secrets])}
}
function cycleSky(){
 skyMode=modes[(modes.indexOf(skyMode)+1)%modes.length];
 save('skyMode',skyMode);paintVillage();
 if(skyMode==='night')$('villageStatus').textContent='窗边亮起了灯，夜里也有人在等你。';
}
$('skyToggle').onclick=cycleSky;
function showGarden(page=0){
 show('garden',title('羊村祝福花园','每朵花都来自一条真实留言')+'<div id="flowerPage" aria-live="polite">正在读留言…</div>');
 const content=$('flowerPage');
 refreshVillage(true).then(ok=>{
  if(!content.isConnected)return;
  const letters=partyData.letter;
  if(!ok&&!letters.length){content.textContent='暂时读不到祝福，请稍后重试。';return}
  const max=Math.max(0,Math.ceil(letters.length/12)-1);
  page=Math.min(max,Math.max(0,page));
  const flowers=letters.slice(page*12,page*12+12);
  content.innerHTML=flowers.length?'<div class="blossoms">'+flowers.map((letter,i)=>'<button type="button" data-flower="'+i+'" style="--petal:'+(['#e69ab7','#e7bc71','#aea4df','#92c8da'][letter.id%4])+'"><span aria-hidden="true">✿</span><small>'+esc(letter.name)+'</small></button>').join('')+'</div><div class="row"><button id="gardenPrev" '+(page?'':'disabled')+'>上一页</button><small>'+(page+1)+' / '+(max+1)+'</small><button id="gardenNext" '+(page<max?'':'disabled')+'>下一页</button></div><article id="flowerLetter" class="entry" hidden></article>':'<p>花园在等第一份祝福。</p>';
  content.insertAdjacentHTML('beforeend','<p><button id="gardenWrite">去写祝福</button></p>');
  $('gardenWrite').onclick=()=>open('letter');
  if(!flowers.length)return;
  $('gardenPrev').onclick=()=>showGarden(page-1);$('gardenNext').onclick=()=>showGarden(page+1);
  content.onclick=e=>{
   const flower=e.target.closest('[data-flower]');if(!flower)return;
   const letter=flowers[Number(flower.dataset.flower)], output=$('flowerLetter');
   output.innerHTML='<b>'+esc(letter.name)+'</b> <small>'+new Date(letter.created).toLocaleString('zh-CN')+'</small><br>'+esc(letter.caption);
   output.hidden=false;markSecret('flower');storyAction('letter');
  };
 });
}
function showWishStar(id){wishExperience?.open(String(id))}
function showTree(){if(owner)storyAction('wish');wishExperience?.open()}
$('gardenGate').onclick=()=>showGarden();
$('treeIndex').onclick=()=>{explore.close();showTree()};
let houseOpen=false, doorTimer;
function leaveHouse(focus=true){
 clearTimeout(doorTimer);doorTimer=null;houseOpen=false;
 $('cottageInterior').hidden=true;$('home').classList.remove('inside-cottage','entering-cottage');
 if(focus)meadow.querySelector('[data-prop="door"]').focus({preventScroll:true});
}
function enterHouse(animate=false){
 if(doorTimer)return;
 clearTalk();markSecret('house');
 if(dialog.open)dialog.close();
 if(animate&&!reduce()){
  $('home').classList.add('entering-cottage');
  doorTimer=setTimeout(openHouse,380);
 }else openHouse();
}
function openHouse(){
 doorTimer=null;houseOpen=true;$('home').classList.remove('entering-cottage');$('home').classList.add('inside-cottage');
 const room=$('cottageInterior');room.hidden=false;
 room.innerHTML='<div class="cottage-room welcome-room"><button id="leaveCottage">← 返回花园</button><div class="welcome-family"><button id="welcomeWishes" class="welcome-wish-note"><span>给未来的一封小信</span><b>打开整个愿望清单</b><small>轻轻点一下，看看你的心愿</small></button><img style="filter:saturate(.88) sepia(.07) drop-shadow(0 5px 5px #4a463340)" src="/assets/family-garden-portrait.svg" alt="羊村伙伴们与灰太狼一家欢迎你"><p>你来啦，大家都在这里等你。</p></div><button id="openCottageJournal" class="cottage-journal-trigger"><span>OUR LITTLE KEEPSAKES</span><b>小屋手记与生日收藏</b><small>翻开这一年的温柔时光 →</small></button></div>';
 $('leaveCottage').onclick=()=>leaveHouse();$('welcomeWishes').onclick=()=>open('wish');$('openCottageJournal').onclick=openCottageJournal;
 refreshVillage(true);$('leaveCottage').focus({preventScroll:true});
}
function openCottageJournal(){
 show('cottageJournal','<section class="cottage-journal"><span class="eyebrow">BIRTHDAY COTTAGE · OUR KEEPSAKES</span><h2>小屋手记</h2><p class="journal-intro">把收到的心意，收藏在这一页。</p><div id="cottageStats"></div><div class="journal-shelf">'+[['photo','回忆照片墙','一张照片，一次相见'],['voice','声音留声机','听见朋友的祝福'],['letter','祝福信箱','拆开一封温柔的信'],['wish','星愿瓶','写给未来的自己'],['year','萤火虫回忆瓶','让好时光重新亮起'],['candle','生日蜡烛','许一个特别的愿望']].map(([key,label,sub])=>'<button data-room="'+key+'"><b>'+label+'</b><small>'+sub+'</small></button>').join('')+'</div><div class="journal-extras"><button id="giftCabinet">神秘礼物柜</button><button id="roomWindow">打开窗户</button></div><p id="windowMessage" role="status"></p></section>');
 panel.querySelectorAll('[data-room]').forEach(button=>button.onclick=()=>open(button.dataset.room));$('giftCabinet').onclick=giftCabinet;
 $('roomWindow').onclick=()=>{markSecret('window');cycleSky();$('windowMessage').textContent=skyMode==='night'?'窗边亮起一盏为你留的灯。':'窗外传来朋友们的笑声。'};
 renderHouseStats();refreshVillage(true);
}
function renderHouseStats(){
 const target=$('cottageStats');if(!target)return;
 const config=local('card',{}), wishes=owner?local('wish',[]):[];
 let birthday='生日日期待设置';
 if(/^\d{4}-\d{2}-\d{2}$/.test(config?.date??'')){
  const today=new Date(), [month,day]=config.date.slice(5).split('-').map(Number);
  const now=Date.UTC(today.getFullYear(),today.getMonth(),today.getDate());
  let next=Date.UTC(today.getFullYear(),month-1,day);
  if(next<now)next=Date.UTC(today.getFullYear()+1,month-1,day);
  const remaining=(next-now)/86400000;
  birthday=config.date+' · '+(remaining?'距下次生日 '+remaining+' 天':'今天是生日');
 }
 target.innerHTML='<p><b>'+esc(config?.name||'今天的寿星')+'</b> · '+esc(birthday)+'</p><div class="cottage-counts">'+
 [['祝福',partyData.letter.length],['语音',partyData.voice.length],['照片',partyData.photo.length],['惊喜',unlocked?'贺卡已解锁':'等你点亮蜡烛']].map(([label,value])=>'<span><b>'+value+'</b><small>'+label+'</small></span>').join('')+'</div>';
}

function giftCabinet(){
 show('cabinet',title('神秘礼物柜','六份心意，各有自己的来处')+
 '<ul class="gift-list">'+Object.entries(giftNames).map(([key,label])=>'<li><span>'+esc(label)+'</span><small>'+(gifts.has(key)?'已收到':'尚未发现')+'</small></li>').join('')+'</ul>'+
 '<div class="row"><button id="backRoom">← 返回小屋</button>'+(owner&&giftReady()?'<button class="primary" id="finalGift">打开最终礼物</button>':'')+'</div>');
 $('backRoom').onclick=enterHouse;
 if($('finalGift'))$('finalGift').onclick=finalSurprise;
}
function finalSurprise(){
 if(!owner||!giftReady())return;
 save('finalOpened',true);birthdayUntil=Date.now()+8500;notes(melody,.34);
 const name=local('card',{})?.name||'今天的寿星';
 show('final',title('全羊村送你的生日礼物','亲爱的 '+esc(name))+'<div class="final-cast">'+stations.map(([, , ,label,asset])=>'<img src="/assets/'+asset+'" alt="'+label+'">').join('')+'</div><p>愿你始终有想做的事，也有人陪你慢慢去做。生日快乐！</p><div id="finalLetters"></div><div class="row"><button id="finalPhoto" class="primary">制作生日纪念照</button><button id="finalBack">返回小屋</button></div>');
 const letters=$('finalLetters');
 refreshVillage(true).then(()=>{if(letters.isConnected)letters.innerHTML=partyData.letter.slice(0,3).map(l=>'<p class="entry">'+esc(l.caption)+'<br><small>— '+esc(l.name)+'</small></p>').join('')});
 $('finalPhoto').onclick=()=>groupPhoto();
 $('finalBack').onclick=enterHouse;
}
function dailyNote(){
 if(!owner)return;
 const day=new Date().toLocaleDateString('sv-SE');
 let note=local('dailyNote',null);
 if(note?.day!==day){note={day,text:birthdayToday()?'今天是属于你的日子，羊村给你留了一盏最亮的灯。':pick(['遇到难过的事，也可以把今天过得慢一点。','愿你有喜欢的事，也有不赶时间的傍晚。','今天的小信，只想提醒你多给自己一点温柔。','我们把最软的一朵云留给你。'])};save('dailyNote',note)}
 show('daily',title('羊村今日来信',day)+'<p class="entry">'+esc(note.text)+'</p><p>青青草原的朋友们 ♡</p>');
}
$('dailyLetter').onclick=dailyNote;
const preparations={
 voice:['嘘，秘密电台已经开机了。想先听一段，还是亲口说声生日快乐？','喜羊羊把你的声音收进了今晚的电台。','喜羊羊把耳机留在桌上，等你回来。'],
 photo:['我正在挑今晚要挂起来的拍立得。来帮我看看哪张最有故事吧！','美羊羊把这段回忆夹进了派对相册。','美羊羊翻开一页空白相册，笑着等你。'],
 letter:['我给小屋准备了最后一封信。你愿意读读朋友们的心意，或写一封吗？','暖羊羊把祝福放进了小屋的邮袋。','暖羊羊把信纸放在窗边，随时等你来。'],
 wish:['星愿甜品屋快开门了！有些心愿得用星光烤一烤，你想来看看吗？','懒羊羊为你的心愿留了一颗小星星。','懒羊羊说，愿望要等你准备好再写。'],
 year:['瓶里的每一只萤火虫，都替我们记着一天的美好。','一束新的光，已经住进了回忆瓶。','瓶子会替你温柔收藏每一段时光。'],
 candle:['本大王正在调试生日魔法。蜡烛要等你亲自点亮才算成功！','灰太狼悄悄把蛋糕推到了派对桌边。','灰太狼说，蛋糕不会跑，等你回来再点。']
};
const progress=new Set(local('birthdayPlan',[]));
let storyVisit=null, partyStage='idle', partyTimer;
function storyAction(key){
 if(!Object.hasOwn(preparations,key)||(['wish','year'].includes(key)&&!owner))return;
 if(storyVisit?.key===key)storyVisit.actions++;
 if(progress.has(key))return;
 progress.add(key);save('birthdayPlan',[...progress]);paintStory();
}
function partyReady(){return owner&&Object.keys(preparations).every(key=>progress.has(key))}
function paintStory(){
 $('home').dataset.prepared=progress.size;
 $('home').classList.toggle('plan-ready',partyReady());
 updateInvite();
}
function updateInvite(){
 $('partyInvite').hidden=!partyReady()&&!stations.every(([key])=>stars.has('actor:'+key));
 $('partyInvite').textContent=partyReady()?'打开最终派对邀请':'灰太狼的秘密派对';
}
function sendLetterHome(){
 const envelope=$('mailFlight');
 if(reduce())return;
 envelope.getAnimations().forEach(animation=>animation.cancel());
 envelope.animate([{opacity:0,transform:'translate(-25vw,13vh) rotate(-14deg)'},{opacity:1,offset:.2},{opacity:1,offset:.76},{opacity:0,transform:'translate(0,0) rotate(5deg) scale(.55)'}],{duration:950});
}
$('storyBook').onclick=()=>{
 show('story',title('生日筹备手记','朋友们悄悄留下的消息')+
 '<div class="story-notes">'+stations.filter(([key])=>owner||!['wish','year'].includes(key)).map(([key,,,name])=>'<p><b>'+name+'</b><br>'+esc(preparations[key][progress.has(key)?1:2])+'</p>').join('')+'</div>');
};
const secrets={
 secretWindow:['窗里的悄悄话','美羊羊小声说：相片先挂起来，等寿星进来再开灯！'],
 secretBox:['一张没写完的卡片','卡片上写着：「亲爱的寿星，等灯亮起来，就知道是谁给你留的礼物啦……」'],
 secretCake:['蛋糕旁的便签','灰太狼写道：禁止偷吃！本大王刚刚那一口是为了检查质量。']
};
for(const [id,[heading,line]] of Object.entries(secrets))$(id).onclick=()=>{
 clearTalk();markSecret(id);
 show('secret',title(heading,'生日筹备现场')+'<p class="entry">'+esc(line)+'</p>');
};
function partyIntro(){if(!partyReady())return;clearTalk();partyStage='ceremony';candle();}
function showPartyCelebration(){
 partyStage='celebrated';save('birthdayPartyCelebrated',true);
 const name=local('card',{})?.name||'今天的寿星';
 show('partyCelebrated','<div class="surprise"><div class="confetti" aria-hidden="true">'+particles(36)+'</div>'+title('生日快乐，'+esc(name)+'！','六位朋友把今晚留给了你')+
 '<figure class="group-print"><img src="/assets/family-garden-portrait.svg" alt="青青草原全家福"></figure><p>愿你一直有想见的人、有想做的事，也有人陪你一起把愿望变成回忆。</p><div class="row"><button id="partySouvenir" class="primary">制作生日纪念合照</button><button id="partyCard">打开生日贺卡</button><button id="partyReplay">重温派对</button></div></div>');
 $('partySouvenir').onclick=()=>groupPhoto();$('partyCard').onclick=()=>card();$('partyReplay').onclick=partyIntro;
}
dialog.addEventListener('close',()=>{clearTimeout(partyTimer);partyStage='idle'});
$('partyInvite').onclick=()=>{
 if(partyReady())return partyIntro();
 if(!stations.every(([key])=>stars.has('actor:'+key)))return;
 show('party',title('灰太狼的秘密派对','六位朋友都在等你')+'<img class="celebration-art" src="/assets/candle.svg" alt=""><p>本大王已经摆好蛋糕，下一张合照可不能少了你！</p><div class="row"><button id="partyCake">去点蜡烛</button><button id="partyPhoto">一起合照</button></div>');
 $('partyCake').onclick=()=>open('candle');$('partyPhoto').onclick=()=>groupPhoto();
};

requestAnimationFrame(()=>{paintVillage();if(!$('home').hidden)refreshVillage()});



$('gardenMailbox').onclick=()=>open('letter');
$('gardenBlooms').onclick=e=>{
 const flower=e.target.closest('[data-bloom]');if(!flower)return;
 const letter=partyData.letter[Number(flower.dataset.bloom)];
 if(!letter)return;
 markSecret('flower');storyAction('letter');
 if(!reduce())flower.animate([{rotate:'0deg'},{rotate:'9deg'},{rotate:'0deg'}],320);
 show('bloom',title('花园里的祝福',esc(letter.name)+' · '+new Date(letter.created).toLocaleDateString('zh-CN'))+'<p class="entry">'+esc(letter.caption)+'</p>');
};
$('treeStars').onclick=e=>{
 const star=e.target.closest('[data-star]');if(star)showWishStar(star.dataset.star,()=>showTree(treePage));
};
let treePage=0;
const illustratedPoints={
 gardenGate:[.16,.46],gardenMailbox:[.08,.48],wishTree:[.855,.30],secretWindow:[.49,.39],secretBox:[.59,.54],secretCake:[.88,.48],
 door:[.402,.43],camera:[.62,.61],pond:[.73,.44],balloons:[.61,.39],cloud:[.23,.19],flowers:[.22,.50]
};
const stageActors=[[.295,.75],[.568,.68],[.16,.72],[.735,.695],[.43,.83],[.82,.88]];
function alignIllustration(){
 const w=meadow.clientWidth,h=meadow.clientHeight;
 if(!w||!h)return;
 const scale=Math.max(w/1774,h/887),iw=1774*scale,ih=887*scale;
 const left=(w-iw)/2,top=(h-ih)/2;
 const place=(target,x,y)=>{
  target.style.left=(left+x*iw)+'px';target.style.top=(top+y*ih)+'px';
 };
 actors.forEach((actor,i)=>place(actor,...stageActors[i]));
 place($('wolfFamily'),.91,.88);
 $('wolfFamily').style.left=Math.min(w-60,left+.91*iw)+'px';
 const wolfImage=actors[5].querySelector('.actor img').getBoundingClientRect();
 const visibleHeight=wolfImage.height*(508/512);
 meadow.style.setProperty('--wolf-height',visibleHeight+'px');
 $('wolfFamily').style.top=(wolfImage.bottom-meadow.getBoundingClientRect().top)+'px';
 meadow.style.setProperty('--wolf-ratio',String(332/622));

 layoutWishBranches(left,top,iw,ih);
 for(const [key,[x,y]] of Object.entries(illustratedPoints)){
  const item=$(key)||meadow.querySelector('[data-prop="'+key+'"]');
  if(key==='gardenMailbox'){
   const bed=$('gardenGate').parentElement;
   item.style.left=(left+x*iw-bed.offsetLeft+bed.offsetWidth/2)+'px';
   item.style.bottom='auto';item.style.top=(top+y*ih-bed.offsetTop+bed.offsetHeight/2)+'px';
  }else place(item.closest('.garden-bed,.wish-grove')||item,x,y);
 }
 meadow.style.setProperty('--picture-size',iw+'px '+ih+'px');
 if(talking)positionSpeech(talking);
}
function centerMobileVillage(){
 if(matchMedia('(max-width:650px)').matches&&!$('home').hidden)viewport.scrollLeft=Math.max(0,(meadow.offsetWidth-viewport.clientWidth)*.42);
}
new ResizeObserver(alignIllustration).observe(meadow);
requestAnimationFrame(centerMobileVillage);

setScene(sessionStorage.getItem('birthday:seen')?'home':'introIdle');


actors[5].querySelector('.actor img').addEventListener('load',alignIllustration);

function renderMemoryPath(){memoryExperience?.sync()}
function configureGuide(slot,key){
 const options=slot.querySelector('.speech-options');
 slot.dataset.originalOptions=slot.dataset.originalOptions||options.innerHTML;
 options.innerHTML=key==='wish'?'<button data-road-action="wishes">许下心愿</button><button type="button" class="chat">聊聊天</button>':
 '<button data-road-action="walk">打开萤火虫瓶</button><button type="button" class="chat">聊聊天</button>';
 if(key==='wish'){
  const star=$('treeStars').querySelector('[data-star]');
  if(star&&!reduce())star.animate([{filter:'drop-shadow(0 0 1px gold)'},{scale:1.25,filter:'drop-shadow(0 0 13px gold)'},{scale:1}],850);
 }
 positionSpeech(slot);
}
function requireBirthdayOwner(key,action){
 if(owner)return action();
 open(key);
}
function handleRoadAction(action){
 clearTalk();ambientUntil=0;exchange=null;
 if(action==='wishes')return showTree();
 if(action==='wish-new')return requireBirthdayOwner('wish',()=>privatePanel('wish',null,'edit'));
 if(action==='memories')return requireBirthdayOwner('year',()=>privatePanel('year'));
 if(action==='memory-new')return requireBirthdayOwner('year',()=>privatePanel('year',null,'edit'));
 if(action==='walk')return exploreMemoryPath();
}
function exploreMemoryPath(){
 if(houseOpen)leaveHouse(false);meadow.classList.remove('approach');clearTalk();ambientUntil=0;exchange=null;stopMotion();
 if(owner){earnGift('year');storyAction('year')}
 memoryExperience?.open();
}
function layoutWishBranches(left,top,width,height){wishExperience?.layout(left,top,width,height)}
$('snack').innerHTML='<img src="/assets/watercolor-cookie.svg" alt="饼干">';
document.querySelector('[data-prop="camera"]').innerHTML='<img src="/assets/watercolor-camera.svg" alt="羊村合照相机">';
requestAnimationFrame(alignIllustration);

memoryExperience=mountMemoryFireflies({
 actor:actors[4],isOwner:()=>owner,getRecords:()=>local('year',[]),
 commit:records=>{save('year',records);storyAction('year');paintVillage()},
 onOpen:()=>{clearTalk();ambientUntil=0;exchange=null;stopMotion();if(dialog.open)dialog.close();if($('exploreDrawer').open)$('exploreDrawer').close();behavior(actors[4],'interacting')},
 onClose:()=>{behavior(actors[4],'idle');$('villageStatus').textContent='萤火虫回到瓶中，美好的时光被温柔收藏。'},escapeHtml:esc,reduceMotion:reduce
});
memoryExperience.sync();
window.addEventListener('storage',e=>{if(['birthday:year','birthday:owner'].includes(e.key))memoryExperience.sync()});

wishExperience=mountWishBook({actor:actors[3],tree:$('wishTree'),layer:$('treeStars'),isOwner:()=>owner,getRecords:()=>local('wish',[]),
 commit:records=>{save('wish',records);storyAction('wish');earnGift('wish');paintVillage()},
 getSlots:()=>local('wishTreeSlots:'+(owner?'owner':'friend'),[]),saveSlots:ids=>save('wishTreeSlots:'+(owner?'owner':'friend'),ids),
 onOpen:()=>{clearTalk();ambientUntil=0;exchange=null;stopMotion();if(dialog.open)dialog.close();if(explore.open)explore.close();behavior(actors[3],'interacting')},
 onClose:()=>behavior(actors[3],'idle'),relayout:()=>requestAnimationFrame(alignIllustration),esc,reduce
});
wishExperience.sync();
window.addEventListener('storage',e=>{if(['birthday:wish','birthday:owner'].includes(e.key))wishExperience.sync()});

