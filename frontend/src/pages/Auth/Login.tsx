import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import * as z from "zod";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { loginAdmin } from "../../api/authApi";
import { useAuthStore } from "../../store/authStore";

const loginSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginFormData = z.infer<typeof loginSchema>;

function Login() {
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoginError("");
    setIsLoading(true);

    try {
      const response = await loginAdmin(data);
      console.log("Login successful", response.data);

      useAuthStore.getState().login(response.data.token, response.data.user);
      navigate("/");
    } catch (err: any) {
      console.error("Login failed", err);
      const errorMsg =
        err.response?.data?.message || "Invalid email or password";
      setLoginError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-slate-950">
      {/* Dynamic Multicolor Background Layers */}
      {/* Glowing Orb 1: Violet & Indigo (Top Left) */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-800 opacity-60 blur-[130px] animate-pulse" />

      {/* Glowing Orb 2: Fuchsia & Rose Pink (Top Right) */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-[550px] w-[550px] rounded-full bg-gradient-to-bl from-pink-500 via-rose-500 to-fuchsia-700 opacity-55 blur-[140px]" />

      {/* Glowing Orb 3: Radiant Amber & Coral (Bottom Left) */}
      <div className="pointer-events-none absolute -bottom-36 -left-28 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-600 opacity-45 blur-[130px]" />

      {/* Glowing Orb 4: Cyan, Teal & Electric Blue (Bottom Right) */}
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[520px] w-[520px] rounded-full bg-gradient-to-tl from-cyan-400 via-teal-500 to-blue-600 opacity-55 blur-[130px]" />

      {/* Glowing Orb 5: Center Ambient Magenta Accent */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[420px] rounded-full bg-gradient-to-r from-fuchsia-600/40 via-purple-600/40 to-indigo-600/40 blur-[110px]" />

      {/* Subtle Matrix Dot Texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Pure Glassmorphic Form Card */}
      <div className="relative w-full max-w-md rounded-3xl backdrop-blur-2xl bg-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-white/20 p-8 sm:p-10 z-10 overflow-hidden">
        {/* Top Multicolor Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-rose-500 via-purple-500 via-indigo-500 to-cyan-400 opacity-90" />

        {/* Card Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-500/80 via-purple-500/80 to-pink-500/80 backdrop-blur-md border border-white/30 text-white shadow-[0_8px_20px_rgba(168,85,247,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)]">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-white/90 shadow-sm">

            <span>EMS Portal Access</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-3 drop-shadow-sm">
            Welcome Back
          </h2>
          <p className="text-sm text-slate-200/80 mt-1 mb-7">
            Enter your credentials to access your dashboard
          </p>
        </div>

        {/* Login Form */}
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          {/* Email Field */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-white/90 tracking-wide">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                {...register("email")}
                placeholder="admin@gmail.com"
                className={`h-11 pl-9 pr-3 rounded-xl border border-white/15 bg-white/[0.07] backdrop-blur-md text-white placeholder:text-white/40 focus-visible:bg-white/[0.12] focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-purple-400/40 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] ${errors.email ? "border-rose-400 focus-visible:ring-rose-400" : ""
                  }`}
              />
            </div>
            {errors.email && (
              <p className="text-rose-300 text-xs mt-1 font-medium">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-white/90 tracking-wide">
              Password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={`h-11 pl-9 pr-10 rounded-xl border border-white/15 bg-white/[0.07] backdrop-blur-md text-white placeholder:text-white/40 focus-visible:bg-white/[0.12] focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-purple-400/40 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] ${errors.password ? "border-rose-400 focus-visible:ring-rose-400" : ""
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-rose-300 text-xs mt-1 font-medium">{errors.password.message}</p>
            )}
          </div>

          {/* Error Banner */}
          {loginError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/20 backdrop-blur-md p-3 text-center text-xs font-medium text-rose-200">
              {loginError}
            </div>
          )}

          {/* Glassmorphic Gradient Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600/90 via-purple-600/90 to-pink-600/90 hover:from-violet-500 hover:via-purple-500 hover:to-pink-500 border border-white/25 backdrop-blur-md shadow-[0_6px_25px_rgba(168,85,247,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_8px_30px_rgba(168,85,247,0.5)] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>


      </div>
    </div>
  );
}

export default Login;
