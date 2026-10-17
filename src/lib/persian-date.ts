export const months=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const formatter=new Intl.DateTimeFormat('en-US-u-ca-persian',{year:'numeric',month:'numeric',day:'numeric',timeZone:'Asia/Tehran'});
export function jalali(value:string|Date=new Date()){const p=formatter.formatToParts(typeof value==='string'?new Date(value.length===10?value+'T12:00:00Z':value):value);return {year:Number(p.find(x=>x.type==='year')!.value),month:Number(p.find(x=>x.type==='month')!.value),day:Number(p.find(x=>x.type==='day')!.value)}}
export function toISO(year:number,month:number,day:number){const start=Date.UTC(year+621,2,1,12);for(let i=0;i<400;i++){const d=new Date(start+i*86400000),j=jalali(d);if(j.year===year&&j.month===month&&j.day===day)return d.toISOString().slice(0,10)}throw Error('تاریخ شمسی نامعتبر است')}
export function monthDays(year:number,month:number){const first=toISO(year,month,1);const start=new Date(first+'T12:00:00Z');return Array.from({length:31},(_,i)=>new Date(start.getTime()+i*86400000)).filter(d=>jalali(d).month===month).map(d=>({iso:d.toISOString().slice(0,10),...jalali(d)}))}
export function samePersianMonth(value:string,now=new Date()){const a=jalali(value),b=jalali(now);return a.year===b.year&&a.month===b.month}
export function faDate(value:string){if(!value)return '';const j=jalali(value);return `${j.day.toLocaleString('fa-IR')} ${months[j.month-1]} ${j.year.toLocaleString('fa-IR',{useGrouping:false})}`}

export function todayISO(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
