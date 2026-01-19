import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Building2, Mail, Star } from "lucide-react";

interface ProjectTeamProps {
  projectId: string;
  stakeholders: any[];
}

export function ProjectTeam({ projectId, stakeholders }: ProjectTeamProps) {
  const internalTeam = stakeholders.filter(s => s.stakeholder_type === "internal");
  const customerTeam = stakeholders.filter(s => s.stakeholder_type === "customer");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (stakeholders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
        <Users className="h-8 w-8 mx-auto mb-2" />
        <p>No team members assigned yet</p>
        <p className="text-sm">Team members will appear here once added to the project</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Internal Team */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Internal Team
            <Badge variant="secondary" className="ml-auto">{internalTeam.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {internalTeam.map((member) => (
              <div 
                key={member.id} 
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm truncate">{member.name}</h4>
                    {member.is_primary && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                  {member.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {member.designation || "Team Member"}
                </Badge>
              </div>
            ))}
            {internalTeam.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No internal team members assigned
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer Stakeholders */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Customer Stakeholders
            <Badge variant="secondary" className="ml-auto">{customerTeam.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {customerTeam.map((member) => (
              <div 
                key={member.id} 
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Avatar>
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm truncate">{member.name}</h4>
                    {member.is_primary && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                  {member.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {member.designation || "Stakeholder"}
                </Badge>
              </div>
            ))}
            {customerTeam.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No customer stakeholders assigned
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
