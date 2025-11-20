import React from "react";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children: React.ReactNode;
}

export function Button({
    variant = "primary",
    size = "md",
    children,
    className = "",
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles =
        "font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantStyles = {
        primary: "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500",
        secondary:
            "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500",
    };

    const sizeStyles = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
    };

    const combinedClassName =
        `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim();

    return (
        <button className={combinedClassName} disabled={disabled} {...props}>
            {children}
        </button>
    );
}
