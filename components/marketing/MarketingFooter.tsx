import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#262626] bg-black py-16">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1.2fr_2fr] lg:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#262626] bg-[#111] text-sm font-semibold">
              P
            </span>
            <span className="text-lg font-semibold text-white">peec</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-neutral-500">
            AI search analytics for marketing teams. Visibility, position, and sentiment—without guesswork.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <FooterCol
            title="Product"
            links={[
              ["Overview", "/dashboard"],
              ["Pricing", "/pricing"],
              ["Integrations", "#"],
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              ["About", "#"],
              ["Careers", "#"],
              ["Contact", "#"],
            ]}
          />
          <FooterCol
            title="Resources"
            links={[
              ["Blog", "#"],
              ["Docs", "#"],
              ["Status", "#"],
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              ["Privacy", "#"],
              ["Terms", "#"],
              ["Security", "#"],
            ]}
          />
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-6xl border-t border-[#1f1f1f] px-4 pt-8 text-xs text-neutral-600 lg:px-6">
        © {new Date().getFullYear()} Peec AI. All rights reserved.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</p>
      <ul className="mt-4 space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-sm text-neutral-400 transition-colors duration-200 hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
