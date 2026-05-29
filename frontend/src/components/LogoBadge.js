import { motion } from "framer-motion";

const LogoBadge = () => {
  const logoUrl = "https://customer-assets.emergentagent.com/job_elprofe-app/artifacts/vq8mu8b5_A_digital_vector_graphic_features_the_logo_for__Pr.png";

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-30 pointer-events-none"
      initial={{ opacity: 0, scale: 0, rotate: -90 }}
      animate={{ 
        opacity: 0.3, 
        scale: 1, 
        rotate: 0,
        y: [0, -10, 0]
      }}
      transition={{ 
        opacity: { duration: 0.5 },
        scale: { duration: 0.5 },
        rotate: { duration: 0.5 },
        y: { 
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
      whileHover={{ opacity: 0.6, scale: 1.1 }}
      style={{ pointerEvents: 'auto' }}
    >
      <div className="relative">
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 blur-md"
          animate={{
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <img src={logoUrl} alt="" className="h-20 w-auto opacity-50" />
        </motion.div>
        
        {/* Main logo */}
        <img 
          src={logoUrl} 
          alt="Professor App" 
          className="h-20 w-auto relative z-10 filter drop-shadow-[0_0_15px_rgba(124,92,255,0.5)]"
        />
      </div>
    </motion.div>
  );
};

export default LogoBadge;
