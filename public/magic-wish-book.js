import {orderedRecords,dateParts,yearLabel} from './record-dates.js';
export function mountWishBook({actor,tree,layer,isOwner,getRecords,commit,getSlots,saveSlots,onOpen,onClose,relayout,esc,reduce}){
 let selected=null,view='detail',editing=null,year='',month='',known=null,slots=[],layoutState=null,returnFocus,turning=false,more=false,confirming=false;
 const all=()=>orderedRecords(getRecords()),visible=()=>all().filter(w=>isOwner()||w.public===true);
 const pending=()=>visible().filter(w=>!w.done);
 const filtered=()=>pending().filter(w=>(!year||dateParts(w).year===year)&&(!month||dateParts(w).month===month));
 const book=document.createElement('dialog');book.id='magicWishBook';book.setAttribute('aria-label','魔法心愿册');
 book.innerHTML='<section class="wishbook-shell"><button class="wishbook-close" aria-label="合上许愿册">合上书页 ×</button><div class="wishbook-heading"><span>A LITTLE BOOK OF WISHES</span><h2>把心愿，写进星光里</h2></div><div class="wishbook-stage"><div id="wishbookPages" class="wishbook-pages"></div><nav class="bookmarks" aria-label="心愿日期书签"></nav><button id="wishbookPrev" class="book-edge" aria-label="上一个愿望" title="上一页">‹</button><button id="wishbookNext" class="book-edge" aria-label="下一个愿望" title="下一页">›</button></div><p id="wishbookStatus" role="status"></p></section>';
 let directorySpread=0, directoryYear="", directoryMonth="";
 document.body.append(book);const stage=book.querySelector('.wishbook-stage'),$=id=>book.querySelector('#'+id);
 const icons={edit:'✎',add:'✒',toggle:'✧',more:'···',save:'✦',cancel:'↶'};
 const control=(action,label,extra='')=>'<button type="button" class="paper-tool" '+extra+' title="'+label+'" aria-label="'+label+'">'+icons[action]+'</button>';
 function fitBook(){if(turning)return;const r=stage.getBoundingClientRect(),width=Math.min(r.width-64,r.height*1.603)*.95;stage.style.setProperty('--book-w',Math.max(0,width)+'px');stage.style.setProperty('--book-h',Math.max(0,width)/1.603+'px')}
 new ResizeObserver(fitBook).observe(stage);
 const trunk=document.createElement('button');trunk.id='wishTree';trunk.type='button';trunk.setAttribute('aria-label','展开魔法许愿册');trunk.title='每一颗星星，都藏着一个小小的心愿。';trunk.innerHTML='<span class="tree-whisper">每一颗星星，都藏着一个小小的心愿。</span>';tree.replaceWith(trunk);
 function fx(node,frames,options){if(!reduce()&&node){const animation=node.animate(frames,options);animation.finished.catch(()=>{});return animation}}
 function layout(left,top,width,height){
  layoutState={left,top,width,height};if(layer.parentElement!==actor.closest('#meadow'))actor.closest('#meadow').append(layer);
  const points=[[.755,.25],[.79,.16],[.835,.12],[.885,.19],[.86,.27],[.81,.29],[.74,.32],[.78,.38],[.835,.36],[.885,.34],[.72,.20],[.87,.11]];
  layer.querySelectorAll('.branch-star').forEach((node,i)=>{const [x,y]=points[i];node.style.left=(left+x*width)+'px';node.style.top=(top+y*height)+'px'});
 }
 function sparkle(id,completed=false){
  const button=[...layer.querySelectorAll('[data-star]')].find(n=>n.dataset.star===String(id));if(!button)return;
  fx(button,[{filter:'brightness(1)'},{filter:'brightness(1.5)',scale:1.16},{filter:'brightness(1)',scale:1}],{duration:850});
  if(completed&&!reduce()){
   const r=button.getBoundingClientRect(),trail=document.createElement('span');trail.className='wishbook-meteor';trail.style.left=(r.x+r.width/2)+'px';trail.style.top=(r.y+r.height/2)+'px';document.body.append(trail);
   const a=fx(trail,[{transform:'translate(0,0) rotate(28deg)',opacity:0},{opacity:.7,offset:.2},{transform:'translate(65px,35px) rotate(28deg)',opacity:0}],{duration:950,easing:'ease-out'});a?.finished.finally(()=>trail.remove());
  }
 }
 function flight(id){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   const destination=[...layer.querySelectorAll('[data-star]')].find(n=>n.dataset.star===String(id));if(!destination||reduce())return;
   const a=actor.querySelector('.actor img').getBoundingClientRect(),b=destination.getBoundingClientRect();
   const start={x:a.x+a.width*.87,y:a.y+a.height*.38},end={x:b.x+b.width/2,y:b.y+b.height/2};const dot=document.createElement('span');dot.className='wishbook-flight';dot.style.left=start.x+'px';dot.style.top=start.y+'px';document.body.append(dot);
   const animation=fx(dot,[{transform:'translate(0,0) scale(.5)',opacity:0},{transform:'translate('+((end.x-start.x)*.5)+'px,'+((end.y-start.y)*.5-35)+'px)',opacity:.8,offset:.5},{transform:'translate('+(end.x-start.x)+'px,'+(end.y-start.y)+'px) scale(.7)',opacity:0}],{duration:1100,easing:'ease-in-out'});animation?.finished.finally(()=>{dot.remove();sparkle(id)});
  }));
 }
 function sync(){
  const records=visible(),ids=new Set(records.map(w=>String(w.id))),added=known?records.filter(w=>!known.has(String(w.id))):[],was=known;known=ids;
  slots=(was?slots:getSlots()).filter(id=>ids.has(String(id))).map(String).slice(0,12);
  for(const wish of added){if(slots.includes(String(wish.id)))continue;if(slots.length===12)slots.shift();slots.push(String(wish.id))}
  for(const wish of records.slice().reverse()){if(slots.length>=12)break;if(!slots.includes(String(wish.id)))slots.push(String(wish.id))}
  saveSlots(slots);
  const markup=slots.map((id,i)=>{const wish=records.find(w=>String(w.id)===id);return '<span class="branch-star" style="--star-size:'+([.85,1,.9,.8,1.05,.88][i%6])+';--delay:-'+(i*.43)+'s"><button data-star="'+esc(id)+'" class="wish-real-star '+(wish.done?'fulfilled':'')+'" aria-label="'+esc(wish.title)+'"><i class="wish-light-core" aria-hidden="true"></i></button></span>'}).join('');
  if(layer.dataset.markup!==markup){layer.dataset.markup=markup;layer.innerHTML=markup}
  if(layoutState)layout(layoutState.left,layoutState.top,layoutState.width,layoutState.height);relayout();
  if(book.open)render();added.forEach(w=>flight(w.id));
 }

 function open(id){onOpen();returnFocus=document.activeElement;year='';month='';selected=id?String(id):null;view='detail';editing=null;more=false;confirming=false;if(!book.open)book.showModal();render();const completed=visible().find(w=>w.done&&String(w.id)===String(id));if(completed){const ball=[...book.querySelectorAll('.wish-paper-ball')].find(node=>node.dataset.wishId===String(id));if(ball)unfoldWish(completed,ball)}fx(stage,[{opacity:0,translate:'0 18px',scale:1},{opacity:1,translate:'0 0',scale:1}],{duration:650,easing:'ease-out'})}
 function setUnfoldedLayer(active){
  book.classList.toggle('has-unfolded-wish',active);
  book.querySelectorAll('.wishbook-stage,.wishbook-close,.wish-paper-ball').forEach(node=>{node.inert=active});
 }
 function close(){setUnfoldedLayer(false);book.querySelector('.wish-unfolded-page')?.remove();book.querySelector('.wish-ball-preview')?.remove();book.querySelectorAll('.wish-paper-ball').forEach(ball=>ball.style.visibility='');shellPageOpen=false;book.close();onClose();returnFocus?.isConnected&&returnFocus.focus({preventScroll:true})}
 function detail(w){return w?'<span class="wishbook-date">'+esc(w.date)+'</span><h3>'+esc(w.title)+'</h3><div class="wish-body">'+esc(w.detail||'把这一份期待，交给未来的自己。')+'</div><p class="wishbook-state">'+(w.done?'✧ 已实现 · 星光为你记得':'等待花开 · 心愿正在生长')+'</p>':'<h3>给未来，写一份期待</h3><p>从一颗小小的心愿开始。</p>'}
 function render(){
 if(turning)return;
 const inDirectory=view==='index';
 book.classList.toggle('showing-wish-index',inDirectory);
 const closeButton=book.querySelector('.wishbook-close');
 closeButton.textContent=inDirectory?'返回书本 ↶':'合上书页 ×';
 closeButton.setAttribute('aria-label',inDirectory?'返回书本':'合上书页');
 if(inDirectory){
  book.classList.remove('editing-wish');
  const entries=visible().filter(w=>(!directoryYear||dateParts(w).year===directoryYear)&&(!directoryMonth||dateParts(w).month===directoryMonth));
  const perPage=6, perSpread=perPage*2;
  const total=Math.max(1,Math.ceil(entries.length/perSpread));
  directorySpread=Math.min(directorySpread,total-1);
  const first=directorySpread*perSpread;
  const page=(offset,label)=>{
   const rows=entries.slice(first+offset,first+offset+perPage);
   return '<section class="wish-index-page"><h3>'+label+'</h3>'+
    (rows.length?'<ol>'+rows.map(w=>'<li><button type="button" data-wish-read="'+esc(w.id)+'" title="'+esc(w.title)+'"><span class="index-star '+(w.done?'is-done':'')+'" aria-label="'+(w.done?'已实现':'等待实现')+'">'+(w.done?'★':'☆')+'</span><span class="index-title">'+esc(w.title)+'</span><span class="index-leader" aria-hidden="true"></span><time>'+esc(w.date)+'</time></button></li>').join('')+'</ol>':offset===0?'<p>这一页还没有心愿。</p>':'')+
    '<small class="index-page-number">'+(directorySpread*2+offset/perPage+1)+'</small></section>';
  };
  $('wishbookPages').innerHTML=page(0,'心愿目录')+page(perPage,'星光续页')+
   '<button type="button" class="index-flower index-flower-prev" data-index-turn="-1" aria-label="目录上一页" title="上一页" '+(directorySpread===0?'disabled':'')+'></button>'+
   '<button type="button" class="index-flower index-flower-next" data-index-turn="1" aria-label="目录下一页" title="下一页" '+(directorySpread>=total-1?'disabled':'')+'></button>';
  book.querySelector('.bookmarks').innerHTML='<button data-filter="year">'+(directoryYear?esc(directoryYear)+'年':'年份')+'</button><button data-filter="month">'+(directoryMonth?Number(directoryMonth)+'月':'月份')+'</button>';
  $('wishbookPrev').hidden=true;
  $('wishbookNext').hidden=true;
  book.querySelector('.wish-ball-preview')?.remove();
  requestAnimationFrame(fitBook);
  return;
 }
 const records=pending(),years=[...new Set(records.map(w=>dateParts(w).year))];if(year&&!years.includes(year)){year='';month=''}
 const list=filtered();if(!list.some(w=>String(w.id)===selected))selected=list[0]?String(list[0].id):null;
 const index=list.findIndex(w=>String(w.id)===selected),wish=list[index];more=more&&!!wish;
 book.classList.toggle('editing-wish',view==='edit');
 const start=Math.floor(Math.max(index,0)/4)*4;
 $('wishbookPages').innerHTML='<aside class="wish-directory wish-dedication"><span class="paper-eyebrow">DEAR FUTURE ME</span><h3>把小小心愿<br>交给未来的自己</h3><p class="directory-guide">有些期待，会慢慢开花。<br>有些星光，会一直陪着你。</p>'+(isOwner()?control('add','许下新愿望','id="wishbookWrite"'):'')+'</aside><article class="wishbook-detail">'+(view==='edit'?'':detail(wish))+'<div class="paper-actions">'+(isOwner()&&wish&&view!=='edit'?control('edit','编辑心愿','data-wish-edit="'+esc(wish.id)+'"')+control('toggle',wish.done?'标记未完成':'标记已完成','data-wish-toggle="'+esc(wish.id)+'"')+control('more','更多操作','data-wish-more aria-expanded="'+more+'"'):'')+'</div>'+(more?'<div class="paper-more">'+(confirming?'<p>确定让这个心愿离开书页？</p><button data-wish-confirm>确认删除</button><button data-wish-keep>保留</button>':'<button data-wish-delete>删除这个心愿</button>')+'</div>':'')+'</article>';
 $('wishbookPrev').hidden=view==='edit'||index<=0;$('wishbookNext').hidden=view==='edit'||index<0||index>=list.length-1;
 book.querySelector('.bookmarks').innerHTML='<button data-wish-index aria-pressed="'+(view==='index')+'">'+(view==='index'?'返回心愿':'所有心愿')+'</button><button data-filter="year" title="按年份浏览">'+(year?esc(year)+'年':'年份')+'</button><button data-filter="month" title="按月份浏览">'+(month?Number(month)+'月':'月份')+'</button>';
 const completed=view==='edit'?[]:visible().filter(w=>w.done);
 const completedIds=new Set(completed.map(w=>String(w.id)));
 book.querySelectorAll('.wish-paper-ball').forEach(ball=>{
  if(!completedIds.has(ball.dataset.wishId))ball.remove();
 });
 if(view==='edit'){
  book.querySelector('.wish-ball-preview')?.remove();
  renderForm();
 }
 completed.forEach(makePaperBall);
 requestAnimationFrame(fitBook);
 }
 const paperPositionKey='birthday:wishPaperPositions';
 const paperPositions=new Map();
 try{
  for(const [id,position] of JSON.parse(localStorage.getItem(paperPositionKey)||'[]')){
   if(position&&[position.x,position.bottom,position.angle].every(Number.isFinite))paperPositions.set(id,position);
  }
 }catch{}
 function paperLanding(w){
  const key=String(w.id);
  if(!paperPositions.has(key)){
   let x=12+Math.random()*74;
   for(let n=0;n<20&&[...paperPositions.values()].some(p=>Math.abs(p.x-x)<6);n++)x=12+Math.random()*74;
   paperPositions.set(key,{x,bottom:3+Math.random()*14,angle:Math.random()*50-25});
   try{localStorage.setItem(paperPositionKey,JSON.stringify([...paperPositions]))}catch{}
  }
  return paperPositions.get(key);
 }
 function makePaperBall(w){const shell=book.querySelector('.wishbook-shell');if([...shell.querySelectorAll('.wish-paper-ball')].some(n=>n.dataset.wishId===String(w.id)))return;const ball=document.createElement('button');ball.type='button';ball.className='wish-paper-ball';ball.dataset.wishId=String(w.id);ball.setAttribute('aria-label','展开已实现的心愿：'+w.title);ball.title=w.title+'\n'+(w.detail||'');const landing=paperLanding(w);ball.style.left=landing.x+'%';ball.style.bottom=landing.bottom+'px';ball.style.rotate=landing.angle+'deg';const variant=[...String(w.id)].reduce((n,c)=>n+c.charCodeAt(0),0)%4;ball.dataset.paperShape=String(variant);ball.style.setProperty('--paper-size',(46+variant*2)+'px');ball.onpointerenter=ball.onfocus=()=>{let tip=shell.querySelector('.wish-ball-preview');if(!tip){tip=document.createElement('div');tip.className='wish-ball-preview';tip.setAttribute('role','tooltip');shell.append(tip)}tip.innerHTML='<b>'+esc(w.title)+'</b><p>'+esc(w.detail||'这份心愿已实现。')+'</p>';tip.style.left=ball.style.left;};ball.onpointerleave=ball.onblur=()=>shell.querySelector('.wish-ball-preview')?.remove();ball.onclick=()=>unfoldWish(w,ball);shell.append(ball);return ball}
 async function unfoldWish(w,ball){if(shellPageOpen)return;shellPageOpen=true;book.querySelector('.wish-ball-preview')?.remove();const shell=book.querySelector('.wishbook-shell'),page=document.createElement('article');page.className='wish-unfolded-page';page.innerHTML='<button class="wish-refold" aria-label="揉回纸团">收好这一页 ↶</button><div class="wish-recovered-content">'+detail(all().find(x=>String(x.id)===String(w.id))||w)+'</div><div class="wish-paper-creases" aria-hidden="true"></div>';shell.append(page);setUnfoldedLayer(true);ball.style.visibility='hidden';const pr=page.getBoundingClientRect(),br=ball.getBoundingClientRect(),dx=br.left+br.width/2-pr.left-pr.width/2,dy=br.top+br.height/2-pr.top-pr.height/2;await page.animate([{opacity:.4,transform:`translate(${dx}px,${dy}px) rotate(25deg) scale(.06)`},{opacity:1,transform:'perspective(900px) rotateX(18deg) rotateY(-15deg) rotate(-2deg) scale(.78,.88)',offset:.7},{opacity:1,transform:'rotate(0) scale(1)'}],{duration:reduce()?1:850,easing:'ease-out'}).finished.catch(()=>{});page.querySelector('button').focus({preventScroll:true});page.querySelector('button').onclick=async()=>{page.querySelector('button').disabled=true;await page.animate([{transform:'scale(1)',opacity:1},{transform:'perspective(900px) rotateX(20deg) rotateY(-18deg) scale(.7,.85)',opacity:.9,offset:.45},{transform:`translate(${dx}px,${dy}px) rotate(25deg) scale(.06)`,opacity:.2}],{duration:reduce()?1:650,easing:'ease-in'}).finished.catch(()=>{});page.remove();setUnfoldedLayer(false);ball.style.visibility='';shellPageOpen=false;fx(ball,[{opacity:0,scale:.7},{opacity:1,scale:1.08},{opacity:1,scale:1}],{duration:260,easing:'ease-out'});ball.focus({preventScroll:true})};}
 let shellPageOpen=false;
 async function tearCompleted(w){
  if(turning)return;turning=true;const frozenWidth=stage.style.getPropertyValue('--book-w'),frozenHeight=stage.style.getPropertyValue('--book-h');commit(all().map(x=>String(x.id)===String(w.id)?{...x,done:true}:x));const page=book.querySelector('.wishbook-detail'),bookArt=$('wishbookPages'),ar=bookArt.getBoundingClientRect(),r={left:ar.left+ar.width*.498,top:ar.top+ar.height*.05,width:ar.width*.4035,height:ar.height*.8115,bottom:ar.top+ar.height*.8615},shell=book.querySelector('.wishbook-shell'),sr=shell.getBoundingClientRect();const sheet=document.createElement('div');sheet.className='wish-torn-sheet';sheet.setAttribute('aria-hidden','true');sheet.innerHTML='<div class="wish-recovered-content">'+detail(w)+'</div><div class="wish-paper-creases" aria-hidden="true"></div>';Object.assign(sheet.style,{left:(r.left-sr.left)+'px',top:(r.top-sr.top)+'px',width:r.width+'px',height:r.height+'px'});shell.append(sheet);page.style.visibility='hidden';
  const landing=paperLanding(w),landingX=landing.x/100,landingBottom=landing.bottom;const dx=sr.width*landingX-(r.left-sr.left)-r.width/2,dy=sr.height-landingBottom-15-(r.top-sr.top)-r.height/2;
  try{if(!reduce()){await sheet.animate([{transform:'rotateY(0) rotate(0)',clipPath:'polygon(0 0,100% 0,100% 100%,0 100%)'},{transform:'perspective(800px) rotateY(-18deg) rotate(4deg) translate(12px,-8px)',clipPath:'polygon(3% 0,100% 0,100% 100%,0 100%,2% 90%,0 80%,3% 70%,0 60%,2% 50%,0 40%,3% 30%,0 20%,2% 10%)'}],{duration:600,easing:'ease-in-out',fill:'forwards'}).finished;await sheet.animate([{transform:'translate(12px,-8px) rotate(4deg) scale(1)',borderRadius:'0',filter:'drop-shadow(0 10px 8px #51473044)'},{transform:`translate(${dx*.55}px,${dy*.4}px) rotate(-14deg) scale(.55,.72) skew(7deg,4deg)`,borderRadius:'20%',offset:.45},{transform:`translate(${dx}px,${dy}px) rotate(28deg) scale(.065,.055)`,borderRadius:'45%',filter:'drop-shadow(0 25px 12px #51473066)'}],{duration:1400,easing:'cubic-bezier(.25,.1,.4,1)',fill:'forwards'}).finished;}
  const ball=makePaperBall({...w,done:true});if(ball)ball.animate([{transform:'translateY(-12px) rotate(-25deg)'},{transform:'translateY(0) rotate(8deg)'}],{duration:reduce()?1:450});
  commit(all().map(x=>String(x.id)===String(w.id)?{...x,done:true}:x));$('wishbookStatus').textContent='这一页心愿已实现，星光为你珍藏。';
  }finally{sheet.remove();page.style.visibility='';turning=false;sync();stage.style.setProperty('--book-w',frozenWidth);stage.style.setProperty('--book-h',frozenHeight);sparkle(w.id,true)}
 }
 function renderForm(){if(!isOwner())return;const w=all().find(w=>String(w.id)===editing),area=book.querySelector('.wishbook-detail');
 area.innerHTML='<form id="wishbookForm"'+(editing===null?' class="new-wish-paper"':'')+'><span class="paper-eyebrow">'+(w?'重新写下期待':'一页新的期待')+'</span><input aria-label="许愿日期" name="date" type="date" required value="'+esc(w?.date||new Date().toLocaleDateString('sv-SE'))+'"><textarea aria-label="心愿标题" name="title" placeholder="我的小小心愿……" required maxlength="160" rows="2">'+esc(w?.title||'')+'</textarea><textarea aria-label="心愿正文" name="detail" placeholder="想把哪些话，留给未来的自己？" rows="4">'+esc(w?.detail||'')+'</textarea><label class="paper-public"><input name="public" type="checkbox" '+(w?.public?'checked':'')+'>允许朋友阅读</label><div class="paper-actions"><button class="paper-tool seal-save" title="保存心愿" aria-label="保存心愿" type="submit">✦</button>'+control('cancel','取消书写','data-wish-cancel')+'</div></form>';
 $('wishbookForm').onsubmit=e=>{e.preventDefault();if(!isOwner())return;const d=new FormData(e.currentTarget),title=String(d.get('title')).trim();if(!title)return;const record={...w,id:w?.id||crypto.randomUUID(),title,date:String(d.get('date')),detail:String(d.get('detail')).trim(),done:w?.done??false,public:d.has('public')};try{view='detail';selected=String(record.id);year='';month='';commit([...all().filter(x=>String(x.id)!==selected),record]);sync();render();$('wishbookStatus').textContent='心愿已珍藏在书页里。';fx(book.querySelector('.wishbook-detail'),[{filter:'brightness(1)'},{filter:'brightness(1.12)'},{filter:'brightness(1)'}],{duration:700})}catch(err){$('wishbookStatus').textContent='没有保存成功，请重试。'}};
 }
 function edit(id){if(!book.open)open(id);if(!isOwner()||turning)return;editing=id?String(id):null;view='edit';more=false;render()}
 async function turn(delta){if(view==='index'){directorySpread+=delta;render();return}const list=filtered(),index=list.findIndex(w=>String(w.id)===selected),next=list[index+delta];if(turning||!next||view==='edit')return;turning=true;book.classList.add('turning');const page=book.querySelector('.wishbook-detail');const out=fx(page,[{opacity:1},{opacity:0,translate:'0 -5px'}],{duration:reduce()?0:160,easing:'ease-in'});if(out)await out.finished.catch(()=>{});selected=String(next.id);turning=false;more=false;render();book.classList.remove('turning');fx(book.querySelector('.wishbook-detail'),[{opacity:0,translate:'0 6px',filter:'brightness(1.12)'},{opacity:1,translate:'0 0',filter:'brightness(1)'}],{duration:reduce()?0:380,easing:'ease-out'})}
 book.querySelector('.wishbook-close').onclick=()=>{if(view==='index'){view='detail';render()}else close()};book.addEventListener('cancel',e=>{e.preventDefault();const flower=book.querySelector('.wish-unfolded-page .wish-refold');if(flower)flower.click();else close()});$('wishbookPrev').onclick=()=>turn(-1);$('wishbookNext').onclick=()=>turn(1);
 book.addEventListener('click',e=>{if(turning)return;const b=e.target.closest('button');if(!b)return;
 if(b.dataset.indexTurn){const direction=b.dataset.indexTurn;turn(Number(direction));const next=book.querySelector('[data-index-turn="'+direction+'"]:not(:disabled)')||book.querySelector('.index-flower:not(:disabled)');next?.focus({preventScroll:true});return}
 if(b.id==='wishbookWrite'){edit();return}if(b.hasAttribute('data-wish-index')){view=view==='index'?'detail':'index';directorySpread=0;directoryYear='';directoryMonth='';more=false;render();return}if(b.dataset.wishRead){const wish=visible().find(w=>String(w.id)===b.dataset.wishRead);if(!wish)return;view='detail';year='';month='';selected=b.dataset.wishRead;more=false;render();if(wish.done){const ball=[...book.querySelectorAll('.wish-paper-ball')].find(node=>node.dataset.wishId===b.dataset.wishRead);if(ball)unfoldWish(wish,ball)}return}if(b.hasAttribute('data-wish-edit')){edit(selected);return}if(b.hasAttribute('data-wish-cancel')){view='detail';render();return}
 if(b.hasAttribute('data-wish-toggle')&&isOwner()){const w=all().find(w=>String(w.id)===selected);if(w&&!w.done){tearCompleted(w);return}commit(all().map(x=>String(x.id)===selected?{...x,done:!x.done}:x));sync();sparkle(selected,!w.done);return}
 if(b.hasAttribute('data-wish-more')){more=!more;confirming=false;render();return}if(b.hasAttribute('data-wish-delete')){confirming=true;render();return}if(b.hasAttribute('data-wish-keep')){more=false;render();return}if(b.hasAttribute('data-wish-confirm')&&isOwner()){const id=selected;more=false;selected=null;commit(all().filter(w=>String(w.id)!==id));sync();return}
 if(b.dataset.filter){const type=b.dataset.filter,existing=book.querySelector('.bookmark-choices');if(existing){existing.remove();return}const choices=view==='index'?visible():pending(), activeYear=view==='index'?directoryYear:year;const vals=type==='year'?[...new Set(choices.map(w=>dateParts(w).year))]:[...new Set(choices.filter(w=>!activeYear||dateParts(w).year===activeYear).map(w=>dateParts(w).month).filter(Boolean))];const pop=document.createElement('div');pop.className='bookmark-choices';pop.innerHTML='<button data-period="" data-kind="'+type+'">全部'+(type==='year'?'年份':'月份')+'</button>'+vals.map(v=>'<button data-period="'+esc(v)+'" data-kind="'+type+'">'+(type==='year'?yearLabel(v):Number(v)+'月')+'</button>').join('');book.querySelector('.bookmarks').append(pop);return}
 if(b.hasAttribute('data-period')){if(view==='index'){if(b.dataset.kind==='year'){directoryYear=b.dataset.period;directoryMonth=''}else directoryMonth=b.dataset.period;directorySpread=0;render();return}if(b.dataset.kind==='year'){year=b.dataset.period;month=''}else month=b.dataset.period;selected=null;render()}
 });
 trunk.onclick=()=>open();layer.onclick=e=>{const button=e.target.closest('[data-star]');if(button){sparkle(button.dataset.star);open(button.dataset.star)}};
 return {sync,open,edit,close,layout,isOpen:()=>book.open};
}
