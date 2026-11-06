export function dateParts(record){
 const m=String(record?.date||'').match(/^(\d{4})\D(\d{1,2})\D(\d{1,2})/);
 if(!m)return {year:'undated',month:'',day:0,key:Number.MAX_SAFE_INTEGER};
 const year=Number(m[1]),month=Number(m[2]),day=Number(m[3]);
 return {year:String(year),month:String(month).padStart(2,'0'),day,key:year*10000+month*100+day};
}
export function orderedRecords(records){return records.filter(r=>r&&r.id&&typeof r.title==='string').slice().sort((a,b)=>dateParts(a).key-dateParts(b).key||String(a.id).localeCompare(String(b.id)))}
export function yearLabel(year){return year==='undated'?'未标注年份':year+'年'}
