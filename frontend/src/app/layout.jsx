// layout.jsx
import { ClerkProvider } from "@clerk/nextjs";
import { ToastProvider } from "../components/Toast";
import { Inter } from "next/font/google";
import Navbar from "../components/Navbar";
import ClientUserSync from "../components/Userclientsync";
import "./globals.css";
import UserSync from "../components/UserSync";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Planora - Project Management System",
  description: "Manage your projects and tasks efficiently",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <ToastProvider>
        <html lang="en">
          <body className={inter.className}>
            {/* <ClientUserSync />
             */}
            <UserSync />

            <Navbar />
            <main>{children}</main>
          </body>
        </html>
      </ToastProvider>
    </ClerkProvider>
  );
}
