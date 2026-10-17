import {randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {fail} from './http';
const scrypt=promisify(scryptCallback);
export async function passwordHash(password:unknown){if(typeof password!=='string'||password.length<12||password.length>128)fail('رمز عبور باید بین ۱۲ تا ۱۲۸ کاراکتر باشد');const salt=randomBytes(16).toString('hex');const key=await scrypt(password as string,salt,64) as Buffer;return salt+':'+key.toString('hex')}
export async function verify(password:unknown,value:string){const [salt,hex]=value.split(':');const valid=typeof password==='string'&&password.length<=128;const key=await scrypt(valid?password:'invalid',salt,64) as Buffer;return valid&&timingSafeEqual(key,Buffer.from(hex,'hex'))}
