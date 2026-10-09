'use client';

/** Each digit is a vertical strip 0–9 that rolls to its value. */
export default function Odometer({ value, className = '' }: { value: string; className?: string }) {
  const chars = value.split('');
  return (
    <span className={`odo ${className}`} aria-label={value} role="img">
      {chars.map((c, i) => {
        const key = chars.length - i; // keyed from the right so columns stay stable
        if (!/\d/.test(c))
          return (
            <span key={`s${key}`} className="odo-sym" aria-hidden="true">
              {c}
            </span>
          );
        return (
          <span key={`d${key}`} className="odo-col" aria-hidden="true">
            <span className="odo-strip" style={{ transform: `translate3d(0, ${-Number(c) * 10}%, 0)` }}>
              {'0123456789'.split('').map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
