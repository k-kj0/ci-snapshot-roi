import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Snapshot ROI Autopilot", description: "Understand when CI snapshots save money — and when they don't." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
