import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Enzo Linhares Brasil — Desenvolvedor & Educador de Robótica";
const description =
  "Portfólio de Enzo Linhares Brasil, estudante de ADS na Unifor, desenvolvedor e professor de robótica em Fortaleza.";

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "enzo-portfolio.enzobrasil1207.chatgpt.site";
  const protocol = headerStore.get("x-forwarded-proto") ?? "https";
  const socialImage = `${protocol}://${host}/og.png`;

  return {
    title,
    description,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "pt_BR",
      images: [{ url: socialImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
