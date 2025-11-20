import React, { useEffect, useRef, useState } from "react";

export interface MenuItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
}

interface MenuProps<T extends HTMLElement = HTMLElement> {
    items: MenuItem[];
    onClose: () => void;
    anchorRef: React.RefObject<T | null>;
}

export function Menu<T extends HTMLElement = HTMLElement>({
    items,
    onClose,
    anchorRef,
}: MenuProps<T>) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number }>({
        top: 0,
        left: 0,
    });

    useEffect(() => {
        if (!anchorRef.current || !menuRef.current) return;

        const anchorRect = anchorRef.current.getBoundingClientRect();
        const menuRect = menuRef.current.getBoundingClientRect();

        // Position menu below the anchor, aligned to the right
        let top = anchorRect.bottom + 4;
        let left = anchorRect.right - menuRect.width;

        // Adjust if menu would go off screen
        if (left < 8) {
            left = anchorRect.left;
        }
        if (top + menuRect.height > window.innerHeight - 8) {
            top = anchorRect.top - menuRect.height - 4;
        }

        setPosition({ top, left });
    }, [anchorRef]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                anchorRef.current &&
                !anchorRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        }

        function handleEscape(e: KeyboardEvent) {
            if (e.key === "Escape") {
                onClose();
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("keydown", handleEscape);
        };
    }, [onClose, anchorRef]);

    return (
        <div
            ref={menuRef}
            className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[160px]"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
            }}
        >
            {items.map((item) => (
                <button
                    key={item.id}
                    onClick={() => {
                        if (!item.disabled) {
                            item.onClick();
                            onClose();
                        }
                    }}
                    disabled={item.disabled}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                        item.disabled
                            ? "text-gray-400 cursor-not-allowed"
                            : item.danger
                            ? "text-red-600 hover:bg-red-50"
                            : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                    {item.icon && <span className="w-4">{item.icon}</span>}
                    <span>{item.label}</span>
                </button>
            ))}
        </div>
    );
}
