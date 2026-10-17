import type {Metadata} from 'next';
import Providers from './providers';
import './globals.css';
export const metadata:Metadata={title:'استریل‌ترک | مدیریت تجهیزات جراحی',description:'سامانه چندبیمارستانی تجهیزات و استریلیزاسیون'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="fa" dir="rtl"><body><Providers>{children}</Providers></body></html>}
