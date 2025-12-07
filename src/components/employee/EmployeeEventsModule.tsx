import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cake, Award, Trophy, PartyPopper, CalendarHeart, Heart } from "lucide-react";
import { EventsList } from "./EventsList";
import { OrgAnnouncements } from "./OrgAnnouncements";
import { useUnreadEventCounts } from "@/hooks/useUnreadEventCounts";
import { Badge } from "@/components/ui/badge";

export function EmployeeEventsModule() {
  const { birthdayCount, anniversaryCount, orgEventCount, achievementCount, performanceCount } = useUnreadEventCounts();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
          <PartyPopper className="w-6 h-6 text-pink-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Events & Recognition</h1>
          <p className="text-muted-foreground">Birthdays, anniversaries, celebrations & peer appreciation</p>
        </div>
      </div>

      <Tabs defaultValue="birthdays" className="space-y-6">
        <TabsList className="grid w-full max-w-4xl grid-cols-6">
          <TabsTrigger value="birthdays" className="flex items-center gap-2 relative">
            <Cake className="w-4 h-4" />
            <span className="hidden sm:inline">Birthdays</span>
            {birthdayCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {birthdayCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="anniversaries" className="flex items-center gap-2 relative">
            <CalendarHeart className="w-4 h-4" />
            <span className="hidden sm:inline">Anniversaries</span>
            {anniversaryCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {anniversaryCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="org-events" className="flex items-center gap-2 relative">
            <PartyPopper className="w-4 h-4" />
            <span className="hidden sm:inline">Events</span>
            {orgEventCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {orgEventCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2 relative">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Achievements</span>
            {achievementCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {achievementCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2 relative">
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Performance</span>
            {performanceCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {performanceCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="appreciation" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Appreciation</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="birthdays">
          <EventsList eventType="birthday" title="Upcoming Birthdays" icon={Cake} color="text-pink-500" />
        </TabsContent>

        <TabsContent value="anniversaries">
          <EventsList eventType="anniversary" title="Work Anniversaries" icon={CalendarHeart} color="text-purple-500" />
        </TabsContent>

        <TabsContent value="org-events">
          <OrgAnnouncements eventType="org_event" title="Organization Events" icon={PartyPopper} color="text-blue-500" />
        </TabsContent>

        <TabsContent value="achievements">
          <OrgAnnouncements eventType="achievement" title="Team Achievements" icon={Trophy} color="text-amber-500" />
        </TabsContent>

        <TabsContent value="performance">
          <OrgAnnouncements eventType="performance" title="Exceptional Performances" icon={Award} color="text-green-500" />
        </TabsContent>

        <TabsContent value="appreciation">
          <OrgAnnouncements eventType="appreciation" title="Peer Appreciation" icon={Heart} color="text-rose-500" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
