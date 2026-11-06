import Image from "next/image";

interface BrandLogoProps {
  variant?: "horizontal" | "vertical" | "icon";
  className?: string;
  priority?: boolean;
}

const assets = {
  horizontal: { src: "/brand/iqualitys-logo-horizontal-display.png", width: 1207, height: 285 },
  vertical: { src: "/brand/iqualitys-logo-vertical-display.png", width: 613, height: 401 },
  icon: { src: "/brand/iqualitys-favicon-512.png", width: 512, height: 512 },
};

export default function BrandLogo({ variant = "horizontal", className = "", priority = false }: BrandLogoProps) {
  return (
    <span className={`inline-flex max-w-full shrink-0 items-center justify-center rounded-xl bg-white p-3 ${className}`}>
      <Image
        {...assets[variant]}
        alt="Iqualitys PM"
        className="block h-auto w-full object-contain"
        priority={priority}
      />
    </span>
  );
}
