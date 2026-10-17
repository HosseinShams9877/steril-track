import assert from 'node:assert/strict';
import {toISO,monthDays,samePersianMonth,jalali} from '../src/lib/persian-date';
assert.equal(toISO(1403,1,1),'2024-03-20');assert.equal(toISO(1404,1,1),'2025-03-21');assert.equal(toISO(1403,12,30),'2025-03-20');assert.equal(monthDays(1404,12).length,29);assert.throws(()=>toISO(1404,12,30));
for(const year of [1403,1404,1405])for(let month=1;month<=12;month++){const d=monthDays(year,month);for(const day of [d[0],d.at(-1)!])assert.deepEqual(jalali(day.iso),{year,month,day:day.day})}
assert(samePersianMonth('2026-10-01T00:00:00Z',new Date('2026-10-12T00:00:00Z')));console.log('PASS Jalali calendar and 36 month boundaries.');
