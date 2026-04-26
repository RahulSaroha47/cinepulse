"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type FieldErrors = { email?: string; password?: string; general?: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors]     = useState<FieldErrors>({});
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message: string = data.message || "Login failed. Please try again.";

        // 401 = wrong credentials
        if (res.status === 401) {
          if (message.toLowerCase().includes("no account")) {
            setErrors({ email: "No account found with this email." });
          } else {
            setErrors({ password: "Incorrect password." });
          }
        } else if (res.status === 400) {
          if (message.toLowerCase().includes("email")) {
            setErrors({ email: message });
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
      <div className="mb-10">
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
          WELCOME<br />BACK
        </h1>
        <p className="mt-2 font-body text-base font-light text-white/45">
          Sign in to continue your journey
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        <Field label="Password" error={errors.password}>
          <InputIcon icon="lock" />
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
            required
            className={inputCls(!!errors.password)}
          />
        </Field>

        {errors.general && (
          <p className="font-code text-[10px] tracking-wide text-cp-red">{errors.general}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="relative mt-1 w-full overflow-hidden rounded-md bg-cp-red py-3.25 font-heading text-base tracking-[0.12em] text-white transition-colors hover:bg-[#cf2f3b] disabled:opacity-60"
        >
          <span className="relative z-10">{loading ? "SIGNING IN…" : "SIGN IN"}</span>
          <div className="absolute inset-0 bg-linear-to-br from-white/8 to-transparent" />
        </button>
      </form>

      <p className="mt-6 text-center font-body text-[0.9rem] text-white/35">
        New to CinePulse?{" "}
        <Link href="/signup" className="font-medium text-cp-gold hover:underline">
          Create an account
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
    </span>
  );
}

const inputCls = (hasError: boolean) =>
  `w-full rounded-[6px] border ${hasError ? "border-cp-red/60 bg-cp-red/[0.04]" : "border-white/[0.08] bg-white/[0.04]"} py-[11px] pl-[38px] pr-[14px] font-body text-[1.05rem] text-cp-text placeholder:text-white/15 outline-none transition-colors focus:border-cp-red/50 focus:bg-cp-red/[0.04]`;
