export function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none">
      <rect width="32" height="32" rx="8" fill="#25D366" />
      <path
        d="M8.2 23.9 9.4 20A9.2 9.2 0 1 1 12 22.7l-3.8 1.2Z"
        fill="white"
      />
      <path
        d="M12.4 10.9c.3-.3.7-.3 1-.1l1.3 1c.3.2.4.6.2.9l-.7 1.1c.8 1.6 2 2.8 3.6 3.6l1.1-.7c.3-.2.7-.1.9.2l1 1.3c.2.3.2.7-.1 1-1 1-2.4 1.2-3.7.6-2.2-1-4-2.8-5-5-.6-1.3-.4-2.7.4-3.9Z"
        fill="#25D366"
      />
    </svg>
  );
}
