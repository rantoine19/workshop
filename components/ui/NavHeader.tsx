"use client";

import Link from "next/link";
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
        <Link href="/upload" className="nav-header__link">
          Upload
        </Link>
        <Link href="/chat" className="nav-header__link">
          Chat
        </Link>
        <Link href="/profile" className="nav-header__link">
          Profile
        </Link>
      </nav>
    </header>
  );
}
