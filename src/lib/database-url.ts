import path from 'node:path';
export function databaseUrl(){const value=process.env.DATABASE_URL||'file:./data/steril-track.sqlite';if(!value.startsWith('file:'))throw Error('This schema uses SQLite. DATABASE_URL must begin with file:');return 'file:'+path.resolve(process.cwd(),value.slice(5)).replaceAll('\\','/')}
