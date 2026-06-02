import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, Eye, EyeOff, Mail, Lock, User } from "lucide-react";

const guidementFeatures = [
  "Personalized course guidance for every learning goal",
  "Hands-on lessons, quizzes, and certificates in one place",
  "Instructor-led programs with real-world project practice",
  "Progress analytics and insights to keep learners on track",
  "Career-ready skills designed for modern professionals",
];

const trustedPartners = [
  "ASHOKA UNIVERSITY",
  "IDEASCOPE",
  "XLRI",
  "IIFT",
  "STAR AGILE",
  "SANSHIKAN",
  "GOODNESS",
  "PRO NATURE",
];

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const MicrosoftIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 23 23" aria-hidden="true">
    <path fill="#f25022" d="M1 1h10v10H1z" />
    <path fill="#00a4ef" d="M12 1h10v10H12z" />
    <path fill="#7fba00" d="M1 12h10v10H1z" />
    <path fill="#ffb900" d="M12 12h10v10H12z" />
  </svg>
);

export default function Auth() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "login";
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState(defaultTab === "register" ? "register" : "login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  // Forgot
  const [forgotEmail, setForgotEmail] = useState("");
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (regPassword !== regConfirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        data: { full_name: regName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email for a confirmation link!");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent!");
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/dashboard" },
    });
    if (error) toast.error(error.message);
  };

  const authTitle = showForgot
    ? "Reset your password"
    : activeTab === "register"
      ? "Create your account"
      : "Sign in to your account";

  const authSubtitle = showForgot
    ? "Enter your email to receive a reset link"
    : activeTab === "register"
      ? "Start learning with Guidement in minutes"
      : "Continue your Guidement learning journey";

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f8f9fb] text-[#0f1b33]">
      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-2">
        <section className="flex items-center border-r border-[#dfe4ea] bg-[#f6f7f9] px-6 py-12 sm:px-12 lg:px-[84px]">
          <div className="w-full max-w-[512px]">
            <img src="/logo.png" alt="Guidement" className="mb-8 h-16 w-auto object-contain object-left" />

            <h1 className="mb-8 max-w-[470px] text-[30px] font-extrabold leading-[1.2] tracking-[-0.03em] text-[#061229] sm:text-[32px]">
              Guidement Workforce for Smarter Learning and Career Growth
            </h1>

            <ul className="space-y-5">
              {guidementFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-4 text-[16px] leading-5 text-[#14213f]">
                  <CheckCircle className="h-[18px] w-[18px] shrink-0 fill-[#18a058] text-white" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="my-12 h-px w-full bg-[#d2d8df]" />

            <p className="mb-7 text-sm text-[#26344f]">Trusted by leading learners and businesses worldwide</p>
            <div className="grid grid-cols-4 gap-x-8 gap-y-6 opacity-40 grayscale">
              {trustedPartners.map((partner) => (
                <div key={partner} className="flex h-8 items-center justify-center text-center text-[10px] font-black leading-tight tracking-[-0.04em] text-[#77808a]">
                  {partner}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-white px-6 py-12 sm:px-10">
          <div className="w-full max-w-[448px]">
            <div className="mb-8 text-center">
              <h2 className="text-[30px] font-extrabold leading-tight tracking-[-0.03em] text-[#061229] sm:text-[32px]">{authTitle}</h2>
              <p className="mt-3 text-sm text-[#26344f]">{authSubtitle}</p>
            </div>

            {!showForgot && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button type="button" variant="outline" onClick={handleGoogleLogin} className="h-[38px] rounded-md border-[#cfd6df] bg-white text-[14px] font-medium text-[#4d5a72] shadow-none hover:bg-[#f8fafc]">
                    <GoogleIcon />
                    <span className="ml-2">Google</span>
                  </Button>
                  <Button type="button" variant="outline" className="h-[38px] rounded-md border-[#cfd6df] bg-white text-[14px] font-medium text-[#4d5a72] shadow-none hover:bg-[#f8fafc]">
                    <MicrosoftIcon />
                    <span className="ml-2">Microsoft</span>
                  </Button>
                </div>

                <div className="my-7 flex items-center gap-3 text-sm text-[#667085]">
                  <div className="h-px flex-1 bg-[#d4d9df]" />
                  <span>{activeTab === "register" ? "Or continue with email" : "Or sign in with email"}</span>
                  <div className="h-px flex-1 bg-[#d4d9df]" />
                </div>
              </>
            )}

            {showForgot ? (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-sm font-semibold text-[#14213f]">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-[#687083] text-[#687083]" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="Email Address"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="h-[38px] rounded-md border-[#cfd6df] pl-10 text-[14px] placeholder:text-[#98a1b3] focus-visible:ring-[#f27055]"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="h-10 w-full rounded-md bg-[#f27055] text-base font-bold text-white shadow-none hover:bg-[#e7664b]" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button type="button" variant="ghost" className="w-full text-[#155eef] hover:text-[#155eef]" onClick={() => setShowForgot(false)}>
                  Back to Login
                </Button>
              </form>
            ) : activeTab === "register" ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name" className="text-sm font-semibold text-[#14213f]">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-[#687083] text-[#687083]" />
                    <Input id="reg-name" placeholder="Full Name" value={regName} onChange={(e) => setRegName(e.target.value)} className="h-[38px] rounded-md border-[#cfd6df] pl-10 text-[14px] placeholder:text-[#98a1b3] focus-visible:ring-[#f27055]" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-sm font-semibold text-[#14213f]">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-[#687083] text-[#687083]" />
                    <Input id="reg-email" type="email" placeholder="Email Address" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="h-[38px] rounded-md border-[#cfd6df] pl-10 text-[14px] placeholder:text-[#98a1b3] focus-visible:ring-[#f27055]" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-sm font-semibold text-[#14213f]">Password *</Label>
                  <div className="relative">
                    <Input id="reg-password" type={showPassword ? "text" : "password"} placeholder="Password (min. 6 characters)" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="h-[38px] rounded-md border-[#cfd6df] pr-10 text-[14px] placeholder:text-[#98a1b3] focus-visible:ring-[#f27055]" required minLength={6} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98a1b3]" aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-confirm-password" className="text-sm font-semibold text-[#14213f]">Confirm Password *</Label>
                  <div className="relative">
                    <Input id="reg-confirm-password" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} className="h-[38px] rounded-md border-[#cfd6df] pr-10 text-[14px] placeholder:text-[#98a1b3] focus-visible:ring-[#f27055]" required minLength={6} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98a1b3]" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="mt-6 h-10 w-full rounded-md bg-[#f27055] text-base font-bold text-white shadow-none hover:bg-[#e7664b]" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
                <p className="pt-3 text-center text-sm text-[#344054]">
                  Already have an account?{" "}
                  <button type="button" onClick={() => setActiveTab("login")} className="font-semibold text-[#155eef] hover:underline">
                    Sign in
                  </button>
                </p>
              </form>
            ) : (
              <>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-semibold text-[#14213f]">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-[#687083] text-[#687083]" />
                      <Input id="login-email" type="email" placeholder="Email Address" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="h-[38px] rounded-md border-[#cfd6df] pl-10 text-[14px] placeholder:text-[#98a1b3] focus-visible:ring-[#f27055]" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-semibold text-[#14213f]">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#687083]" />
                      <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="h-[38px] rounded-md border-[#cfd6df] pl-10 pr-10 text-[14px] placeholder:text-[#98a1b3] focus-visible:ring-[#f27055]" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98a1b3]" aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowForgot(true)} className="text-sm font-medium text-[#155eef] hover:underline">
                    Forgot password?
                  </button>
                  <Button type="submit" className="h-10 w-full rounded-md bg-[#f27055] text-base font-bold text-white shadow-none hover:bg-[#e7664b]" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                  <p className="pt-3 text-center text-sm text-[#344054]">
                    Don&apos;t have an account?{" "}
                    <button type="button" onClick={() => setActiveTab("register")} className="font-semibold text-[#155eef] hover:underline">
                      Sign up
                    </button>
                  </p>
                </form>

                <div className="mt-6 rounded-lg border border-[#d8dee6] bg-[#f8fafc] p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Demo accounts
                  </div>
                  <p className="mb-3 text-xs text-[#667085]">
                    Click to fill, then press Sign In. Run the seed function once if these don&apos;t exist yet.
                  </p>
                  <div className="space-y-2">
                    {[
                      { label: "Admin", email: "admin@guidement.demo", password: "Admin123!" },
                      { label: "Instructor", email: "instructor@guidement.demo", password: "Instructor123!" },
                    ].map((d) => (
                      <button
                        key={d.email}
                        type="button"
                        onClick={async () => {
                          setLoginEmail(d.email);
                          setLoginPassword(d.password);
                          try {
                            await supabase.functions.invoke("seed-demo-accounts");
                          } catch {
                            // ignore — seed is best-effort
                          }
                          toast.success(`${d.label} credentials filled`);
                        }}
                        className="flex w-full items-center justify-between rounded-md border border-[#d8dee6] bg-white px-3 py-2 text-left text-xs transition hover:bg-[#eef4ff]"
                      >
                        <span className="font-medium text-[#14213f]">{d.label}</span>
                        <span className="text-[#667085]">{d.email}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
