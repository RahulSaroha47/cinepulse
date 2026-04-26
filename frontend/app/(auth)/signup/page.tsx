"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function getStrength(password: string): { level: number; label: string } {
  if (password.length === 0) return { level: 0, label: "" };
  if (password.length < 6)   return { level: 1, label: "Too short" };
  if (password.length < 8)   return { level: 2, label: "Weak" };
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return { level: 4, label: "Strong" };
  return { level: 3, label: "Fair" };
}

const strengthColors = ["", "#e63946", "#f4c430", "#f4c430", "#22c55e"];

type FieldErrors = { username?: string; email?: string; password?: string; general?: string };

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors]     = useState<FieldErrors>({});
  const [loading, setLoading]   = useState(false);

  const strength = getStrength(password);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message: string = data.message || "Signup failed. Please try again.";

        // Map HTTP status + message to the right field
        if (res.status === 409) {
          if (message.toLowerCase().includes("email")) {
            setErrors({ email: "This email is already registered." });
          } else if (message.toLowerCase().includes("username")) {
            setErrors({ username: "This username is already taken." });
          }
        } else if (res.status === 400) {
          // @Valid field errors from backend
          if (message.toLowerCase().includes("email")) {
            setErrors({ email: message });
          } else if (message.toLowerCase().includes("password")) {
            setErrors({ password: message });
          } else {
            setErrors({ general: message });
          }
        } else {
          setErrors({ general: message });
        }
        return;
      }

      const data = await res.json();
      localStorage.setItem("cp_token", data.token);
      localStorage.setItem("cp_user", JSON.stringify({ username: data.username, email: data.email }));
      router.push("/dashboard");
    } catch {
      setErrors({ general: "Could not connect to server. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative z-10 flex flex-col">
      {/* Brand */}
      <div className="mb-8">
        <p className="font-heading text-[1.75rem] tracking-widest leading-none">
          CINE<span className="text-cp-red">PULSE</span>
        </p>
        <p className="mt-1 font-body text-[0.8rem] font-light italic tracking-[0.2em] text-white/30">
          Where every frame lives forever
        </p>
      </div>

      {/* Heading */}
      <div className="mb-7">
        <h1 className="font-heading text-[2.25rem] leading-none tracking-wide">
          JOIN THE<br />COMMUNITY
        </h1>
        <p className="mt-2 font-body text-base font-light text-white/45">
          Track, rate, and discover films
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Username" error={errors.username}>
          <InputIcon icon="user" />
          <input
            type="text"
            placeholder="cinephile_42"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setErrors(p => ({ ...p, username: undefined })); }}
            required
            className={inputCls(!!errors.username)}
          />
        </Field>

        <Field label="Email Address" error={errors.email}>
          <InputIcon icon="mail" />
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
            required
            className={inputCls(!!errors.email)}
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <label className="font-code text-[10px] uppercase tracking-[0.15em] text-white/35">
            Password
          </label>
          <div className="relative">
            <InputIcon icon="lock" />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
              required
              className={inputCls(!!errors.password)}
            />
          </div>
          {errors.password && (
            <p className="font-code text-[10px] tracking-wide text-cp-red">{errors.password}</p>
          )}
          {strength.level > 0 && !errors.password && (
            <div className="mt-1 flex items-center gap-3">
              <div className="flex flex-1 gap-0.75">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="h-0.5 flex-1 rounded-full transition-all duration-300"
                    style={{ background: i <= strength.level ? strengthColors[strength.level] : "rgba(255,255,255,0.1)" }}
                  />
                ))}
              </div>
              <span className="font-code text-[10px] tracking-wide" style={{ color: strengthColors[strength.level] }}>
                {strength.label}
              </span>
            </div>
          )}
        </div>

        {errors.general && (
          <p className="font-code text-[10px] tracking-wide text-cp-red">{errors.general}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="relative mt-1 w-full overflow-hidden rounded-md bg-cp-red py-3.25 font-heading text-base tracking-[0.12em] text-white transition-colors hover:bg-[#cf2f3b] disabled:opacity-60"
        >
          <span className="relative z-10">{loading ? "CREATING…" : "CREATE ACCOUNT"}</span>
          <div className="absolute inset-0 bg-linear-to-br from-white/8 to-transparent" />
        </button>
      </form>

      <p className="mt-6 text-center font-body text-[0.9rem] text-white/35">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-cp-gold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

/* ── Shared sub-components ── */

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-code text-[10px] uppercase tracking-[0.15em] text-white/35">
        {label}
      </label>
      <div className="relative">{children}</div>
      {error && (
        <p className="font-code text-[10px] tracking-wide text-cp-red">{error}</p>
      )}
    </div>
  );
}

function InputIcon({ icon }: { icon: "mail" | "lock" | "user" }) {
  return (
    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
      {icon === "mail" && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      )}
      {icon === "lock" && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      )}
      {icon === "user" && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      )}
    </span>
  );
}

const inputCls = (hasError: boolean) =>
  `w-full rounded-[6px] border ${hasError ? "border-cp-red/60 bg-cp-red/[0.04]" : "border-white/[0.08] bg-white/[0.04]"} py-[11px] pl-[38px] pr-[14px] font-body text-[1.05rem] text-cp-text placeholder:text-white/15 outline-none transition-colors focus:border-cp-red/50 focus:bg-cp-red/[0.04]`;
