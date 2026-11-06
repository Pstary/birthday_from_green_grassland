import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
const db = new DatabaseSync(new URL('./birthday.sqlite', import.meta.url).pathname.replace(/^\/(?=[A-Z]:)/i,'').split('/').map(decodeURIComponent).join('/'));
db.exec('CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY, kind TEXT, name TEXT, caption TEXT, media BLOB, mime TEXT, created TEXT)');
if(!db.prepare('PRAGMA table_info(posts)').all().some(column=>column.name==='sender')){
 db.exec('ALTER TABLE posts ADD COLUMN sender TEXT');
}
db.exec('CREATE INDEX IF NOT EXISTS posts_sender_kind ON posts(sender,kind)');
const ownerPassword=process.env.BIRTHDAY_OWNER_PASSWORD ||
 (await readFile(new URL('./owner-password.txt',import.meta.url),'utf8').catch(error=>{
  if(error.code!=='ENOENT')throw error;
  return '';
 })).trim();
const digest=value=>createHash('sha256').update(value).digest();
const ownerSessions=new Map();
const ownerLifetime=8*60*60*1000;
const loginAttempts=new Map();
const token=()=>randomBytes(32).toString('hex');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpeg':'image/jpeg','.jpg':'image/jpeg','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
createServer(async (req,res)=>{
 const send=(status,type,body)=>{res.writeHead(status,{'Content-Type':type,'X-Content-Type-Options':'nosniff'});res.end(body)};
 const json=(status,data)=>send(status,'application/json',JSON.stringify(data));
 const path=new URL(req.url,'http://localhost').pathname;
 try {
  const privateRoute=path.startsWith('/api/')||path.startsWith('/media/');
  if(privateRoute)res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='GET' && req.headers.origin && new URL(req.headers.origin).host!==req.headers.host)
   return json(403,{error:'不允许跨站操作'});
  const cookies=Object.fromEntries((req.headers.cookie||'').split(';').map(pair=>pair.trim().split('=',2)));
  const secure=process.env.BIRTHDAY_SECURE_COOKIES==='1'||req.socket.encrypted;
  function setCookie(name,value,age){
   const cookie=name+'='+value+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+age+(secure?'; Secure':'');
   res.appendHeader('Set-Cookie',cookie);
  }
  let sender=/^[a-f0-9]{64}$/.test(cookies.birthday_friend||'')?cookies.birthday_friend:null;
  if(privateRoute&&!sender){
   sender=token();
   setCookie('birthday_friend',sender,60*60*24*365);
  }
  const now=Date.now();
  for(const [id,expires] of ownerSessions)if(expires<=now)ownerSessions.delete(id);
  const owner=ownerSessions.has(cookies.birthday_owner);
  if(path==='/api/session'&&req.method==='GET')return json(200,{owner});
  if(path==='/api/session'&&req.method==='DELETE'){
   ownerSessions.delete(cookies.birthday_owner);
   setCookie('birthday_owner','',0);
   return json(200,{owner:false});
  }
  if(path==='/api/session'&&req.method==='POST'){
   if(!ownerPassword)return json(503,{error:'寿星口令尚未配置'});
   const address=req.socket.remoteAddress;
   for(const [ip,attempt] of loginAttempts)if(attempt.until<=now)loginAttempts.delete(ip);
   const attempt=loginAttempts.get(address)||{count:0,until:now+60000};
   if(attempt.count>=8)return json(429,{error:'尝试次数过多，请稍后再试'});
   let body='';
   for await(const chunk of req){
    body+=chunk;
    if(body.length>4096)return json(413,{error:'请求过大'});
   }
   const {password}=JSON.parse(body);
   if(typeof password!=='string'||!timingSafeEqual(digest(password),digest(ownerPassword))){
    attempt.count++;
    loginAttempts.set(address,attempt);
    return json(401,{error:'寿星口令不正确'});
   }
   loginAttempts.delete(address);
   ownerSessions.delete(cookies.birthday_owner);
   const session=token();
   ownerSessions.set(session,now+ownerLifetime);
   setCookie('birthday_owner',session,ownerLifetime/1000);
   return json(200,{owner:true});
  }
  const voiceDelete=/^\/api\/voice\/(\d+)$/.exec(path);
  if(voiceDelete&&req.method==='DELETE'){const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)return json(403,{error:'不允许跨站删除'});const result=db.prepare("DELETE FROM posts WHERE id=? AND kind='voice' AND (? OR sender=?)").run(Number(voiceDelete[1]),Number(owner),sender);return json(result.changes?200:404,result.changes?{ok:true}:{error:'录音不存在'});}
  const kind=/^\/api\/(voice|photo|letter)$/.exec(path)?.[1];
  if(kind && req.method==='GET') return json(200,db.prepare('SELECT id,name,caption,created,mime FROM posts WHERE kind=? AND (? OR sender=?) ORDER BY id DESC').all(kind,Number(owner),sender));
  if(kind && req.method==='POST'){
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>16e6)return json(413,{error:'文件太大'});chunks.push(chunk)}
   const {name,caption,media,mime}=JSON.parse(Buffer.concat(chunks));
   if((kind==='photo' && !/^image\/(jpeg|png|webp|gif)$/.test(mime)) || (kind==='voice' && !/^audio\/(webm|mp4|ogg|wav)(;.*)?$/.test(mime)) || (kind!=='letter' && !media) || (kind==='letter' && !String(caption??'').trim())) return json(400,{error:'请检查留言或文件格式'});
   db.prepare('INSERT INTO posts(kind,name,caption,media,mime,created,sender) VALUES(?,?,?,?,?,?,?)').run(kind,String(name??'').trim().slice(0,40)||'匿名朋友',String(caption??'').slice(0,1200),kind==='letter'?null:Buffer.from(media,'base64'),kind==='letter'?null:mime,new Date().toISOString(),sender);
   return json(201,{ok:true});
  }
  const id=/^\/media\/(\d+)$/.exec(path)?.[1];
  if(id){const row=db.prepare('SELECT media,mime FROM posts WHERE id=? AND (? OR sender=?)').get(Number(id),Number(owner),sender);if(row?.media)return send(200,row.mime,row.media)}
  const file=path==='/'?'index.html':path.slice(1);
  const type=types[file.slice(file.lastIndexOf('.'))];
  if(req.method==='GET' && type && /^(assets\/)?[\w.-]+$/.test(file))return send(200,type,await readFile(new URL('./public/'+file,import.meta.url)));
  json(404,{error:'找不到内容'});
 }catch(err){json(err.code==='ENOENT'?404:400,{error:'请求失败，请稍后再试'});}
}).listen(Number(process.env.PORT)||4173,process.env.HOST||'127.0.0.1',()=>console.log('Birthday server ready'));
