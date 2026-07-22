"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-[9px] border border-line bg-app px-3 py-2 pr-10 text-sm text-ink outline-none focus:border-blue";

export function PasswordField({
  name,
  label,
  autoComplete,
  placeholder,
  minLength,
  required = true,
}: {
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  minLength?: number;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink2">{label}</span>
      <div className="relative">
        <input
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 border-none bg-transparent p-1 text-ink3 hover:text-ink2"
          style={{ cursor: "pointer" }}
        >
          <i className={`ti ${visible ? "ti-eye-off" : "ti-eye"}`} style={{ fontSize: 16 }} />
        </button>
      </div>
    </label>
  );
}
