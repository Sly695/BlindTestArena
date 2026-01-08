import "./globals.css";

export const metadata = {
  title: "BlindTest API",
  description: "Backend API pour BlindTest Arena",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

