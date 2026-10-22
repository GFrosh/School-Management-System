import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import styles from './Field.module.css';

interface FieldShellProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
}

function FieldShell({ label, htmlFor, hint, error, children, required }: FieldShellProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
        {required ? <span className={styles.required} aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p className={styles.hint} id={`${htmlFor}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id, required, className, ...rest },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  const describedBy = [hint ? `${inputId}-hint` : '', error ? `${inputId}-error` : ''].filter(Boolean).join(' ');
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} required={required}>
      <input
        ref={ref}
        id={inputId}
        className={[styles.control, error ? styles.invalid : '', className ?? ''].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        aria-required={required || undefined}
        {...rest}
      />
    </FieldShell>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, id, required, className, children, ...rest },
  ref,
) {
  const generated = useId();
  const selectId = id ?? generated;
  const describedBy = [hint ? `${selectId}-hint` : '', error ? `${selectId}-error` : ''].filter(Boolean).join(' ');
  return (
    <FieldShell label={label} htmlFor={selectId} hint={hint} error={error} required={required}>
      <select
        ref={ref}
        id={selectId}
        className={[styles.control, styles.select, error ? styles.invalid : '', className ?? ''].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        aria-required={required || undefined}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, id, required, className, ...rest },
  ref,
) {
  const generated = useId();
  const areaId = id ?? generated;
  const describedBy = [hint ? `${areaId}-hint` : '', error ? `${areaId}-error` : ''].filter(Boolean).join(' ');
  return (
    <FieldShell label={label} htmlFor={areaId} hint={hint} error={error} required={required}>
      <textarea
        ref={ref}
        id={areaId}
        className={[styles.control, styles.textarea, error ? styles.invalid : '', className ?? ''].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        aria-required={required || undefined}
        {...rest}
      />
    </FieldShell>
  );
});

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hint, error, id, className, ...rest },
  ref,
) {
  const generated = useId();
  const boxId = id ?? generated;
  return (
    <div className={styles.field}>
      <div className={styles.checkRow}>
        <input
          ref={ref}
          type="checkbox"
          id={boxId}
          className={[styles.checkbox, className ?? ''].filter(Boolean).join(' ')}
          aria-describedby={error ? `${boxId}-error` : hint ? `${boxId}-hint` : undefined}
          {...rest}
        />
        <label className={styles.checkLabel} htmlFor={boxId}>
          {label}
        </label>
      </div>
      {hint && !error ? (
        <p className={styles.hint} id={`${boxId}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={`${boxId}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
