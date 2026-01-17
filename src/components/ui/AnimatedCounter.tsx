import { useEffect, useState, useRef } from "react";

interface AnimatedCounterProps {
  value: string;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ value, duration = 1500, className = "" }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState("0");
  const hasAnimated = useRef(false);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (hasAnimated.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          animateValue();
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [value, duration]);

  const animateValue = () => {
    // Extract numeric part and suffix
    const match = value.match(/^([\d,.]+)(.*)$/);
    if (!match) {
      setDisplayValue(value);
      return;
    }

    const numericPart = match[1].replace(/,/g, "");
    const suffix = match[2] || "";
    const targetNumber = parseFloat(numericPart);
    const hasDecimal = numericPart.includes(".");
    const decimalPlaces = hasDecimal ? (numericPart.split(".")[1]?.length || 0) : 0;

    const startTime = performance.now();

    const updateValue = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);
      const currentValue = targetNumber * easeOutExpo;

      let formattedValue: string;
      if (hasDecimal) {
        formattedValue = currentValue.toFixed(decimalPlaces);
      } else {
        formattedValue = Math.floor(currentValue).toLocaleString();
      }

      setDisplayValue(formattedValue + suffix);

      if (progress < 1) {
        requestAnimationFrame(updateValue);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(updateValue);
  };

  return (
    <span ref={elementRef} className={className}>
      {displayValue}
    </span>
  );
}
