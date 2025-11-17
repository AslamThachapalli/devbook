import { Tooltip } from "./Tooltip";

interface IconButtonProps {
    icon: React.ReactNode;
    onClick: () => void;
    hintText?: string;
    disabled?: boolean;
}

export function IconButton({
    icon,
    onClick,
    hintText,
    disabled = false,
}: IconButtonProps) {
    function button() {
        return (
            <button
                onClick={onClick}
                disabled={disabled}
                className={`p-1 rounded-md ${
                    disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-gray-200 cursor-pointer"
                }`}
            >
                {icon}
            </button>
        );
    }

    return hintText ? (
        <Tooltip content={hintText}>{button()}</Tooltip>
    ) : (
        button()
    );
}
