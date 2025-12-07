import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar3D } from "./Avatar3D";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Building2, Briefcase } from "lucide-react";

interface ProfileCard3DProps {
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url?: string | null;
    department?: string | null;
    job_title?: string | null;
    location?: string | null;
    phone?: string | null;
  };
  className?: string;
  onClick?: () => void;
}

export function ProfileCard3D({ profile, className, onClick }: ProfileCard3DProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePosition({ x, y });
  };

  const transform = isHovered
    ? `perspective(1000px) rotateY(${mousePosition.x * 20}deg) rotateX(${-mousePosition.y * 20}deg) scale(1.02)`
    : "perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)";

  return (
    <div
      className={cn(
        "group relative bg-card border border-border rounded-2xl p-6 cursor-pointer",
        "transition-all duration-500 ease-out",
        "hover:shadow-2xl hover:shadow-primary/20",
        className
      )}
      style={{
        transform,
        transformStyle: "preserve-3d",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePosition({ x: 0, y: 0 });
      }}
      onMouseMove={handleMouseMove}
      onClick={onClick}
    >
      {/* Gradient Background Effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500",
          "bg-gradient-to-br from-primary/10 via-transparent to-primary/5",
          isHovered && "opacity-100"
        )}
      />

      {/* Floating Particles */}
      {isHovered && (
        <>
          <div className="absolute top-4 right-4 w-2 h-2 bg-primary/50 rounded-full animate-ping" />
          <div className="absolute bottom-4 left-4 w-1.5 h-1.5 bg-primary/30 rounded-full animate-pulse" />
          <div className="absolute top-1/2 right-8 w-1 h-1 bg-primary/40 rounded-full animate-bounce" />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-4">
        {/* Avatar */}
        <div
          style={{
            transform: isHovered ? "translateZ(40px)" : "translateZ(0)",
            transition: "transform 0.5s ease-out",
          }}
        >
          <Avatar3D
            name={profile.full_name || "User"}
            avatarUrl={profile.avatar_url}
            size="xl"
            showHoverEffect={false}
          />
        </div>

        {/* Name & Title */}
        <div
          style={{
            transform: isHovered ? "translateZ(30px)" : "translateZ(0)",
            transition: "transform 0.5s ease-out",
          }}
        >
          <h3 className="text-lg font-semibold text-foreground">
            {profile.full_name || "Unknown User"}
          </h3>
          {profile.job_title && (
            <p className="text-sm text-muted-foreground">{profile.job_title}</p>
          )}
        </div>

        {/* Department Badge */}
        {profile.department && (
          <div
            style={{
              transform: isHovered ? "translateZ(20px)" : "translateZ(0)",
              transition: "transform 0.5s ease-out",
            }}
          >
            <Badge variant="secondary" className="gap-1">
              <Building2 className="w-3 h-3" />
              {profile.department}
            </Badge>
          </div>
        )}

        {/* Contact Info - Shows on Hover */}
        <div
          className={cn(
            "w-full space-y-2 overflow-hidden transition-all duration-500",
            isHovered ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
          )}
          style={{
            transform: isHovered ? "translateZ(10px)" : "translateZ(0)",
          }}
        >
          {profile.email && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Mail className="w-3 h-3" />
              <span className="truncate">{profile.email}</span>
            </div>
          )}
          {profile.location && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{profile.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3D Edge Highlight */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-500",
          "bg-gradient-to-br from-white/10 via-transparent to-black/10",
          isHovered ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}