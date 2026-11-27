import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { FitnessProvider } from "@/lib/store";
import { MusicProvider } from "@/lib/music";

export const metadata: Metadata = {
  title: "عَدّاد — Exercise Timer | تمرينك اليومي بطاقة جديدة",
  description: "كروت تمارين ثلاثية الأبعاد، مؤقتات مدمجة، مشغل موسيقى، وسجل كامل لإنجازاتك اليومية.",
  applicationName: "عَدّاد",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "عَدّاد" },
};

export const viewport: Viewport = {
  themeColor: "#060911",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <FitnessProvider>
          <MusicProvider>
            <Shell>{children}</Shell>
          </MusicProvider>
        </FitnessProvider>
      </body>
    </html>
  );
}
