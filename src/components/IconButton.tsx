import { Tooltip } from "./Tooltip";

interface IconButtonProps {
    icon: React.ReactNode;
    onClick: () => void;
    hintText?: string;
}

export function IconButton({ icon, onClick, hintText }: IconButtonProps) {
    function button() {
        return (
            <button
                onClick={onClick}
                className="p-1 rounded-md hover:bg-gray-200 cursor-pointer"
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
