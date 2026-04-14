"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import Avatar from "./Avatar";

interface NavHeaderProps {
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
}

interface ProfileInfo {
  avatar_url: string | null;
  display_name: string | null;
}

export default function NavHeader({
  showBack = true,
  backHref = "/dashboard",
  backLabel = "Dashboard",
}: NavHeaderProps) {
  const pathname = usePathname();
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.profile) {
          setProfileInfo({
            avatar_url: data.profile.avatar_url || null,
            display_name: data.profile.display_name || null,
          });
        }
      })
      .catch(() => {
        // Silent fail — avatar is non-critical
      });
  }, []);

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
        <Link href="/medications" className={linkClass("/medications")}>
          Medications
        </Link>
        <Link href="/family" className={linkClass("/family")}>
          Family
        </Link>
        <Link href="/glossary" className={linkClass("/glossary")}>
          Glossary
        </Link>
        <Link href="/profile" className={linkClass("/profile")}>
          <span className="nav-header__profile-link">
            {profileInfo && (
              <Avatar
                avatarUrl={profileInfo.avatar_url}
                displayName={profileInfo.display_name}
                size="sm"
              />
            )}
            Profile
          </span>
        </Link>
      </nav>
    </header>
  );
}
