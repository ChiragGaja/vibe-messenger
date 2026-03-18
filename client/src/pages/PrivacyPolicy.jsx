import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
};

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-[#fafafa] text-[#09090b]">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f8f8f8]/90 backdrop-blur-xl border-b border-zinc-200 py-3">
                <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors">
                        <ArrowLeft size={18} />
                        <span className="text-sm font-medium">Back to Vibe</span>
                    </Link>
                    <span className="text-3xl font-black tracking-tight text-zinc-900">Vibe</span>
                </div>
            </nav>

            {/* Content */}
            <motion.main 
                className="max-w-4xl mx-auto px-6 pt-28 pb-20"
                initial="hidden"
                animate="visible"
                variants={fadeIn}
            >
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Privacy Policy</h1>
                        <p className="text-sm text-zinc-400 mt-1">Last updated: March 18, 2026</p>
                    </div>
                </div>

                <div className="prose prose-zinc max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">1. Introduction</h2>
                        <p className="text-zinc-600 leading-relaxed">
                            Welcome to Vibe ("we," "our," or "us"). We are committed to protecting your privacy and ensuring 
                            the security of your personal information. This Privacy Policy explains how we collect, use, disclose, 
                            and safeguard your information when you use our messaging platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">2. Information We Collect</h2>
                        <h3 className="text-lg font-semibold mb-2 text-zinc-800">Account Information</h3>
                        <ul className="list-disc pl-6 text-zinc-600 space-y-1">
                            <li><strong>Username:</strong> Your chosen display name for identification on the platform.</li>
                            <li><strong>Email Address:</strong> Used for account verification, password recovery, and important service notifications.</li>
                            <li><strong>Password:</strong> Stored as a one-way cryptographic hash (bcrypt with 12 salt rounds). We never store or have access to your plain-text password.</li>
                            <li><strong>Profile Information:</strong> Optional display name, bio, custom status, and profile picture you choose to provide.</li>
                        </ul>

                        <h3 className="text-lg font-semibold mb-2 mt-4 text-zinc-800">Communication Data</h3>
                        <ul className="list-disc pl-6 text-zinc-600 space-y-1">
                            <li><strong>Messages:</strong> Text messages, voice messages, and media files you send through the platform.</li>
                            <li><strong>Media Uploads:</strong> Images, videos, audio files, and documents shared in conversations. These are stored on Cloudinary's secure cloud infrastructure.</li>
                            <li><strong>Status Updates:</strong> Temporary media posts that automatically expire after 24 hours.</li>
                        </ul>

                        <h3 className="text-lg font-semibold mb-2 mt-4 text-zinc-800">Usage Data</h3>
                        <ul className="list-disc pl-6 text-zinc-600 space-y-1">
                            <li><strong>Online Status:</strong> We track your last-seen timestamp to show availability to your friends.</li>
                            <li><strong>Message Delivery Status:</strong> Read receipts and delivery confirmations for messages.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">3. How We Use Your Information</h2>
                        <ul className="list-disc pl-6 text-zinc-600 space-y-1">
                            <li>To create and manage your account</li>
                            <li>To facilitate real-time messaging and communication between users</li>
                            <li>To send OTP verification codes via email for account security</li>
                            <li>To deliver push notifications for new messages and friend requests</li>
                            <li>To enable features like group chats, friend management, and status sharing</li>
                            <li>To protect against fraud, abuse, and unauthorized access</li>
                            <li>To improve and maintain the platform's performance and reliability</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">4. Data Storage & Security</h2>
                        <p className="text-zinc-600 leading-relaxed">
                            Your data is stored on secure servers using industry-standard practices:
                        </p>
                        <ul className="list-disc pl-6 text-zinc-600 space-y-1 mt-2">
                            <li><strong>Database:</strong> Account data and messages are stored in a PostgreSQL database with SSL encryption in transit.</li>
                            <li><strong>Media Files:</strong> Images, videos, and documents are stored on Cloudinary's globally distributed CDN with secure access.</li>
                            <li><strong>Passwords:</strong> All passwords are hashed using bcrypt with 12 salt rounds before storage.</li>
                            <li><strong>Authentication:</strong> We use JSON Web Tokens (JWT) for session management, transmitted securely via HTTPS.</li>
                            <li><strong>Rate Limiting:</strong> We implement rate limiting to prevent brute-force attacks on login and registration endpoints.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">5. Third-Party Services</h2>
                        <p className="text-zinc-600 leading-relaxed">We use the following third-party services:</p>
                        <ul className="list-disc pl-6 text-zinc-600 space-y-1 mt-2">
                            <li><strong>Cloudinary:</strong> For media file storage and delivery (images, videos, documents).</li>
                            <li><strong>Nodemailer (SMTP):</strong> For sending verification and password reset emails.</li>
                            <li><strong>Neon PostgreSQL:</strong> For secure cloud database hosting.</li>
                        </ul>
                        <p className="text-zinc-600 leading-relaxed mt-2">
                            Each of these services has their own privacy policies governing their handling of your data.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">6. Data Retention</h2>
                        <ul className="list-disc pl-6 text-zinc-600 space-y-1">
                            <li><strong>Messages:</strong> Stored indefinitely until you delete them or delete your account.</li>
                            <li><strong>Status Updates:</strong> Automatically deleted after 24 hours, including associated media from Cloudinary.</li>
                            <li><strong>Account Data:</strong> Retained as long as your account is active. Upon account deletion, all associated data is permanently removed.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">7. Your Rights</h2>
                        <p className="text-zinc-600 leading-relaxed">You have the right to:</p>
                        <ul className="list-disc pl-6 text-zinc-600 space-y-1 mt-2">
                            <li>Access your personal information through your profile settings</li>
                            <li>Update or correct your account information at any time</li>
                            <li>Delete individual messages or your entire account</li>
                            <li>Request a copy of your data by contacting us</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">8. Children's Privacy</h2>
                        <p className="text-zinc-600 leading-relaxed">
                            Vibe is not intended for children under 13 years of age. We do not knowingly collect personal 
                            information from children under 13. If you believe a child has provided us with personal 
                            information, please contact us so we can promptly remove it.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">9. Changes to This Policy</h2>
                        <p className="text-zinc-600 leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify you of any material changes 
                            by posting the new policy on this page and updating the "Last updated" date. Your continued use 
                            of Vibe after changes constitutes acceptance of the updated policy.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">10. Contact Us</h2>
                        <p className="text-zinc-600 leading-relaxed">
                            If you have any questions about this Privacy Policy, please reach out to the Vibe team 
                            through the platform or via the email address associated with your account.
                        </p>
                    </section>
                </div>
            </motion.main>

            {/* Footer */}
            <footer className="py-8 border-t border-zinc-200 bg-[#f8f8f8]">
                <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="text-2xl font-black tracking-tight text-zinc-900">Vibe</span>
                    <div className="flex items-center gap-6 text-xs text-zinc-400">
                        <Link to="/terms" className="hover:text-zinc-600 transition-colors">Terms of Service</Link>
                        <span className="text-zinc-300">|</span>
                        <span className="font-medium text-zinc-500">Privacy Policy</span>
                    </div>
                    <p className="text-xs text-zinc-400">© 2026 Vibe Messenger</p>
                </div>
            </footer>
        </div>
    );
}
