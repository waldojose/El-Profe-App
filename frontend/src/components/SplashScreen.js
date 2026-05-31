import { motion } from "framer-motion";
import { useEffect } from "react";

const SplashScreen = ({ onComplete }) => {
  const logoUrl = "/logo-white.png";

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#07060d]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated background particles (aurora palette) */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{ backgroundColor: i % 2 ? "#9d7bff" : "#22d3ee" }}
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              opacity: [0, 0.6, 0],
              scale: [0, 1.5, 0]
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Logo with epic animations */}
      <div className="relative">
        {/* Pulsing glow ring */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: [0.8, 1.2, 0.8],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="w-96 h-96 rounded-full border-4 border-[#7c5cff] blur-xl"></div>
        </motion.div>

        {/* Main logo */}
        <motion.div
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{
            scale: 1,
            rotate: 0,
            opacity: 1
          }}
          transition={{
            duration: 1,
            type: "spring",
            stiffness: 200,
            damping: 15
          }}
          className="relative z-10"
        >
          <motion.img
            src={logoUrl}
            alt="El Profe"
            className="h-64 w-auto rounded-2xl"
            animate={{
              filter: [
                "drop-shadow(0 0 50px rgba(124,92,255,0.8))",
                "drop-shadow(0 0 80px rgba(34,211,238,0.9))",
                "drop-shadow(0 0 50px rgba(124,92,255,0.8))"
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>

        {/* Loading text */}
        <motion.div
          className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.p
            className="text-[#22d3ee] text-xl font-bold tracking-wider"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Loading Experience...
          </motion.p>
        </motion.div>
      </div>

      {/* Corner accent lines */}
      <motion.div
        className="absolute top-8 left-8 w-20 h-20 border-t-4 border-l-4 border-[#7c5cff]"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      />
      <motion.div
        className="absolute top-8 right-8 w-20 h-20 border-t-4 border-r-4 border-[#22d3ee]"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
      />
      <motion.div
        className="absolute bottom-8 left-8 w-20 h-20 border-b-4 border-l-4 border-[#22d3ee]"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      />
      <motion.div
        className="absolute bottom-8 right-8 w-20 h-20 border-b-4 border-r-4 border-[#f65bae]"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
      />
    </motion.div>
  );
};

export default SplashScreen;
