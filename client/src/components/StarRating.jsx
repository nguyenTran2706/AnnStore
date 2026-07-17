/* Star display + interactive star input. Stars are yellow-500 with an
   accessible text alternative alongside wherever they appear. */

function Star({ filled, className = 'w-4 h-4' }) {
  return (
    <svg
      className={`${className} ${filled ? 'text-yellow-500' : 'text-border'}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function Stars({ value, className = 'w-4 h-4' }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} filled={i <= rounded} className={className} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i !== 1 ? 's' : ''}`}
          onClick={() => onChange(i)}
          className="p-0.5 transition-transform hover:scale-110 active:scale-95"
        >
          <Star filled={i <= value} className="w-7 h-7" />
        </button>
      ))}
      {value > 0 && (
        <span className="text-sm text-ink-light ml-1.5">
          {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][value]}
        </span>
      )}
    </div>
  );
}
