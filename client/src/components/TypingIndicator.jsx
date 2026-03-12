import { motion } from 'framer-motion';

export default function TypingIndicator() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10, transformOrigin: 'bottom left' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 self-start max-w-[65%] px-4 py-3 rounded-2xl rounded-bl-sm bg-surface border border-border shadow-sm mb-2"
        >
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-text-muted/60"
                    animate={{
                        y: ['0%', '-60%', '0%'],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.15,
                    }}
                />
            ))}
        </motion.div>
    );
}
