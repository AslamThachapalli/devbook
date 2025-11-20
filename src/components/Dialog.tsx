import React, { useEffect } from "react";
import { X } from "lucide-react";

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function Dialog({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = "md",
}: DialogProps) {
    useEffect(() => {
        if (isOpen) {
            // Prevent body scroll when dialog is open
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    useEffect(() => {
        function handleEscape(e: KeyboardEvent) {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        }

        window.addEventListener("keydown", handleEscape);
        return () => {
            window.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const maxWidthClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={(e) => {
                // Close on backdrop click
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className={`bg-white rounded-lg shadow-lg w-full ${maxWidthClasses[maxWidth]} mx-4`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close dialog"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
}
