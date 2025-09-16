import React from "react";
import { InputProps } from "./Input.props";

const Input: React.FC<InputProps> = ({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  size = "medium",
  className = "",
  name,
  id,
}) => {
  const baseClasses =
    "block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500";

  const sizeClasses = {
    small: "px-3 py-1.5 text-sm",
    medium: "px-3 py-2 text-sm",
    large: "px-4 py-3 text-base",
  };

  const errorClasses = error
    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
    : "";

  const inputClasses = `${baseClasses} ${sizeClasses[size]} ${errorClasses} ${className}`;

  const inputId =
    id || name || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <input
        id={inputId}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={inputClasses}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default Input;
