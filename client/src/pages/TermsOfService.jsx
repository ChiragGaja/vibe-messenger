import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, ScrollText } from 'lucide-react';

const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
};

export default function TermsOfService() {
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
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                        <ScrollText className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Terms of Service</h1>
                        <p className="text-sm text-zinc-400 mt-1">Last updated: March 18, 2026</p>
                    </div>
                </div>

                <div className="prose prose-zinc max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">1. Acceptance of Terms</h2>
                        <p className="text-zinc-600 leading-relaxed">
                            By creating an account or using Vibe ("the Service"), you agree to be bound by these Terms of 
                            Service. If you do not agree to these terms, please do not use the Service. We reserve the right 
                            to update these terms at any time, and your continued use constitutes acceptance of any changes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">2. Eligibility</h2>
                        <p className="text-zinc-600 leading-relaxed">
                            You must be at least 13 years of age to use Vibe. By using the Service, you represent and 
                            warrant that you meet this age requirement. If you are under 18, you should have parental 
                            or guardian consent to use the platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">3. Your Account</h2>
                        <ul className="list-disc pl-6 text-zinc-600 space-y-2">
                            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                            <li>You must provide accurate and complete information during registration, including a valid email address for verification.</li>
                            <li>You are solely responsible for all activities that occur under your account.</li>
                            <li>You must notify us immediately of any unauthorized use of your account.</li>
                            <li>Usernames must be 3-20 characters, alphanumeric with underscores only, and must not impersonate others or contain offensive content.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">4. Acceptable Use Policy</h2>
                        <p className="text-zinc-600 leading-relaxed mb-3">
                            You agree not to use Vibe to:
                        </p>
                        <ul className="list-disc pl-6 text-zinc-600 space-y-2">
                            <li>Send spam, unsolicited messages, or bulk communications</li>
                            <li>Harass, bully, threaten, or intimidate other users</li>
                            <li>Share illegal, harmful, or explicit content including but not limited to hate speech, violence, or sexually explicit material</li>
                            <li>Impersonate another person or entity</li>
                            <li>Attempt to gain unauthorized access to other accounts or systems</li>
                            <li>Upload malware, viruses, or any other harmful code</li>
                            <li>Use automated systems (bots, scrapers) to access the Service without permission</li>
                            <li>Circumvent rate limits, security measures, or access restrictions</li>
                            <li>Violate any applicable law or regulation</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">5. Content & Intellectual Property</h2>
                        <ul className="list-disc pl-6 text-zinc-600 space-y-2">
                            <li><strong>Your Content:</strong> You retain ownership of the messages, images, videos, and other content you share on Vibe. By using the Service, you grant us a limited license to store, process, and deliver your content as necessary to operate the platform.</li>
                            <li><strong>Our Content:</strong> The Vibe name, logo, design, and underlying technology are owned by us. You may not copy, modify, or distribute any part of our Service without permission.</li>
                            <li><strong>Media Uploads:</strong> Files you upload are stored on secure third-party servers (Cloudinary). You are responsible for ensuring you have the right to share any content you upload.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">6. Groups & Interactions</h2>
                        <ul className="list-disc pl-6 text-zinc-600 space-y-2">
                            <li>Group administrators are responsible for moderating their group's content and members.</li>
                            <li>We reserve the right to remove groups or content that violates these Terms.</li>
                            <li>Friend requests can be sent to any user; however, persistent unwanted contact may be considered harassment.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">7. Account Suspension & Termination</h2>
                        <p className="text-zinc-600 leading-relaxed mb-3">We may suspend or terminate your account if you:</p>
                        <ul className="list-disc pl-6 text-zinc-600 space-y-2">
                            <li>Violate these Terms of Service or the Acceptable Use Policy</li>
                            <li>Engage in activities that harm other users or the platform's integrity</li>
                            <li>Exceed rate limits repeatedly or attempt to abuse the system</li>
                        </ul>
                        <p className="text-zinc-600 leading-relaxed mt-3">
                            Your account will be automatically locked after multiple failed login attempts as a security measure. 
                            You may delete your account at any time through your profile settings, which will permanently remove 
                            all your data.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">8. Service Availability</h2>
                        <p className="text-zinc-600 leading-relaxed">
                            We strive to keep Vibe available 24/7, but we do not guarantee uninterrupted access. The Service 
                            may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control. 
                            We are not liable for any loss or inconvenience caused by downtime.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">9. Limitation of Liability</h2>
                        <p className="text-zinc-600 leading-relaxed">
                            Vibe is provided "as is" and "as available" without warranties of any kind, either express or implied. 
                            To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, 
                            consequential, or punitive damages, including but not limited to loss of data, loss of profits, or 
                            business interruption, arising from your use of the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">10. Indemnification</h2>
                        <p className="text-zinc-600 leading-relaxed">
                            You agree to indemnify and hold harmless Vibe and its team from any claims, damages, losses, 
                            or expenses arising from your use of the Service, your violation of these Terms, or your 
                            infringement of any third-party rights.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">11. Changes to Terms</h2>
                        <p className="text-zinc-600 leading-relaxed">
                            We reserve the right to modify these Terms at any time. Material changes will be communicated by 
                            updating the "Last updated" date at the top of this page. Your continued use of Vibe after changes 
                            are posted constitutes your acceptance of the revised Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3 text-zinc-900">12. Contact</h2>
                        <p className="text-zinc-600 leading-relaxed">
                            If you have any questions or concerns about these Terms of Service, please reach out to the 
                            Vibe team through the platform or via the email address associated with your account.
                        </p>
                    </section>
                </div>
            </motion.main>

            {/* Footer */}
            <footer className="py-8 border-t border-zinc-200 bg-[#f8f8f8]">
                <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="text-2xl font-black tracking-tight text-zinc-900">Vibe</span>
                    <div className="flex items-center gap-6 text-xs text-zinc-400">
                        <span className="font-medium text-zinc-500">Terms of Service</span>
                        <span className="text-zinc-300">|</span>
                        <Link to="/privacy" className="hover:text-zinc-600 transition-colors">Privacy Policy</Link>
                    </div>
                    <p className="text-xs text-zinc-400">© 2026 Vibe Messenger</p>
                </div>
            </footer>
        </div>
    );
}
