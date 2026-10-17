import 'dotenv/config';
import {mkdirSync,openSync,closeSync} from 'node:fs';
import path from 'node:path';
import {defineConfig} from 'prisma/config';
import {databaseUrl} from './src/lib/database-url';
const url=databaseUrl();
mkdirSync(path.dirname(url.slice(5)),{recursive:true});
closeSync(openSync(url.slice(5),'a',0o600));
export default defineConfig({schema:'prisma/schema.prisma',migrations:{path:'prisma/migrations',seed:'tsx prisma/seed/index.ts'},datasource:{url}});
