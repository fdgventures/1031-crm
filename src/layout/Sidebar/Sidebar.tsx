"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

type NavItem = {
  id: "search" | "message" | "logs" | "notifications";
  label: string;
  icon: React.ReactNode;
  href?: string;
};

const navItems: NavItem[] = [
  {
    id: "search",
    href: "/search",
    label: "Search",
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="17" y2="17" />
      </svg>
    ),
  },
  {
    id: "message",
    href: "/message",
    label: "Messages",
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "logs",
    href: "/logs",
    label: "Logs",
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3h18v4H3z" />
        <path d="M9 7v14" />
        <path d="M15 7v14" />
        <path d="M3 11h18" />
      </svg>
    ),
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [openPanel, setOpenPanel] = useState<"notifications" | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!panelRef.current) return;

      const isInsidePanel = panelRef.current.contains(target);
      const isInsideButton = notificationButtonRef.current?.contains(target) ?? false;

      if (!isInsidePanel && !isInsideButton) {
        setOpenPanel(null);
      }
    };

    if (openPanel) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openPanel]);

  useEffect(() => {
    setOpenPanel(null);
  }, [pathname]);

  return (
    <aside className="hidden lg:flex lg:w-20 xl:w-24 flex-col border-r bg-white">
      <div className="flex-1 flex flex-col items-center py-6 space-y-6">
        <Link
          href="/"
          className={`inline-flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
            pathname === "/"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
          }`}
          aria-label="Home"
        >
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
          </svg>
        </Link>

        <nav className="flex w-full flex-col items-center space-y-4">
          {navItems.map((item) => {
            if (item.id === "notifications") {
              return (
                <div key={item.id} className="relative flex w-full justify-center px-4">
                  <button
                    ref={notificationButtonRef}
                    type="button"
                    aria-label="Notifications"
                    className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                      openPanel === "notifications"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                    onClick={() =>
                      setOpenPanel((prev) =>
                        prev === "notifications" ? null : "notifications"
                      )
                    }
                  >
                    {item.icon}
                  </button>

                  {openPanel === "notifications" && (
                    <div
                      ref={panelRef}
                      className="absolute left-full top-1/2 ml-3 w-64 -translate-y-1/2 transform rounded-xl border border-gray-200 bg-white p-4 text-left shadow-lg"
                    >
                      <h3 className="text-sm font-semibold text-gray-900">
                        Notifications
                      </h3>
                      <p className="mt-2 text-sm text-gray-600">
                        You do not have any notifications yet.
                      </p>
                      <Link
                        href="/message"
                        className="mt-3 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                        onClick={() => setOpenPanel(null)}
                      >
                        Open inbox →
                      </Link>
                    </div>
                  )}
                </div>
              );
            }

            const isActive = pathname === item.href;

            return (
              <Link
                key={item.id}
                href={item.href ?? "#"}
                className={`group flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                }`}
                aria-label={item.label}
              >
                {item.icon}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

