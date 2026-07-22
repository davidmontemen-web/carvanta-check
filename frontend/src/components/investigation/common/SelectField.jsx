function SelectField({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      >
        {options.map(([optionValue, text]) => (
          <option
            key={`${optionValue}-${text}`}
            value={optionValue}
          >
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

export default SelectField;
