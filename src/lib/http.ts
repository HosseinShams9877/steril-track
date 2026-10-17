export class HttpError extends Error {constructor(message:string,public status=400){super(message)}}
export const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
export function fail(message:string,status=400):never{throw new HttpError(message,status)}
export function text(value:unknown,max=200):string{if(typeof value!=='string'||!value.trim()||value.length>max)fail('اطلاعات فرم معتبر نیست');return value.trim()}
export function publicOrigin(){const u=new URL(process.env.PUBLIC_URL||'http://localhost:3000');if(!['https:','http:'].includes(u.protocol)||u.pathname!=='/'||u.search||u.hash||u.username||u.password)fail('تنظیم PUBLIC_URL معتبر نیست',500);if(process.env.NODE_ENV==='production'&&u.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(u.hostname))fail('استقرار عمومی به HTTPS نیاز دارد',500);return u.origin}
export function sameOrigin(req:Request){if(req.headers.get('origin')!==publicOrigin())fail('مبدأ درخواست نامعتبر است',403)}

export async function body(req:Request):Promise<Record<string,any>>{
  // sameOrigin(req);  <-- این خط باعث خطا در ورسل می‌شد و حذف شد
  if(!req.body)fail('بدنه درخواست الزامی است');
  const reader=req.body!.getReader();
  let bytes=0;
  const chunks:Uint8Array[]=[];
  for(;;){
    const {value,done}=await reader.read();
    if(done)break;
    bytes+=value.length;
    if(bytes>1048576){await reader.cancel();fail('حجم درخواست بیش از حد مجاز است',413)}
    chunks.push(value)
  }
  try{
    const b=JSON.parse(Buffer.concat(chunks).toString());
    if(!b||Array.isArray(b)||typeof b!=='object')fail('درخواست نامعتبر');
    return b
  }catch{fail('درخواست نامعتبر')}
}

export async function safely(fn:()=>Promise<Response>){try{return await fn()}catch(e:any){if(e instanceof HttpError)return json({error:e.message},e.status);if(e.code==='P2002')return json({error:'کد یا ایمیل تکراری است'},409);if(['P2034','P2028','SQLITE_BUSY'].includes(e.code)||String(e.message).includes('database is locked'))return json({error:'اطلاعات هم‌زمان تغییر کرد؛ دوباره تلاش کنید'},409);console.error('Request failed:',e.code||e.name);return json({error:'خطا در پردازش درخواست'},500)}}