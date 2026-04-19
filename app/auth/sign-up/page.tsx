import { AuthForm } from "@/components/auth-form";
import { Navbar } from "@/components/navbar";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(217,119,6,0.12),_transparent_25%),linear-gradient(180deg,#faf9f5_0%,#edf3ee_100%)]">
      <Navbar />
      <main className="mx-auto flex max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <AuthForm mode="sign-up" />
      </main>
    </div>
  );
}
