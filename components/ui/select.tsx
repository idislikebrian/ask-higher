"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { useId } from "react";

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectProps = {
  id?: string;
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  ariaLabel?: string;
  description?: string;
  error?: boolean | string;
  disabled?: boolean;
};

export function Select({
  id,
  name,
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  label,
  ariaLabel,
  description,
  error,
  disabled = false,
}: SelectProps) {
  const generatedId = useId();
  const controlId = id || `select-${generatedId}`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error && typeof error === "string" ? `${controlId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`ui-select ${error ? "ui-select-error" : ""}`}>
      {label && <label className="ui-select-label" htmlFor={controlId}>{label}</label>}
      {description && <p className="ui-select-description" id={descriptionId}>{description}</p>}
      <SelectPrimitive.Root value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          className="ui-select-trigger"
          id={controlId}
          aria-label={label ? undefined : ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <span className="ui-select-chevron" aria-hidden="true">⌄</span>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content className="ui-select-content" position="popper" sideOffset={8}>
            <SelectPrimitive.Viewport className="ui-select-viewport">
              {options.map((option) => (
                <SelectPrimitive.Item className="ui-select-item" key={option.value} value={option.value}>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="ui-select-indicator" aria-hidden="true">✓</SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {name && <input type="hidden" name={name} value={value} readOnly />}
      {error && typeof error === "string" && <p className="ui-select-error-message" id={errorId}>{error}</p>}
    </div>
  );
}
