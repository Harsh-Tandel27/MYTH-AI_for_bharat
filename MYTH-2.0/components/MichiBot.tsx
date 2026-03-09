// In src/components/MichiBot.tsx

"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";

export default function MichiBot() {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.src =
      "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js";

    if (!document.head.querySelector(`script[src="${script.src}"]`)) {
      document.head.appendChild(script);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 1.2,
        ease: [0.25, 0.1, 0.25, 1],
        delay: 0.5,
      }}
      className="relative w-full max-w-[400px] aspect-square mx-auto z-20 pointer-events-none sm:pointer-events-auto"
    >
      <motion.div
        animate={{
          y: [-15, 15, -15],
        }}
        transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
        className="w-full h-full relative"
      >
        {/* Subtle glow behind the bot */}
        <div className="absolute inset-0 bg-[var(--primary)]/20 rounded-full blur-3xl -z-10" />

        <model-viewer
          src="/michi_bot.glb"
          camera-controls
          disable-zoom
          disable-pan
          autoplay
          interaction-prompt="none"
          camera-orbit="-10deg 85deg 105%"
          style={{ width: "100%", height: "100%" }}
        ></model-viewer>
      </motion.div>
    </motion.div>
  );
}