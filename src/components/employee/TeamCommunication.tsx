import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Phone, Video, Monitor, PhoneOff, Mic, MicOff, VideoOff,
  Camera, Search, Users, Clock, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Employee {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
  job_title?: string | null;
  department?: string | null;
}

export function TeamCommunication() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('team');
  
  const {
    localStream,
    remoteStream,
    currentCall,
    incomingCall,
    isConnecting,
    isMuted,
    isVideoOff,
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    setLocalVideoRef,
    setRemoteVideoRef
  } = useWebRTC();
  
  // Fetch team members
  const { data: employees = [] } = useQuery({
    queryKey: ['team-members', currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url, job_title, department')
        .eq('tenant_id', currentTenant?.id)
        .neq('user_id', user?.id);
      
      if (error) throw error;
      return (data || []) as Employee[];
    },
    enabled: !!currentTenant?.id && !!user?.id
  });
  
  // Fetch call history
  const { data: callHistory = [] } = useQuery({
    queryKey: ['call-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_calls')
        .select(`
          *,
          caller:profiles!video_calls_caller_id_fkey(full_name, avatar_url),
          callee:profiles!video_calls_callee_id_fkey(full_name, avatar_url)
        `)
        .or(`caller_id.eq.${user?.id},callee_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });
  
  const filteredEmployees = employees.filter(emp =>
    emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const getInitials = (name: string | null) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };
  
  const handleStartCall = (employeeId: string, type: 'video' | 'voice' | 'screen_share') => {
    startCall(employeeId, type);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Video className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Team Communication</h1>
            <p className="text-sm text-muted-foreground">Video calls, voice calls & screen sharing</p>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Team Online</p>
              <p className="text-xl font-bold">{employees.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Video className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Video Calls</p>
              <p className="text-xl font-bold">
                {callHistory.filter(c => c.call_type === 'video').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Phone className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Voice Calls</p>
              <p className="text-xl font-bold">
                {callHistory.filter(c => c.call_type === 'voice').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Monitor className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Screen Shares</p>
              <p className="text-xl font-bold">
                {callHistory.filter(c => c.call_type === 'screen_share').length}
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 md:px-6 border-b">
          <TabsList className="h-auto p-0 bg-transparent">
            <TabsTrigger value="team" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Team Members
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Call History
            </TabsTrigger>
          </TabsList>
        </div>
        
        <ScrollArea className="flex-1">
          {/* Team Members Tab */}
          <TabsContent value="team" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((employee) => (
                <Card key={employee.user_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={employee.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(employee.full_name || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{employee.full_name || 'Unknown'}</h3>
                        <p className="text-sm text-muted-foreground truncate">{employee.job_title}</p>
                        <p className="text-xs text-muted-foreground">{employee.department}</p>
                      </div>
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                        Online
                      </Badge>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1"
                        onClick={() => handleStartCall(employee.user_id, 'voice')}
                        disabled={!!currentCall || isConnecting}
                      >
                        <Phone className="w-3 h-3" />
                        Voice
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1"
                        onClick={() => handleStartCall(employee.user_id, 'video')}
                        disabled={!!currentCall || isConnecting}
                      >
                        <Video className="w-3 h-3" />
                        Video
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1"
                        onClick={() => handleStartCall(employee.user_id, 'screen_share')}
                        disabled={!!currentCall || isConnecting}
                      >
                        <Monitor className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredEmployees.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No team members found</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Call History Tab */}
          <TabsContent value="history" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="space-y-3">
              {callHistory.map((call: any) => {
                const isOutgoing = call.caller_id === user?.id;
                const otherPerson = isOutgoing ? call.callee : call.caller;
                
                return (
                  <Card key={call.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={otherPerson?.avatar_url} />
                          <AvatarFallback className="bg-muted">
                            {getInitials(otherPerson?.full_name || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{otherPerson?.full_name}</h4>
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              call.status === 'ended' && "bg-gray-500/10 text-gray-600",
                              call.status === 'missed' && "bg-red-500/10 text-red-600",
                              call.status === 'declined' && "bg-orange-500/10 text-orange-600"
                            )}>
                              {call.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {call.call_type === 'video' && <Video className="w-3 h-3" />}
                              {call.call_type === 'voice' && <Phone className="w-3 h-3" />}
                              {call.call_type === 'screen_share' && <Monitor className="w-3 h-3" />}
                              {isOutgoing ? 'Outgoing' : 'Incoming'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(call.created_at), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartCall(
                            isOutgoing ? call.callee_id : call.caller_id,
                            call.call_type
                          )}
                          disabled={!!currentCall || isConnecting}
                        >
                          {call.call_type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {callHistory.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No call history yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
      
      {/* Active Call Dialog */}
      <Dialog open={!!currentCall} onOpenChange={() => currentCall && endCall()}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {currentCall?.call_type === 'video' && <Video className="w-5 h-5" />}
              {currentCall?.call_type === 'voice' && <Phone className="w-5 h-5" />}
              {currentCall?.call_type === 'screen_share' && <Monitor className="w-5 h-5" />}
              {currentCall?.call_type === 'video' ? 'Video Call' : 
               currentCall?.call_type === 'voice' ? 'Voice Call' : 'Screen Share'}
              {isConnecting && <Badge variant="outline">Connecting...</Badge>}
            </DialogTitle>
          </DialogHeader>
          
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {/* Remote Video */}
            <video
              ref={(ref) => setRemoteVideoRef(ref)}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute bottom-4 right-4 w-40 aspect-video bg-muted rounded-lg overflow-hidden shadow-lg">
              <video
                ref={(ref) => setLocalVideoRef(ref)}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* No Video Fallback */}
            {!remoteStream && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Avatar className="h-24 w-24 mx-auto mb-4">
                    <AvatarFallback className="text-3xl bg-muted">
                      {currentCall?.caller_id === user?.id ? 'C' : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-lg">{isConnecting ? 'Connecting...' : 'Waiting for connection...'}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Call Controls */}
          <div className="flex justify-center gap-4 mt-4">
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            
            {currentCall?.call_type === 'video' && (
              <Button
                variant={isVideoOff ? "destructive" : "outline"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleVideo}
              >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
              </Button>
            )}
            
            <Button
              variant="destructive"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={endCall}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Incoming Call Dialog */}
      <Dialog open={!!incomingCall} onOpenChange={() => incomingCall && declineCall(incomingCall)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {incomingCall?.call_type === 'video' && <Video className="w-5 h-5 text-green-500" />}
              {incomingCall?.call_type === 'voice' && <Phone className="w-5 h-5 text-green-500" />}
              {incomingCall?.call_type === 'screen_share' && <Monitor className="w-5 h-5 text-green-500" />}
              Incoming Call
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center py-8">
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                ?
              </AvatarFallback>
            </Avatar>
            <p className="text-lg font-medium">Incoming {incomingCall?.call_type} call</p>
            <p className="text-muted-foreground text-sm">from a team member</p>
          </div>
          
          <div className="flex justify-center gap-4">
            <Button
              variant="destructive"
              size="lg"
              className="gap-2"
              onClick={() => incomingCall && declineCall(incomingCall)}
            >
              <PhoneOff className="w-5 h-5" />
              Decline
            </Button>
            <Button
              variant="default"
              size="lg"
              className="gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => incomingCall && answerCall(incomingCall)}
            >
              <Phone className="w-5 h-5" />
              Answer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
