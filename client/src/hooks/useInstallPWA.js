import { useState, useEffect } from 'react';

/**
 * Custom hook to handle PWA installation.
 * Listens for the 'beforeinstallprompt' event and provides an install function.
 */
export default function useInstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if app is already running in standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                          || window.navigator.standalone 
                          || document.referrer.includes('android-app://');
        
        if (isStandalone) {
            setIsInstalled(true);
        }

        const handleBeforeInstallPrompt = (e) => {
            // Prevent the default browser-provided "add to home screen" prompt
            e.preventDefault();
            // Stash the event so it can be triggered later
            setDeferredPrompt(e);
            setIsInstallable(true);
            console.log('📱 PWA: App is installable.');
        };

        const handleAppInstalled = () => {
            // Clear the deferredPrompt so it can be garbage collected
            setDeferredPrompt(null);
            setIsInstallable(false);
            setIsInstalled(true);
            console.log('✅ PWA: App installed successfully.');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const install = async () => {
        if (!deferredPrompt) return false;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`👤 PWA: User response to install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, so clear it
        setDeferredPrompt(null);
        setIsInstallable(false);

        return outcome === 'accepted';
    };

    return { isInstallable, isInstalled, install };
}
