import styles from "./action-button.module.css";

export type ActionButtonVariant = "primary" | "secondary" | "quiet" | "danger";

type ActionButtonProps = {
  children: React.ReactNode;
  variant?: ActionButtonVariant;
  size?: "regular" | "compact";
  // Layout helpers (full width, wrapping) belong to the parent container per
  // plan §5.3; only the button's own skin is owned here.
  fullWidth?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  "aria-pressed"?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "data-rehabmind-test"?: string;
  id?: string;
};

const VARIANT_CLASS: Record<ActionButtonVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  quiet: styles.quiet,
  danger: styles.danger,
};

export function ActionButton({
  children,
  variant = "secondary",
  size = "regular",
  fullWidth = false,
  disabled = false,
  type = "button",
  onClick,
  id,
  ...aria
}: ActionButtonProps) {
  const classNames = [styles.actionButton, VARIANT_CLASS[variant]];
  if (size === "compact") classNames.push(styles.compact);
  if (fullWidth) classNames.push(styles.fullWidth);
  return (
    <button
      type={type}
      id={id}
      className={classNames.join(" ")}
      data-present="action-button"
      disabled={disabled}
      onClick={onClick}
      {...aria}
    >
      {children}
    </button>
  );
}
