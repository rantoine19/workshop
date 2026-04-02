import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  variant?: "full" | "icon";
  size?: "sm" | "md" | "lg";
  linkTo?: string;
}

const sizes = {
  sm: { full: { width: 140, height: 28 }, icon: { width: 24, height: 24 } },
  md: { full: { width: 180, height: 36 }, icon: { width: 32, height: 32 } },
  lg: { full: { width: 240, height: 48 }, icon: { width: 40, height: 40 } },
};

export default function Logo({
  variant = "full",
  size = "md",
  linkTo,
}: LogoProps) {
  const dimensions = sizes[size][variant];
  const src = variant === "full" ? "/logo.svg" : "/logo-icon.svg";
  const alt = "HealthChat AI";

  const image = (
    <Image
      src={src}
      alt={alt}
      width={dimensions.width}
      height={dimensions.height}
      priority
      className={`logo logo--${variant} logo--${size}`}
    />
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="logo-link">
        {image}
      </Link>
    );
  }

  return image;
}
