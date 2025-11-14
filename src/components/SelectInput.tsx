interface Options {
    value: string;
    label: string;
}

interface SelectInputProps {
    options: Options[];
    value: string;
    onChange: (value: string) => void;
}

export function SelectInput({ options, value, onChange }: SelectInputProps) {
    return (
        <select
            className="cursor-pointer"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
