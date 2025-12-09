import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { 
  Plus, 
  FileText, 
  Target, 
  Cog, 
  BookOpen, 
  GripVertical, 
  Pencil, 
  Trash2, 
  Clock, 
  CheckCircle2,
  Loader2,
  Sparkles,
  Package
} from "lucide-react";

interface ProductRecommendationStepsProps {
  teamType: 'technical' | 'solution_engineering';
}

interface RecommendationStep {
  id: string;
  product_id: string;
  step_type: 'sow' | 'poc' | 'implementation' | 'sop';
  team_type: string;
  step_order: number;
  title: string;
  description: string | null;
  details: string | null;
  duration_estimate: string | null;
  prerequisites: string[] | null;
  deliverables: string[] | null;
  resources: string[] | null;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  oem: { name: string } | null;
}

const stepTypeConfig = {
  sow: { label: 'SOW Document', icon: FileText, color: 'bg-blue-500/10 text-blue-500' },
  poc: { label: 'POC Plan', icon: Target, color: 'bg-green-500/10 text-green-500' },
  implementation: { label: 'Implementation', icon: Cog, color: 'bg-orange-500/10 text-orange-500' },
  sop: { label: 'SOP Document', icon: BookOpen, color: 'bg-purple-500/10 text-purple-500' },
};

