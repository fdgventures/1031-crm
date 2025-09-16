import React from "react";
import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link
              href="/"
              className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            >
              Exchange CRM
            </Link>
          </div>
          <nav className="hidden md:flex space-x-8">
            <Link
              href="/profiles"
              className="text-gray-500 hover:text-gray-900"
            >
              Profiles
            </Link>
            <Link
              href="/exchanges"
              className="text-gray-500 hover:text-gray-900"
            >
              Exchanges
            </Link>
            <Link
              href="/transactions"
              className="text-gray-500 hover:text-gray-900"
            >
              Transactions
            </Link>
            <Link
              href="/business-cards"
              className="text-gray-500 hover:text-gray-900"
            >
              Business Cards
            </Link>
            <Link
              href="/properties"
              className="text-gray-500 hover:text-gray-900"
            >
              Properties
            </Link>
            <Link
              href="/tax-accounts"
              className="text-gray-500 hover:text-gray-900"
            >
              Tax Accounts
            </Link>
            <Link href="/eat" className="text-gray-500 hover:text-gray-900">
              EAT
            </Link>
          </nav>
          <div className="flex items-center">
            <Link
              href="/admin/signin"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
