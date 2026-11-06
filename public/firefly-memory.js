import {dateParts,orderedRecords,yearLabel} from './record-dates.js';
export function mountMemoryFireflies({actor,isOwner,getRecords,commit,onOpen,onClose,escapeHtml,reduceMotion}){
 const esc=escapeHtml;
 let page=0,selected=null,view='browse',editing=null,phase='closed',returnTimer,focusBefore,signature='',animations=[];
 let perPage=matchMedia('(max-width:650px)').matches?5:7;
 let yearFilter='',monthFilter='',knownIds=null,editReturn=null;
 const mobile=()=>matchMedia('(max-width:650px)').matches;
 const album=()=>visible().length>10;
 const pageSize=()=>album()?(mobile()?6:8):(mobile()?5:7);
 const filtered=()=>visible().filter(r=>(!yearFilter||dateParts(r).year===yearFilter)&&(!monthFilter||dateParts(r).month===monthFilter));
 const portal=document.createElement('dialog');portal.id='memoryFireflies';portal.setAttribute('aria-label','魔法回忆萤火虫瓶');
 portal.innerHTML='<div class="firefly-world"><div class="firefly-heading"><span>THE LIGHT OF OUR MEMORIES</span><h2>把好时光，酿成光</h2><p id="fireflySubtitle"></p></div><button class="firefly-close" aria-label="收起回忆，返回花园">收回瓶中 ×</button><div class="firefly-arc" id="fireflyArc" aria-label="回忆时间轴"></div><section id="fireflyReading" class="firefly-reading" aria-live="polite"></section><nav class="firefly-tools" aria-label="回忆分组"><button id="fireflyPrev">上一组</button><span id="fireflyPage"></span><button id="fireflyNext">下一组</button><button id="fireflyAdd">留存新的回忆</button></nav><p id="fireflyStatus" class="firefly-status" role="status"></p></div>';
 document.body.append(portal);portal.querySelector('.firefly-heading').insertAdjacentHTML('afterend','<div id="memoryFilters" class="memory-filters"></div>');portal.querySelector('#fireflyReading').insertAdjacentHTML('afterend','<nav id="memoryNodeNav" class="memory-node-nav" aria-label="按日期阅读"></nav>');const find=id=>portal.querySelector('#'+id);
 const jar=document.createElement('span');jar.className='memory-jar-lights';jar.setAttribute('aria-hidden','true');actor.querySelector('.actor').append(jar);
 const cork=document.createElement('img');cork.className='memory-cork';cork.src='/assets/strong-memory-cork.svg';cork.alt='';actor.querySelector('.actor').append(cork);
 const all=()=>orderedRecords(getRecords());
 const visible=()=>all().filter(r=>isOwner()||r.public===true);
 const hash=id=>[...String(id)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,17);
 function animate(element,frames,options){if(!reduceMotion()){const a=element.animate(frames,options);animations.push(a);const release=()=>{animations=animations.filter(item=>item!==a)};a.finished.then(release,release);return a}}
 const counter=document.createElement('span');counter.className='memory-jar-count';actor.append(counter);
 function sync(){
  const records=visible(),ids=new Set(records.map(r=>r.id));
  const added=knownIds&&records.some(r=>!knownIds.has(r.id));knownIds=ids;
  jar.innerHTML=Array.from({length:Math.min(14,records.length)},(_,i)=>'<i style="left:'+(10+i*31%78)+'%;top:'+(12+i*23%67)+'%;--delay:-'+(i%9*.37)+'s"></i>').join('');
  counter.textContent='';counter.hidden=true;
  actor.querySelector('.actor').setAttribute('aria-label','沸羊羊 · 打开年度回忆星河，'+counter.textContent);
  if(added){animate(jar,[{filter:'brightness(1)'},{filter:'brightness(1.8) drop-shadow(0 0 6px #ffe7a3)'},{filter:'brightness(1)'}],{duration:900});const spark=document.createElement('i');spark.className='arrival-firefly';jar.append(spark);animate(spark,[{transform:'translate(20px,-42px)',opacity:0},{transform:'translate(0,0)',opacity:1}],{duration:800,easing:'ease-out'});setTimeout(()=>spark.remove(),850)}
  if(portal.open&&phase!=='closing')render();
 }
 function origin(){const r=jar.getBoundingClientRect();portal.style.setProperty('--jar-x',(r.left+r.width/2)+'px');portal.style.setProperty('--jar-y',(r.top+r.height/2)+'px')}
 function open(){
  if(phase==='closing')return;if(portal.open)return;
  onOpen();focusBefore=document.activeElement;page=0;selected=null;yearFilter='';monthFilter='';view='browse';phase='open';signature=signature||'initialized';sync();origin();portal.showModal();actor.classList.add('jar-open');render();
  requestAnimationFrame(()=>{find('fireflyArc').querySelectorAll('[data-firefly]').forEach(f=>{const r=f.getBoundingClientRect(),j=jar.getBoundingClientRect();animate(f,[{transform:'translate('+(j.left+j.width/2-r.left-r.width/2)+'px,'+(j.top+j.height/2-r.top-r.height/2)+'px) scale(.12)',opacity:0},{transform:'translate(0,0) scale(1)',opacity:1}],{duration:reduceMotion()?0:900,delay:Number(f.dataset.order)*65,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'})})});
 }
 function close(){
  if(!portal.open||phase==='closing')return;phase='closing';portal.classList.add('returning');animations.forEach(a=>a.cancel());animations=[];
  const target=jar.getBoundingClientRect();
  portal.querySelectorAll('[data-firefly]').forEach((f,i)=>{const r=f.getBoundingClientRect();animate(f,[{transform:'translate(0,0)',opacity:1},{transform:'translate('+(target.left+target.width/2-r.left-r.width/2)+'px,'+(target.top+target.height/2-r.top-r.height/2)+'px) scale(.1)',opacity:0}],{duration:600,delay:i*28,easing:'ease-in',fill:'forwards'})});
  returnTimer=setTimeout(()=>{portal.close();portal.classList.remove('returning');actor.classList.remove('jar-open');phase='closed';animations.forEach(a=>a.cancel());animations=[];onClose();if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true})},reduceMotion()?0:830);
 }
 function selectRecord(id){
  const item=visible().find(r=>r.id===id);if(!item)return;
  selected=id;view='browse';if(album()){yearFilter=dateParts(item).year;monthFilter=''}
  page=Math.floor(filtered().findIndex(r=>r.id===id)/pageSize());render();
 }
 function render(){
  const records=visible(),isAlbum=records.length>10,years=[...new Set(records.map(r=>dateParts(r).year))];
  portal.classList.toggle('is-album',isAlbum);portal.classList.toggle('is-editing',view==='edit');
  if(yearFilter&&!years.includes(yearFilter)){yearFilter='';monthFilter='';page=0;selected=null}
  const months=[...new Set(records.filter(r=>!yearFilter||dateParts(r).year===yearFilter).map(r=>dateParts(r).month).filter(Boolean))];
  if(monthFilter&&!months.includes(monthFilter))monthFilter='';
  const indexMode=isAlbum&&!yearFilter&&view!=='edit';
  const list=filtered(),size=indexMode?8:pageSize(),source=indexMode?years:list;
  const pages=Math.max(1,Math.ceil(source.length/size));page=Math.min(Math.max(0,page),pages-1);
  const current=source.slice(page*size,(page+1)*size);
  if(!list.some(r=>r.id===selected))selected=indexMode?null:current[0]?.id||null;
  if(!indexMode&&view!=='edit'&&selected&&!current.some(r=>r.id===selected))selected=current[0]?.id||null;
  find('fireflySubtitle').textContent=records.length?(isAlbum?'沿着年份走进星河，重温每一段好时光。':'沿着星光，从较早的一天慢慢读到后来。'):(isOwner()?'瓶子还空着，第一段回忆会成为第一束光。':'这里还没有可以公开阅读的回忆。');
  find('memoryFilters').hidden=!isAlbum;
  find('memoryFilters').innerHTML=isAlbum?'<label>年份<select id="memoryYear"><option value="">选择一个年份</option>'+years.map(y=>'<option value="'+esc(y)+'" '+(y===yearFilter?'selected':'')+'>'+yearLabel(y)+'</option>').join('')+'</select></label>'+(yearFilter?'<label>月份<select id="memoryMonth"><option value="">这一年的全部月份</option>'+months.map(m=>'<option value="'+m+'" '+(m===monthFilter?'selected':'')+'>'+Number(m)+'月</option>').join('')+'</select></label><button id="memoryAllYears">返回年份</button>':''):'';
  if(indexMode){
   find('fireflyArc').innerHTML='<div class="memory-years">'+current.map(y=>'<button data-memory-year="'+esc(y)+'"><span class="year-orbit" aria-hidden="true"></span><b>'+yearLabel(y)+'</b><small>'+records.filter(r=>dateParts(r).year===y).length+' 段回忆</small></button>').join('')+'</div>';
  }else if(isAlbum){
   let previous='';find('fireflyArc').innerHTML='<div class="galaxy-album">'+current.map(r=>{const m=dateParts(r).month,label=m?Number(m)+'月':'未标注月份',heading=label!==previous?'<h3>'+label+'</h3>':'';previous=label;return heading+'<button data-firefly="'+esc(r.id)+'" class="album-memory '+(r.id===selected?'selected':'')+'" aria-pressed="'+(r.id===selected)+'"><i aria-hidden="true"></i><time>'+esc(r.date)+'</time><b>'+esc(r.title)+'</b>'+(r.photo?'<span>附照片</span>':'')+'</button>'}).join('')+'</div>';
  }else{
   find('fireflyArc').innerHTML='<svg viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true"><path d="M60 150 Q500 -80 940 150"/></svg>'+current.map((r,i)=>{const t=current.length===1?.5:i/(current.length-1),x=7+t*86,y=70-45*Math.sin(t*Math.PI);return '<button type="button" class="memory-firefly '+(r.id===selected?'selected':'')+'" data-firefly="'+esc(r.id)+'" data-order="'+i+'" style="--x:'+x+'%;--y:'+y+'%;--delay:-'+i*.39+'s" aria-label="'+esc(r.date+' '+r.title)+'" aria-pressed="'+(r.id===selected)+'"><i class="firefly-body"></i><span>'+esc(r.date)+'<b>'+esc(r.title)+'</b></span></button>'}).join('');
  }
  find('fireflyReading').hidden=indexMode;
  find('fireflyPrev').hidden=pages<=1;find('fireflyNext').hidden=pages<=1;find('fireflyPrev').disabled=page===0;find('fireflyNext').disabled=page===pages-1;
  find('fireflyPage').textContent=records.length?(page+1)+' / '+pages+(yearFilter?' · '+yearLabel(yearFilter):''):'没有回忆';find('fireflyAdd').hidden=!isOwner();
  const position=list.findIndex(r=>r.id===selected);
  find('memoryNodeNav').hidden=indexMode||view==='edit'||position<0;
  find('memoryNodeNav').innerHTML='<button id="memoryPreviousNode" '+(position<=0?'disabled':'')+'>← 上一段</button><span>从较早到较晚</span><button id="memoryNextNode" '+(position>=list.length-1?'disabled':'')+'>下一段 →</button>';
  if(view==='edit'){find('fireflyReading').hidden=false;renderEditor()}else if(!indexMode)renderReading();
 }
 function renderReading(){
  const item=visible().find(r=>r.id===selected),section=find('fireflyReading');
  if(!item){section.innerHTML='<div class="memory-empty"><span class="memory-quill" aria-hidden="true">✧</span><h3>留住那些微小的美好</h3><p>'+(isOwner()?'不必多么盛大。一次相见、一段旅途，都值得被温柔收藏。':'未公开的回忆只对寿星可见。')+'</p></div>';return}
  section.innerHTML='<article class="firefly-story"><div class="memory-story-copy"><span class="memory-date">'+esc(item.date)+'</span><h3>'+esc(item.title)+'</h3><p>'+esc(item.detail||'这束光，记住了这一天。')+'</p></div>'+(item.photo?'<figure><img src="'+esc(item.photo)+'" alt="'+esc(item.title)+'"></figure>':'')+'</article>'+(isOwner()?'<div class="memory-owner-tools"><small>'+(item.public?'朋友可见':'仅寿星可见')+'</small><button data-edit="'+esc(item.id)+'">编辑回忆</button><button data-delete="'+esc(item.id)+'">删除</button></div>':'');
 }
 function renderEditor(){
  if(!isOwner()){view='browse';renderReading();return}
  const item=all().find(r=>r.id===editing);
  find('fireflyReading').innerHTML='<form id="fireflyForm" class="firefly-form"><h3>'+(item?'修订这一束光':'留下一段回忆')+'</h3><div class="memory-form-row"><label>这一天<input name="date" type="date" required value="'+esc(item?.date||new Date().toLocaleDateString('sv-SE'))+'"></label><label>回忆标题<input name="title" required maxlength="160" value="'+esc(item?.title||'')+'"></label></div><label>想记住的事情<textarea name="detail" maxlength="1200" rows="3">'+esc(item?.detail||'')+'</textarea></label><label>照片（可选，800 KB以内）<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label>'+(item?.photo?'<label class="memory-check"><input name="removePhoto" type="checkbox">移除现有照片</label>':'')+'<label class="memory-check"><input name="public" type="checkbox" '+(item?.public?'checked':'')+'>允许朋友模式查看这段回忆</label><small>回忆仍保存在这台设备。未勾选的内容仅寿星可见。</small><div class="memory-form-actions"><button class="memory-save" type="submit">'+(item?'保存修改':'留存回忆')+'</button><button type="button" data-cancel-edit>返回回忆</button></div></form>';
  find('fireflyForm').onsubmit=async e=>{
   e.preventDefault();if(!isOwner())return;const form=e.currentTarget,data=new FormData(form),title=String(data.get('title')).trim();if(!title)return;
   const button=form.querySelector('[type=submit]');button.disabled=true;
   try{
    let photo=data.has('removePhoto')?undefined:item?.photo;const file=data.get('photo');
    if(file?.size){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>800000)throw Error('请选择800 KB以内的 JPG、PNG 或 WebP 照片。');photo=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)})}
    if(!portal.open||!form.isConnected||!isOwner())return;
    const record={...item,id:item?.id||crypto.randomUUID(),title,date:String(data.get('date')),detail:String(data.get('detail')),done:item?.done??false,public:data.has('public'),photo};
    const records=all().filter(r=>r.id!==record.id);records.push(record);selected=record.id;view='browse';editing=null;
    const back=editReturn;commit(records);sync();if(!item&&back){yearFilter=back.year;monthFilter=back.month;page=back.page;selected=back.selected;view='browse';render()}else selectRecord(record.id);editReturn=null;
    find('fireflyStatus').textContent=item?'这段回忆已经更新。':'一只新的萤火虫，住进了沸羊羊的瓶子。';
    const dot=jar.firstElementChild;if(dot)animate(dot,[{transform:'translate(15px,-45px) scale(2)',opacity:0},{transform:'translate(0,0) scale(1)',opacity:1}],{duration:950,easing:'ease-out'});
   }catch(error){find('fireflyStatus').textContent=error.name==='QuotaExceededError'?'设备存储空间不足，请缩小照片后再试。':error.message;button.disabled=false}
  };
 }
 function manage(id,mode){open();if(!isOwner())return;if(view!=='edit')editReturn={year:yearFilter,month:monthFilter,page,selected};view='edit';editing=id||null;render()}
 portal.querySelector('.firefly-close').onclick=close;portal.addEventListener('cancel',e=>{e.preventDefault();close()});
 portal.addEventListener('click',e=>{
  const year=e.target.closest('[data-memory-year]');if(year){yearFilter=year.dataset.memoryYear;monthFilter='';page=0;selected=null;view='browse';render();return}
  if(e.target.closest('#memoryAllYears')){yearFilter='';monthFilter='';page=0;selected=null;render();return}
  const step=e.target.closest('#memoryPreviousNode,#memoryNextNode');if(step&&!step.disabled){const list=filtered(),index=list.findIndex(r=>r.id===selected),next=list[index+(step.id==='memoryNextNode'?1:-1)];if(next){selected=next.id;page=Math.floor(list.indexOf(next)/pageSize());view='browse';render()}return}
  const fly=e.target.closest('[data-firefly]');if(fly){selected=fly.dataset.firefly;view='browse';render();return}
  const edit=e.target.closest('[data-edit]');if(edit){editing=edit.dataset.edit;view='edit';render();return}
  if(e.target.closest('[data-cancel-edit]')){view='browse';editing=null;render();return}
  const del=e.target.closest('[data-delete]');if(del&&isOwner()){
   find('fireflyReading').querySelector('.memory-owner-tools').innerHTML='<span>让这段回忆离开瓶子？</span><button data-confirm-delete="'+esc(del.dataset.delete)+'">确认删除</button><button data-cancel-delete>保留</button>';return
  }
  const confirm=e.target.closest('[data-confirm-delete]');if(confirm&&isOwner()){const id=confirm.dataset.confirmDelete;commit(all().filter(r=>r.id!==id));find('fireflyStatus').textContent='这一束光已轻轻散去。';return}
  if(e.target.closest('[data-cancel-delete]'))renderReading();
 });
 find('fireflyPrev').onclick=()=>{page--;selected=null;view='browse';render()};find('fireflyNext').onclick=()=>{page++;selected=null;view='browse';render()};find('fireflyAdd').onclick=()=>manage(null,'edit');
 portal.addEventListener('change',e=>{if(e.target.id==='memoryYear'){yearFilter=e.target.value;monthFilter='';page=0;selected=null;view='browse';render()}if(e.target.id==='memoryMonth'){monthFilter=e.target.value;page=0;selected=null;view='browse';render()}});
 const resize=()=>{const size=matchMedia('(max-width:650px)').matches?5:7;if(size!==perPage){perPage=size;page=0;selected=null;if(portal.open)render()}if(portal.open)origin()};window.addEventListener('resize',resize);
 return {open,close,sync,manage,isOpen:()=>portal.open};
}
