"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
};

export function SubmitButton({ children, className, pendingText, disabled }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`${className || ""} ${pending ? "cursor-wait opacity-70" : ""}`.trim()}
    >
      {pending ? pendingText || "Working..." : children}
    </button>
  );
}
