import { Outlet } from 'react-router-dom';
import NavRail from './NavRail';
import SidePanel from './SidePanel';
import Footer from './Footer';
import { useLanguage } from '../../context/LanguageContext';

export default function AppShell({ children }: { children?: React.ReactNode }) { // Allow children or Outlet
    const { language, setLanguage, t } = useLanguage();

    const toggleLanguage = () => {
        setLanguage(language === 'sv' ? 'en' : 'sv');
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-white">
            {/* 
        Three-Pane Layout:
        1. NavRail (Fixed 72px)
        2. SidePanel (Fixed 256px / 64 tailwind spacing)
        3. Main Content (Flex-1)
      */}
            <NavRail />
            <SidePanel />

            {/* Main Content Stage */}
            <main className="flex-1 flex flex-col min-w-0 bg-white relative overflow-hidden">
                {/* Global Privacy/Language Header */}
                <div className="h-8 bg-slate-50 border-b border-slate-200 flex items-center justify-end px-4 gap-4 text-xs text-slate-500">
                    <button
                        onClick={toggleLanguage}
                        className="hover:text-slate-800 transition-colors uppercase font-medium"
                    >
                        {language === 'sv' ? 'English' : 'Svenska'}
                    </button>
                    <div className="w-px h-3 bg-slate-300"></div>
                    <a href="#" className="hover:text-slate-800 transition-colors" title={t('privacy.header')}>{t('privacy.header')}</a>
                    <a href="#" className="hover:text-slate-800 transition-colors" title={t('privacy.terms')}>{t('privacy.terms')}</a>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col">
                    <div className="flex-1">
                        <div className="max-w-5xl mx-auto px-4 py-6">
                            {children || <Outlet />}
                        </div>
                    </div>
                    <Footer />
                </div>
            </main>
        </div>
    );
}
