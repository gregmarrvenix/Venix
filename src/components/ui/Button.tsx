"use client";

interface ButtonProps {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  children,
  onClick,
  type = "button",
  className = "",
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:brightness-110",
    secondary: "bg-slate-700 text-slate-200 hover:bg-slate-600",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20",
    ghost: "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
