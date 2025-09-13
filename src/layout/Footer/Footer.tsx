import React from "react";
import { FooterProps } from "./Footer.props";

export default function Footer({
  companyName = "Exchange CRM",
  companyDescription = "Exchange and real estate management system",
  sections = [
    {
      title: "Navigation",
      links: [
        { label: "Exchanges", href: "/exchanges" },
        { label: "Business Cards", href: "/business-cards" },
        { label: "Properties", href: "/properties" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Help", href: "/help" },
        { label: "Contact", href: "/contact" },
      ],
    },
  ],
  contactInfo = {
    email: "info@exchange-crm.com",
    phone: "+7 (xxx) xxx-xx-xx",
  },
  copyrightText = "© 2024 Exchange CRM. All rights reserved.",
  className = "",
}: FooterProps) {
  return (
    <footer className={`bg-gray-50 border-t ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              {companyName}
            </h3>
            <p className="text-sm text-gray-600">{companyDescription}</p>
          </div>

          {sections.map((section, index) => (
            <div key={index}>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href={link.href}
                      className={`text-sm text-gray-600 hover:text-gray-900 ${
                        link.className || ""
                      }`}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {contactInfo && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Contacts
              </h3>
              {contactInfo.email && (
                <p className="text-sm text-gray-600">
                  Email: {contactInfo.email}
                </p>
              )}
              {contactInfo.phone && (
                <p className="text-sm text-gray-600">
                  Телефон: {contactInfo.phone}
                </p>
              )}
              {contactInfo.address && (
                <p className="text-sm text-gray-600">
                  Адрес: {contactInfo.address}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600">{copyrightText}</p>
        </div>
      </div>
    </footer>
  );
}
