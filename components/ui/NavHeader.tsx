"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

interface NavHeaderProps {
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
}

export default function NavHeader({
  showBack = true,
  backHref = "/dashboard",
  backLabel = "Dashboard",
}: NavHeaderProps) {
  const pathname = usePathname();

  const linkClass = (href: string) => {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    return `nav-header__link${isActive ? " nav-header__link--active" : ""}`;
  };

  return (
    <header className="nav-header">
      <div className="nav-header__left">
        <Logo variant="icon" size="sm" linkTo="/dashboard" />
        {showBack && (
          <Link href={backHref} className="nav-header__back">
            {backLabel}
          </Link>
        )}
      </div>
      <nav className="nav-header__links">
        <Link href="/upload" className={linkClass("/upload")}>
          Upload
        </Link>
        <Link href="/chat" className={linkClass("/chat")}>
          Chat
        </Link>
        <Link href="/reports" className={linkClass("/reports")}>
          Reports
        </Link>
        <Link href="/profile" className={linkClass("/profile")}>
          Profile
        </Link>
      </nav>
    </header>
  );
}
