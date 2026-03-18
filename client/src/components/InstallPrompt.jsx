import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import useInstallPWA from '../hooks/useInstallPWA';
import { useState, useEffect } from 'react';

export default function InstallPrompt() {
    const { isInstallable, isInstalled, install } = useInstallPWA();
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Show the prompt after a short delay if it's installable and not yet installed
        if (isInstallable && !isInstalled) {
            const timer = setTimeout(() => setShow(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [isInstallable, isInstalled]);

    if (!show || isInstalled) return null;

    const handleInstall = async () => {
        const success = await install();
        if (success) setShow(false);
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-96 z-[100]"
                >
                    <div className="bg-white rounded-3xl p-5 shadow-2xl shadow-indigo-100 border border-indigo-50 flex items-start gap-4 ring-1 ring-black/5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex-shrink-0 flex items-center justify-center">
                            <Smartphone className="w-6 h-6 text-indigo-500" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h4 className="text-zinc-900 font-bold text-base leading-tight">Install Vibe App</h4>
                            <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
                                Add Vibe to your home screen for a faster, full-screen experience and instant access.
                            </p>
                            
                            <div className="flex items-center gap-3 mt-4">
                                <button
                                    onClick={handleInstall}
                                    className="flex-1 bg-zinc-950 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Download size={14} /> Install
                                </button>
                                <button
                                    onClick={() => setShow(false)}
                                    className="px-4 py-2.5 text-zinc-400 hover:text-zinc-600 text-xs font-medium transition-colors"
                                >
                                    Later
                                </button>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShow(false)}
                            className="text-zinc-300 hover:text-zinc-500 transition-colors p-1"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
