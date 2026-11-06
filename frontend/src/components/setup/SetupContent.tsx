import { motion } from "framer-motion";
import BrandLogo from "@/components/common/BrandLogo";
import { Shield } from "lucide-react";

export function SetupContent() {

  return (
    <div className="setup-hero-container">
      {/* Main Content */}
      <div className="setup-hero-content">
        {/* Brand Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="setup-brand-header"
        >
          <div className="">
            <div className="flex items-center">
              <BrandLogo variant="horizontal" className="w-80" priority />
              <h1 className="sr-only">Iqualitys PM</h1>
            </div>
          </div>

          <h2 className="setup-hero-heading">
            Begin your
            <br />
            <span className="setup-hero-heading-gradient">productivity journey</span>
          </h2>

          <p className="setup-hero-description">
            Set up your super admin account to unlock the full power of Iqualitys PM's
            AI-powered project management platform for your entire organization.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
