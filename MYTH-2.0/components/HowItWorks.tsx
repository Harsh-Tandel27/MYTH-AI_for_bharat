"use client";

import { useRef } from "react";
import { motion, useInView, Variants } from "framer-motion";
import { Download, Bot, Scan, MessageSquare, Sparkles } from "lucide-react";

const HowItWorks = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const stepVariants: Variants = {
    hidden: { opacity: 0, x: -30 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.2, duration: 0.6 },
    }),
  };

  const stepsLeft = [
    { icon: <Scan size={28} className="text-indigo-400" />, title: "1. Scan Website", desc: "Enter a URL. AI scans layout, components & styles." },
    { icon: <Bot size={28} className="text-indigo-400" />, title: "2. Recreate", desc: "MYTH rebuilds the website in clean modern code." },
    { icon: <Download size={28} className="text-indigo-400" />, title: "3. Export", desc: "Download ready-to-deploy project files." },
  ];

  const stepsRight = [
    { icon: <MessageSquare size={28} className="text-purple-400" />, title: "1. Give Prompt", desc: "Describe your idea in plain text." },
    { icon: <Sparkles size={28} className="text-purple-400" />, title: "2. Generate", desc: "AI creates layout, styling & logic automatically." },
    { icon: <Download size={28} className="text-purple-400" />, title: "3. Deploy", desc: "Export in React, Next.js, or your preferred framework." },
  ];

  // Mobile step renderer
  const renderMobileSteps = (steps: typeof stepsLeft, color: string) =>
    steps.map((step, idx) => (
      <motion.div
        key={idx}
        custom={idx}
        variants={stepVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="flex items-start gap-4"
      >
        <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-${color}-600/20 border border-${color}-600`}>
          {step.icon}
        </div>
        <div className="text-left">
          <h3 className="text-sm font-semibold">{step.title}</h3>
          <p className="text-xs text-gray-400 mt-1">{step.desc}</p>
        </div>
      </motion.div>
    ));

  return (
    <div ref={ref} className="mx-auto max-w-5xl px-4 md:px-0">
      {/* ===== DESKTOP UI (unchanged) ===== */}
      <div className="hidden md:block">
        <div className="relative rounded-2xl bg-gray-950/40 backdrop-blur-xl border border-white/10 p-8 sm:p-12">
          {/* Central Divider */}
          <div className="absolute top-12 left-1/2 -ml-px w-px h-[calc(100%-6rem)] bg-gradient-to-b from-transparent via-indigo-500/50 to-transparent" />

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-20">
            {/* LEFT COLUMN */}
            <div className="relative flex flex-col gap-16">
              {/* Animated Connector Lines */}
              <div className="absolute top-16 left-8 -ml-px w-1 h-16 overflow-hidden">
                <motion.div
                  className="absolute inset-0 w-full bg-gradient-to-b from-indigo-200 via-indigo-700 to-indigo-100"
                  style={{ backgroundSize: "100% 300%" }}
                  initial={{ backgroundPositionY: "0%" }}
                  animate={isInView ? { backgroundPositionY: ["0%", "300%"] } : {}}
                  transition={{ delay: 0.5, duration: 2.5, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <div className="absolute top-48 left-8 -ml-px w-1 h-16 overflow-hidden">
                <motion.div
                  className="absolute inset-0 w-full bg-gradient-to-b from-indigo-200 via-indigo-700 to-indigo-100"
                  style={{ backgroundSize: "100% 300%" }}
                  initial={{ backgroundPositionY: "0%" }}
                  animate={isInView ? { backgroundPositionY: ["0%", "300%"] } : {}}
                  transition={{ delay: 1.0, duration: 2.5, repeat: Infinity, ease: "linear" }}
                />
              </div>

              {/* Steps */}
              {stepsLeft.map((step, idx) => (
                <motion.div
                  key={idx}
                  custom={idx}
                  variants={stepVariants}
                  initial="hidden"
                  animate={isInView ? "visible" : "hidden"}
                  className="flex w-full items-start gap-6 z-10"
                >
                  <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center rounded-full bg-indigo-600/20 border border-indigo-600">
                    {step.icon}
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* RIGHT COLUMN */}
            <div className="relative flex flex-col gap-16">
              <div className="absolute top-16 left-8 -ml-px w-1 h-16 overflow-hidden">
                <motion.div
                  className="absolute inset-0 w-full bg-gradient-to-b from-purple-200 via-purple-700 to-purple-100"
                  style={{ backgroundSize: "100% 300%" }}
                  initial={{ backgroundPositionY: "0%" }}
                  animate={isInView ? { backgroundPositionY: ["0%", "300%"] } : {}}
                  transition={{ delay: 0.6, duration: 2.5, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <div className="absolute top-48 left-8 -ml-px w-1 h-16 overflow-hidden">
                <motion.div
                  className="absolute inset-0 w-full bg-gradient-to-b from-purple-200 via-purple-700 to-purple-100"
                  style={{ backgroundSize: "100% 300%" }}
                  initial={{ backgroundPositionY: "0%" }}
                  animate={isInView ? { backgroundPositionY: ["0%", "300%"] } : {}}
                  transition={{ delay: 1.1, duration: 2.5, repeat: Infinity, ease: "linear" }}
                />
              </div>

              {stepsRight.map((step, idx) => (
                <motion.div
                  key={idx}
                  custom={idx + 0.5}
                  variants={stepVariants}
                  initial="hidden"
                  animate={isInView ? "visible" : "hidden"}
                  className="flex w-full items-start gap-6 z-10"
                >
                  <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center rounded-full bg-purple-600/20 border border-purple-600">
                    {step.icon}
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== MOBILE UI (NEW) ===== */}
      <div className="block md:hidden">
        <div className="rounded-2xl bg-gray-950/40 backdrop-blur-xl border border-white/10 p-6 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-center mb-2">How It Works</h2>
          {renderMobileSteps(stepsLeft, "indigo")}
          <h2 className="text-xl font-bold text-center mb-2">OR</h2>
          {renderMobileSteps(stepsRight, "purple")}
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
