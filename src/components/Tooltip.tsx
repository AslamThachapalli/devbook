import { useState, useRef, useEffect } from "react";

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({
    content,
    children,
    position = "bottom",
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, 1000);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsVisible(false);
    };

    const positionClasses = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
        left: "right-full top-1/2 -translate-y-1/2 mr-2",
        right: "left-full top-1/2 -translate-y-1/2 ml-2",
    };

    const arrowClasses = {
        top: "top-full left-1/2 -translate-x-1/2 border-t-gray-500/80 border-l-transparent border-r-transparent border-b-transparent",
        bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-gray-500/80 border-l-transparent border-r-transparent border-t-transparent",
        left: "left-full top-1/2 -translate-y-1/2 border-l-gray-500/80 border-t-transparent border-b-transparent border-r-transparent",
        right: "right-full top-1/2 -translate-y-1/2 border-r-gray-500/80 border-t-transparent border-b-transparent border-l-transparent",
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {isVisible && (
                <div
                    className={`absolute z-50 ${positionClasses[position]} whitespace-nowrap`}
                >
                    <div className="bg-gray-500/80 text-white text-xs px-2 py-1 rounded shadow-lg">
                        {content}
                    </div>
                    <div
                        className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
                    />
                </div>
            )}
        </div>
    );
}
