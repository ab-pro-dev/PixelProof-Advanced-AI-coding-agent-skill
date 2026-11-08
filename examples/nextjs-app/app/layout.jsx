import "./globals.css";

export const metadata = {
  title: "Next.js Benchmark App",
  description: "Minimal Next.js app for PixelProof benchmarking",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
