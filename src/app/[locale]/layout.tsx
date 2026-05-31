import { APP_TITLE } from "@/constants";
import { AppLayout } from "@/layouts";
import { parseLocale, routing } from "@/libs/I18nRouting";
import "@/styles/global.css";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Providers } from "../providers";

export const metadata: Metadata = {
  title: APP_TITLE,
  description: "Climate data visualization",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning data-scroll-behavior="smooth">
      <body>
        <Providers>
          <NextIntlClientProvider>
            <AppLayout>{children}</AppLayout>
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
