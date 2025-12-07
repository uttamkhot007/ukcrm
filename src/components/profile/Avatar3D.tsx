import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Avatar3DProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showHoverEffect?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-lg",
  xl: "w-24 h-24 text-2xl",
};

const gradients = [
  "from-violet-500 to-purple-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-pink-500 to-rose-500",
  "from-indigo-500 to-blue-500",
  "from-red-500 to-orange-500",
  "from-green-500 to-emerald-500",
];

export function Avatar3D({ name, avatarUrl, size = "md", className, showHoverEffect = true }: Avatar3DProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get consistent gradient based on name
  const gradientIndex = name ? name.charCodeAt(0) % gradients.length : 0;
  const gradient = gradients[gradientIndex];

  // Get initials
  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const showImage = avatarUrl && !imageError;

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden transition-all duration-500",
        sizeClasses[size],
        showHoverEffect && "hover:scale-110 cursor-pointer",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: isHovered && showHoverEffect
          ? "perspective(500px) rotateY(15deg) rotateX(-5deg) scale(1.1)"
          : "perspective(500px) rotateY(0deg) rotateX(0deg) scale(1)",
        transformStyle: "preserve-3d",
      }}
    >
      {/* 3D Shadow Layer */}
      <div
        className={cn(
          "absolute inset-0 rounded-full bg-black/20 blur-sm transition-all duration-500",
          isHovered ? "translate-x-2 translate-y-2" : "translate-x-0 translate-y-0"
        )}
      />

      {/* Main Avatar */}
      <div
        className={cn(
          "relative w-full h-full rounded-full flex items-center justify-center font-bold text-white",
          "shadow-lg transition-shadow duration-500",
          isHovered && "shadow-2xl",
          !showImage && `bg-gradient-to-br ${gradient}`
        )}
      >
        {showImage ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="drop-shadow-lg">{getInitials(name)}</span>
        )}

        {/* Gloss Effect */}
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent",
            "pointer-events-none transition-opacity duration-500",
            isHovered ? "opacity-60" : "opacity-40"
          )}
        />

        {/* Ring Effect on Hover */}
        {showHoverEffect && (
          <div
            className={cn(
              "absolute -inset-1 rounded-full border-2 transition-all duration-500",
              isHovered
                ? "border-primary/50 scale-110 opacity-100"
                : "border-transparent scale-100 opacity-0"
            )}
          />
        )}
      </div>
    </div>
  );
}