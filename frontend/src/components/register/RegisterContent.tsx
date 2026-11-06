import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import Image from "next/image";
export function RegisterContent() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="signup-hero-container">
      {/* Main Content */}
      <div className="signup-hero-content relative z-10">
        {/* Brand Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="signup-brand-header"
        >
          <div className="">
            <div className="flex items-center">
              <Image
                src="/taskosaur-logo.svg"
                alt="Iqualitys PM Logo"
                width={50}
                height={50}
                className={`size-6 lg:size-10 ${resolvedTheme === "light" ? " filter invert brightness-200" : ""}`}
              />
              <h1 className="login-brand-title">Iqualitys PM</h1>
            </div>
          </div>

          <h2 className="signup-hero-heading">
            Start your journey to
            <br />
            <span className="signup-hero-heading-gradient">effortless productivity</span>
          </h2>

          <p className="signup-hero-description">
            Create your account to manage your team's work with Iqualitys PM.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
