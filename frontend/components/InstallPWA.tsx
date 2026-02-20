import React, { useState, useEffect } from 'react';

const InstallPWA: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);

            // Show the install button if the app is not already installed
            // We check local storage to avoid bugging the user too often if they dismissed it
            const dismissedAt = localStorage.getItem('pwa-prompt-dismissed');
            const now = new Date().getTime();

            if (!dismissedAt || (now - parseInt(dismissedAt)) > 24 * 60 * 60 * 1000) {
                setIsVisible(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        // Show the prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa-prompt-dismissed', new Date().getTime().toString());
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[100] animate-in slide-in-from-bottom-10 duration-700">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-5">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-blue-500/20 shrink-0">
                    📈
                </div>
                <div className="flex-1">
                    <h3 className="font-black text-slate-900 dark:text-white leading-tight">Install FinSys</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Add to home screen for the best experience.</p>
                </div>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleInstall}
                        className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                    >
                        Install
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all font-black text-[8px]"
                    >
                        Later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPWA;
