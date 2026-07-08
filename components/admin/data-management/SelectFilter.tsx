export function SelectFilter({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: [string, string][];
    onChange: (value: string) => void;
}) {
    return (
        <label className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm">
            <span className="font-semibold text-gray-700">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="bg-transparent text-sm font-medium outline-none"
            >
                {options.map(([optionValue, optionLabel]) => (
                    <option key={optionValue} value={optionValue}>
                        {optionLabel}
                    </option>
                ))}
            </select>
        </label>
    );
}
