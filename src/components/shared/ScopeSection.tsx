import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Sparkles, Loader2, CheckSquare, XSquare } from 'lucide-react';

interface ScopeSectionProps {
  inclusions: string[];
  exclusions: string[];
  onInclusionsChange: (items: string[]) => void;
  onExclusionsChange: (items: string[]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const ScopeSection: React.FC<ScopeSectionProps> = ({
  inclusions,
  exclusions,
  onInclusionsChange,
  onExclusionsChange,
  onGenerate,
  isGenerating
}) => {
  const [newInclusion, setNewInclusion] = useState('');
  const [newExclusion, setNewExclusion] = useState('');

  const addInclusion = () => {
    if (!newInclusion.trim()) return;
    onInclusionsChange([...inclusions, newInclusion.trim()]);
    setNewInclusion('');
  };

  const removeInclusion = (index: number) => {
    onInclusionsChange(inclusions.filter((_, i) => i !== index));
  };

  const addExclusion = () => {
    if (!newExclusion.trim()) return;
    onExclusionsChange([...exclusions, newExclusion.trim()]);
    setNewExclusion('');
  };

  const removeExclusion = (index: number) => {
    onExclusionsChange(exclusions.filter((_, i) => i !== index));
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* In Scope */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckSquare className="h-5 w-5" />
              In Scope
            </CardTitle>
            <CardDescription>What is included in this engagement</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            AI Generate
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newInclusion}
              onChange={(e) => setNewInclusion(e.target.value)}
              placeholder="Add scope item..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInclusion())}
            />
            <Button size="sm" onClick={addInclusion}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            {inclusions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No scope items defined yet
              </p>
            ) : (
              inclusions.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg group"
                >
                  <CheckSquare className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="flex-1 text-sm">{item}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeInclusion(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Out of Scope */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XSquare className="h-5 w-5" />
            Out of Scope
          </CardTitle>
          <CardDescription>What is excluded from this engagement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newExclusion}
              onChange={(e) => setNewExclusion(e.target.value)}
              placeholder="Add exclusion..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExclusion())}
            />
            <Button size="sm" onClick={addExclusion}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            {exclusions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No exclusions defined yet
              </p>
            ) : (
              exclusions.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg group"
                >
                  <XSquare className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="flex-1 text-sm">{item}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeExclusion(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
