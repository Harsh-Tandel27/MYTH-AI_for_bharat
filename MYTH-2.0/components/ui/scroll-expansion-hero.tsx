'use client';

import {
    useEffect,
    useRef,
    useState,
    ReactNode,
} from 'react';
import { LiquidMetal, liquidMetalPresets } from '@paper-design/shaders-react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface ScrollExpandHeroProps {
    children?: ReactNode;
}

const ScrollExpandHero = ({
    children,
}: ScrollExpandHeroProps) => {
    const [scrollProgress, setScrollProgress] = useState<number>(0);
    const [showContent, setShowContent] = useState<boolean>(false);
    const [mediaFullyExpanded, setMediaFullyExpanded] = useState<boolean>(false);
    const [touchStartY, setTouchStartY] = useState<number>(0);

    const sectionRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleWheel = (e: globalThis.WheelEvent) => {
            if (mediaFullyExpanded && e.deltaY < 0 && window.scrollY <= 5) {
                setMediaFullyExpanded(false);
                e.preventDefault();
            } else if (!mediaFullyExpanded) {
                e.preventDefault();
                const scrollDelta = e.deltaY * 0.001;
                const newProgress = Math.min(Math.max(scrollProgress + scrollDelta, 0), 1);
                setScrollProgress(newProgress);
                if (newProgress >= 1) {
                    setMediaFullyExpanded(true);
                    setShowContent(true);
                } else if (newProgress < 0.75) {
                    setShowContent(false);
                }
            }
        };

        const handleTouchStart = (e: globalThis.TouchEvent) => {
            setTouchStartY(e.touches[0].clientY);
        };

        const handleTouchMove = (e: globalThis.TouchEvent) => {
            if (!touchStartY) return;
            const touchY = e.touches[0].clientY;
            const deltaY = touchStartY - touchY;
            if (mediaFullyExpanded && deltaY < -20 && window.scrollY <= 5) {
                setMediaFullyExpanded(false);
                e.preventDefault();
            } else if (!mediaFullyExpanded) {
                e.preventDefault();
                const scrollFactor = deltaY < 0 ? 0.008 : 0.005;
                const scrollDelta = deltaY * scrollFactor;
                const newProgress = Math.min(Math.max(scrollProgress + scrollDelta, 0), 1);
                setScrollProgress(newProgress);
                if (newProgress >= 1) {
                    setMediaFullyExpanded(true);
                    setShowContent(true);
                } else if (newProgress < 0.75) {
                    setShowContent(false);
                }
                setTouchStartY(touchY);
            }
        };

        const handleTouchEnd = () => { setTouchStartY(0); };
        const handleScroll = () => { if (!mediaFullyExpanded) window.scrollTo(0, 0); };

        window.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('touchstart', handleTouchStart, { passive: false });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [scrollProgress, mediaFullyExpanded, touchStartY]);

    // Scale the hero content down as user scrolls, fade it out
    const heroScale = 1 - scrollProgress * 0.15;
    const heroOpacity = 1 - scrollProgress * 1.2;
    // Viewport portal: starts small, expands to full screen
    const portalSize = 20 + scrollProgress * 80; // 20% -> 100%
    const portalRadius = 50 - scrollProgress * 49; // 50% circle -> 1% (basically square)
    const portalOpacity = 0.3 + scrollProgress * 0.7;

    return (
        <div ref={sectionRef} className="overflow-x-hidden">
            <section className="relative flex flex-col items-center justify-start min-h-[100dvh]">
                <div className="relative w-full flex flex-col items-center min-h-[100dvh]">

                    {/* LiquidMetal shader — fixed fullscreen background */}
                    <div className="fixed inset-0 z-0">
                        <LiquidMetal
                            {...liquidMetalPresets[2]}
                            style={{ position: 'absolute', width: '100%', height: '100%' }}
                        />
                        {/* Dark overlay that fades as user scrolls */}
                        <div
                            className="absolute inset-0 transition-none"
                            style={{
                                background: `radial-gradient(ellipse at center, 
                  rgba(0,0,0,${0.85 - scrollProgress * 0.4}) 0%, 
                  rgba(0,0,0,${0.95 - scrollProgress * 0.3}) 100%)`,
                            }}
                        />
                    </div>

                    {/* Expanding portal/window effect */}
                    <div
                        className="fixed inset-0 z-[1] pointer-events-none flex items-center justify-center transition-none"
                        style={{ opacity: scrollProgress > 0.05 ? 1 : 0 }}
                    >
                        <div
                            className="transition-none"
                            style={{
                                width: `${portalSize}vw`,
                                height: `${portalSize}vh`,
                                borderRadius: `${portalRadius}%`,
                                opacity: portalOpacity,
                                boxShadow: `0 0 ${60 + scrollProgress * 80}px rgba(99, 102, 241, ${0.1 + scrollProgress * 0.3}), 
                             inset 0 0 ${40 + scrollProgress * 60}px rgba(99, 102, 241, ${0.05 + scrollProgress * 0.15})`,
                                border: `1px solid rgba(99, 102, 241, ${0.1 + scrollProgress * 0.3})`,
                                background: `radial-gradient(ellipse at center, 
                  rgba(99, 102, 241, ${scrollProgress * 0.05}) 0%, 
                  transparent 70%)`,
                            }}
                        />
                    </div>

                    {/* Hero content — fades and scales down on scroll */}
                    <div className="container mx-auto flex flex-col items-center justify-start relative z-10">
                        <div className="flex flex-col items-center justify-center w-full h-[100dvh] relative">
                            <motion.div
                                className="flex flex-col items-center text-center px-4 transition-none"
                                style={{
                                    transform: `scale(${heroScale})`,
                                    opacity: Math.max(heroOpacity, 0),
                                }}
                            >
                                {/* Badge */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                    className="mb-8"
                                >
                                    <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-5 py-2 text-sm text-indigo-300 backdrop-blur-sm">
                                        ✨ The Future of Web Development
                                    </span>
                                </motion.div>

                                {/* Main Title */}
                                <motion.h1
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1, delay: 0.4 }}
                                    className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold tracking-tight leading-[0.9] mb-6"
                                >
                                    <span className="block bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent">
                                        MYTH
                                    </span>
                                </motion.h1>

                                {/* Subtitle */}
                                <motion.p
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.7 }}
                                    className="text-lg sm:text-xl md:text-2xl text-gray-300 font-light max-w-2xl leading-relaxed mb-4"
                                >
                                    Transform ideas into{' '}
                                    <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent font-medium">
                                        production-ready
                                    </span>{' '}
                                    web applications with AI
                                </motion.p>

                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.8, delay: 0.9 }}
                                    className="text-sm text-gray-500 max-w-lg mb-10"
                                >
                                    From URL cloning to full-stack MERN apps — build, iterate, and ship 10x faster.
                                </motion.p>

                                {/* CTA Buttons */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 1.1 }}
                                    className="flex flex-col sm:flex-row gap-4 mb-16"
                                >
                                    <a
                                        href="/sign-up"
                                        className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300"
                                    >
                                        Start Building Free
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                    </a>
                                    <a
                                        href="#how-it-works"
                                        className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium text-gray-300 bg-white/5 border border-white/15 backdrop-blur-sm hover:bg-white/10 hover:text-white transition-all duration-300"
                                    >
                                        See How It Works
                                    </a>
                                </motion.div>

                                {/* Scroll indicator */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 1, delay: 1.5 }}
                                    className="flex flex-col items-center gap-2"
                                >
                                    <span className="text-xs text-gray-500 uppercase tracking-widest">Scroll to explore</span>
                                    <motion.div
                                        animate={{ y: [0, 8, 0] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    >
                                        <ChevronDown className="h-5 w-5 text-gray-500" />
                                    </motion.div>
                                </motion.div>
                            </motion.div>
                        </div>

                        {/* Revealed content below hero after full expansion */}
                        <motion.section
                            className="flex flex-col w-full px-4 py-10 md:px-16 lg:py-20"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: showContent ? 1 : 0 }}
                            transition={{ duration: 0.7 }}
                        >
                            {children}
                        </motion.section>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ScrollExpandHero;