export function ProductRecommendationSteps({ teamType }: ProductRecommendationStepsProps) {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedStepType, setSelectedStepType] = useState<string>("sow");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<RecommendationStep | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    details: "",
    duration_estimate: "",
    prerequisites: "",
    deliverables: "",
    resources: "",
  });

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['offerings-products-for-steps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offerings_products')
        .select('id, name, description, category, oem:offerings_oems(name)')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    },
  });

  // Fetch recommendation steps for selected product
  const { data: steps = [], isLoading: stepsLoading } = useQuery({
    queryKey: ['product-recommendation-steps', selectedProduct, teamType],
    queryFn: async () => {
      if (!selectedProduct) return [];
      
      const { data, error } = await supabase
        .from('product_recommendation_steps')
        .select('*')
        .eq('product_id', selectedProduct)
        .eq('team_type', teamType)
        .eq('is_active', true)
        .order('step_type')
        .order('step_order');
      
      if (error) throw error;
      return data as RecommendationStep[];
    },
    enabled: !!selectedProduct,
  });

  // Add/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<RecommendationStep>) => {
      const stepData = {
        ...data,
        product_id: selectedProduct,
        team_type: teamType,
        step_type: selectedStepType,
        prerequisites: data.prerequisites || [],
        deliverables: data.deliverables || [],
        resources: data.resources || [],
      };

      if (editingStep) {
        const { error } = await supabase
          .from('product_recommendation_steps')
          .update(stepData as any)
          .eq('id', editingStep.id);
        if (error) throw error;
      } else {
        // Get max order for this step type
        const maxOrder = steps
          .filter(s => s.step_type === selectedStepType)
          .reduce((max, s) => Math.max(max, s.step_order), 0);
        
        const { error } = await supabase
          .from('product_recommendation_steps')
          .insert({ ...stepData, step_order: maxOrder + 1 } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-recommendation-steps'] });
      toast.success(editingStep ? 'Step updated successfully' : 'Step added successfully');
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to save step: ' + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase
        .from('product_recommendation_steps')
        .update({ is_active: false })
        .eq('id', stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-recommendation-steps'] });
      toast.success('Step removed successfully');
    },
  });

  // AI Generate steps
  const generateSteps = async () => {
    if (!selectedProduct) {
      toast.error('Please select a product first');
      return;
    }

    setIsGenerating(true);
    try {
      const product = products.find(p => p.id === selectedProduct);
      const { data, error } = await supabase.functions.invoke('generate-recommendation-steps', {
        body: {
          productId: selectedProduct,
          productName: product?.name,
          productDescription: product?.description,
          productCategory: product?.category,
          oemName: product?.oem?.name,
          teamType,
          stepType: selectedStepType,
        },
      });

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['product-recommendation-steps'] });
      toast.success(`Generated ${data.stepsCreated || 0} recommendation steps`);
    } catch (error: any) {
      toast.error('Failed to generate steps: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      details: "",
      duration_estimate: "",
      prerequisites: "",
      deliverables: "",
      resources: "",
    });
    setEditingStep(null);
  };

  const openEditDialog = (step: RecommendationStep) => {
    setEditingStep(step);
    setSelectedStepType(step.step_type);
    setFormData({
      title: step.title,
      description: step.description || "",
      details: step.details || "",
      duration_estimate: step.duration_estimate || "",
      prerequisites: step.prerequisites?.join('\n') || "",
      deliverables: step.deliverables?.join('\n') || "",
      resources: step.resources?.join('\n') || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    saveMutation.mutate({
      title: formData.title,
      description: formData.description,
      details: formData.details,
      duration_estimate: formData.duration_estimate,
      prerequisites: formData.prerequisites.split('\n').filter(Boolean),
      deliverables: formData.deliverables.split('\n').filter(Boolean),
      resources: formData.resources.split('\n').filter(Boolean),
    } as any);
  };

  const groupedSteps = steps.reduce((acc, step) => {
    if (!acc[step.step_type]) acc[step.step_type] = [];
    acc[step.step_type].push(step);
    return acc;
  }, {} as Record<string, RecommendationStep[]>);

  const selectedProductData = products.find(p => p.id === selectedProduct);

  return (
    <div className="space-y-6">
      {/* Product Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Product Recommendation Steps
          </CardTitle>
          <CardDescription>
            Configure step-by-step recommendations for SOW, POC, Implementation & SOP documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label>Select Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        <span>{product.name}</span>
                        {product.oem?.name && (
                          <Badge variant="outline" className="text-xs">{product.oem.name}</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && (
              <div className="flex gap-2 items-end">
                <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                  setIsAddDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Step
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingStep ? 'Edit Recommendation Step' : 'Add Recommendation Step'}
                      </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] pr-4">
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Step Type</Label>
                          <Select value={selectedStepType} onValueChange={setSelectedStepType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(stepTypeConfig).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    <config.icon className="w-4 h-4" />
                                    {config.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Title *</Label>
                          <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Step title..."
                          />
                        </div>

                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Brief description of this step..."
                            rows={2}
                          />
                        </div>

                        <div>
                          <Label>Details</Label>
                          <Textarea
                            value={formData.details}
                            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                            placeholder="Detailed instructions..."
                            rows={4}
                          />
                        </div>

                        <div>
                          <Label>Duration Estimate</Label>
                          <Input
                            value={formData.duration_estimate}
                            onChange={(e) => setFormData({ ...formData, duration_estimate: e.target.value })}
                            placeholder="e.g., 2-3 days, 1 week"
                          />
                        </div>

                        <div>
                          <Label>Prerequisites (one per line)</Label>
                          <Textarea
                            value={formData.prerequisites}
                            onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                            placeholder="List prerequisites..."
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label>Deliverables (one per line)</Label>
                          <Textarea
                            value={formData.deliverables}
                            onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                            placeholder="List deliverables..."
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label>Resources (one per line)</Label>
                          <Textarea
                            value={formData.resources}
                            onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
                            placeholder="List resources or references..."
                            rows={3}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                            {saveMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}
                            {editingStep ? 'Update Step' : 'Add Step'}
                          </Button>
                        </div>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" onClick={generateSteps} disabled={isGenerating}>
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  AI Generate
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Steps Display */}
      {selectedProduct && (
        <div className="space-y-4">
          {selectedProductData && (
            <div className="flex items-center gap-3 px-1">
              <h3 className="text-lg font-semibold">{selectedProductData.name}</h3>
              {selectedProductData.category && (
                <Badge variant="secondary">{selectedProductData.category}</Badge>
              )}
            </div>
          )}

          <Tabs defaultValue="sow" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {Object.entries(stepTypeConfig).map(([key, config]) => {
                const count = groupedSteps[key]?.length || 0;
                return (
                  <TabsTrigger key={key} value={key} className="gap-2">
                    <config.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{config.label}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(stepTypeConfig).map(([key, config]) => (
              <TabsContent key={key} value={key} className="mt-4">
                {stepsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : groupedSteps[key]?.length ? (
                  <Accordion type="multiple" className="space-y-2">
                    {groupedSteps[key].map((step, index) => (
                      <AccordionItem 
                        key={step.id} 
                        value={step.id}
                        className="border rounded-lg px-4"
                      >
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 text-left">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${config.color}`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{step.title}</p>
                              {step.duration_estimate && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <Clock className="w-3 h-3" />
                                  {step.duration_estimate}
                                </p>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-11 space-y-4 pb-2">
                            {step.description && (
                              <p className="text-muted-foreground">{step.description}</p>
                            )}
                            
                            {step.details && (
                              <div>
                                <h5 className="text-sm font-medium mb-1">Details</h5>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{step.details}</p>
                              </div>
                            )}

                            {step.prerequisites?.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium mb-1">Prerequisites</h5>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                  {step.prerequisites.map((item, i) => (
                                    <li key={i}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {step.deliverables?.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium mb-1">Deliverables</h5>
                                <ul className="space-y-1">
                                  {step.deliverables.map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {step.resources?.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium mb-1">Resources</h5>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                  {step.resources.map((item, i) => (
                                    <li key={i}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="flex gap-2 pt-2">
                              <Button size="sm" variant="outline" onClick={() => openEditDialog(step)}>
                                <Pencil className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteMutation.mutate(step.id)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <config.icon className="w-12 h-12 text-muted-foreground/50 mb-4" />
                      <h4 className="font-medium mb-2">No {config.label} Steps Yet</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add steps manually or use AI to generate recommendations
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setSelectedStepType(key);
                            setIsAddDialogOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Step
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setSelectedStepType(key);
                            generateSteps();
                          }}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          AI Generate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}

      {!selectedProduct && !productsLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Product</h3>
            <p className="text-muted-foreground max-w-md">
              Choose a product from the dropdown above to view or configure recommendation steps 
              for SOW, POC, Implementation and SOP documents.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
