import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { 
    MessageSquare, 
    Video, 
    Mic, 
    Shield, 
    ArrowRight, 
    Users, 
    Smartphone, 
    Zap,
    MessageCircle
} from 'lucide-react';
import useChatStore from '../store/chatStore';

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

const stagger = {
    visible: { transition: { staggerChildren: 0.1 } }
};

export default function Landing() {
    const navigate = useNavigate();
    const token = useChatStore((s) => s.token);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const features = [
        {
            icon: <Video className="w-6 h-6 text-indigo-500" />,
            title: "HD Video Calling",
            desc: "Crystal clear video and audio calls with zero lag, built on top-tier WebRTC technology."
        },
        {
            icon: <Mic className="w-6 h-6 text-rose-500" />,
            title: "Voice Messages",
            desc: "Express yourself better. Record and send high-fidelity voice notes with a single tap."
        },
        {
            icon: <Shield className="w-6 h-6 text-emerald-500" />,
            title: "Private & Secure",
            desc: "Your data is yours. We use advanced encryption to keep your conversations private."
        },
        {
            icon: <Users className="w-6 h-6 text-amber-500" />,
            title: "Group Vibration",
            desc: "Create groups for your team, family, or friends and stay connected in real-time."
        }
    ];

    return (
        <div className="min-h-screen bg-[#fafafa] text-[#09090b] selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
            {/* Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${scrolled ? 'bg-[#f8f8f8]/90 backdrop-blur-xl border-zinc-200 py-3' : 'bg-[#f8f8f8] border-transparent py-5'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center">
                        <span className="text-3xl font-black tracking-tight text-zinc-900">Vibe</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-sm font-medium hover:text-zinc-500 transition-colors hidden sm:block text-zinc-600">Log in</Link>
                        <button 
                            onClick={() => navigate(token ? '/chat' : '/register')}
                            className="bg-zinc-950 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
                        >
                            {token ? 'Open Chat' : 'Get Started'}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="min-h-screen flex items-center justify-center pt-20 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-dot-pattern opacity-[0.4] -z-10" />
                
                {/* Elegant Background Orbs */}
                <div className="bg-orb bg-indigo-300 w-[600px] h-[600px] -top-40 -left-40 opacity-40" />
                <div className="bg-orb bg-purple-300 w-[500px] h-[500px] top-1/4 -right-20 [animation-delay:-7s] opacity-30" />
                <div className="bg-orb bg-sky-300 w-[400px] h-[400px] bottom-0 left-1/4 [animation-delay:-12s] opacity-20" />

                <div className="max-w-5xl mx-auto text-center w-full">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={stagger}
                    >
                        <motion.h1 
                            variants={fadeInUp}
                            className="text-5xl md:text-7xl font-bold tracking-tight mb-8 text-gradient"
                        >
                            Connect with <br className="hidden md:block" /> your vibe.
                        </motion.h1>
                        
                        <motion.p 
                            variants={fadeInUp}
                            className="text-lg md:text-2xl text-zinc-500 max-w-2xl mx-auto mb-12 leading-relaxed font-light"
                        >
                            A lighting-fast, beautifully designed chat platform for modern communication. No clutter, just conversation.
                        </motion.p>
                        
                        <motion.div 
                            variants={fadeInUp}
                            className="flex flex-col sm:flex-row items-center justify-center gap-4"
                        >
                            <button 
                                onClick={() => navigate('/register')}
                                className="w-full sm:w-auto px-10 py-5 bg-zinc-950 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 flex items-center justify-center gap-2 group text-lg"
                            >
                                Start using Vibe <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-32 bg-white relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20 text-balance">
                        <h3 className="text-4xl md:text-5xl font-bold tracking-tight">Everything you need, <br /> none of the noise.</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="bento-card p-8 rounded-3xl"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-[#fafafa] flex items-center justify-center mb-6">
                                    {feature.icon}
                                </div>
                                <h4 className="text-xl font-bold mb-3">{feature.title}</h4>
                                <p className="text-zinc-500 text-sm leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-zinc-200 bg-[#f8f8f8]">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center opacity-100">
                        <span className="text-3xl font-black tracking-tight text-zinc-900">Vibe</span>
                    </div>
                    <p className="text-xs text-zinc-400 font-medium tracking-tight">© 2026 Vibe Messenger. All privileges reserved.</p>
                </div>
            </footer>
        </div>
    );
}
