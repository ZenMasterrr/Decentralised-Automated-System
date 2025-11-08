import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';


// --- CORRECTED & IMPROVED TYPES ---

// 1. Define specific config types for each step
interface TriggerStepConfig {
  type: 'gmail';
  criteria: 'subject' | 'from';
  value: string;
  label: string;
}

interface SheetsStepConfig {
  spreadsheetId: string;
  sheetName: string;
  range: string;
  append: boolean;
}

interface CalendarStepConfig {
  eventTitle: string;
  eventDescription: string;
  dateField: string;
  timeField: string;
  duration: number;
  sendNotifications: boolean;
}

interface EmailStepConfig {
  to: string;
  subject: string;
  body: string;
}

// 2. Create a base interface
interface BaseWorkflowStep {
  id: string;
  title: string;
}

// 3. Create a discriminated union based on the 'type' property
interface TriggerWorkflowStep extends BaseWorkflowStep {
  type: 'trigger';
  config: TriggerStepConfig;
}

interface SheetsWorkflowStep extends BaseWorkflowStep {
  type: 'sheets';
  config: SheetsStepConfig;
}

interface CalendarWorkflowStep extends BaseWorkflowStep {
  type: 'calendar';
  config: CalendarStepConfig;
}

interface EmailWorkflowStep extends BaseWorkflowStep {
  type: 'email';
  config: EmailStepConfig;
}

// This is the new, fully type-safe WorkflowStep
type WorkflowStep = TriggerWorkflowStep | SheetsWorkflowStep | CalendarWorkflowStep | EmailWorkflowStep;

// 4. Update WorkflowConfig (removed redundant 'trigger' property)
interface WorkflowConfig {
  name: string;
  steps: WorkflowStep[];
}

interface GoogleWorkflowConfigProps {
  onComplete: (workflow: WorkflowConfig) => void;
  onBack: () => void;
}
// --- END OF TYPE CORRECTIONS ---


// Helper function to generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 11);

// Default steps configuration (now matches the new types)
const DEFAULT_STEPS: WorkflowStep[] = [
  {
    id: generateId(),
    type: 'trigger',
    title: 'When an email arrives in Gmail',
    config: {
      type: 'gmail',
      criteria: 'subject',
      value: '',
      label: 'INBOX'
    }
  },
  {
    id: generateId(),
    type: 'sheets',
    title: 'Add row to Google Sheet',
    config: {
      spreadsheetId: '',
      sheetName: 'Sheet1',
      range: 'A1',
      append: true
    }
  },
  {
    id: generateId(),
    type: 'calendar',
    title: 'Create Google Calendar event',
    config: {
      eventTitle: '',
      eventDescription: '',
      dateField: 'date',
      timeField: 'time',
      duration: 60,
      sendNotifications: true
    }
  },
  {
    id: generateId(),
    type: 'email',
    title: 'Send confirmation email',
    config: {
      to: '',
      subject: 'Event Reminder',
      body: 'This is a reminder for your upcoming event.'
    }
  }
];

export function GoogleWorkflowConfig({ onComplete, onBack }: GoogleWorkflowConfigProps) {
  const [step, setStep] = useState(1);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  
  // FIXED: Removed the redundant 'trigger' property from the initial state
  const [workflow, setWorkflow] = useState<WorkflowConfig>(() => ({
    name: '',
    steps: [...DEFAULT_STEPS]
  }));

  const handleConfigChange = (field: string, value: any) => {
    if (!editingStep) return;
    
    // Create a type-safe update based on the step type
    const updateStepConfig = (step: WorkflowStep, field: string, value: any): WorkflowStep => {
      const config = { ...step.config };
      const parts = field.split('.');
      let current: any = config;
      
      // Handle nested properties
      for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] === undefined) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      current[parts[parts.length - 1]] = value;
      
      // Return a new step with the updated config, preserving the specific step type
      return {
        ...step,
        config: config as any // Type assertion is safe here because we're preserving the structure
      };
    };
    
    const updatedStep = updateStepConfig(editingStep, field, value);

    // Update the step in the workflow with proper type safety
    setWorkflow((prev: WorkflowConfig) => ({
      ...prev,
      steps: prev.steps.map(s => 
        s.id === editingStep.id 
          ? updatedStep as WorkflowStep
          : s
      )
    }));
    
    // Update the editing step
    setEditingStep(updatedStep);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    // Prevent dragging the trigger step
    if (result.source.index === 0 || result.destination.index === 0) {
      toast.warning("The trigger step must always be first.");
      return;
    }
    
    const items: WorkflowStep[] = Array.from(workflow.steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setWorkflow(prev => ({
      ...prev,
      steps: items
    }));
  };
  
  const addStep = (type: 'sheets' | 'calendar' | 'email') => {
    // FIXED: Removed invalid initial declaration
    let newStep: WorkflowStep;
    
    switch (type) {
      case 'sheets':
        newStep = {
          id: generateId(),
          type: 'sheets',
          title: 'Add row to Google Sheet',
          config: {
            spreadsheetId: '',
            sheetName: 'Sheet1',
            range: 'A1',
            append: true
          }
        };
        break;
      case 'calendar':
        newStep = {
          id: generateId(),
          type: 'calendar',
          title: 'Create Google Calendar event',
          config: {
            eventTitle: '',
            eventDescription: '',
            dateField: 'date',
            timeField: 'time',
            duration: 60,
            sendNotifications: true
          }
        };
        break;
      case 'email':
        newStep = {
          id: generateId(),
          type: 'email',
          title: 'Send confirmation email',
          config: {
            to: '',
            subject: 'Event Reminder',
            body: 'This is a reminder for your upcoming event.'
          }
        };
        break;
      // No default needed as the input type is exhaustive
    }
    
    setWorkflow(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
    
    // Edit the new step
    setEditingStep(newStep);
  };
  
  const removeStep = (stepId: string) => {
    // Don't allow removing the trigger step
    if (workflow.steps.find(step => step.id === stepId)?.type === 'trigger') {
      toast.error('Cannot remove the trigger step');
      return;
    }
    
    setWorkflow(prev => ({
      ...prev,
      steps: prev.steps.filter(s => s.id !== stepId)
    }));
    
    // If we're removing the currently edited step, clear the editor
    if (editingStep?.id === stepId) {
      setEditingStep(null);
    }
  };

  // This function is now fully type-safe thanks to the discriminated union
  const renderStepConfig = (step: WorkflowStep) => {
    switch (step.type) {
      case 'trigger':
        return (
          <div className="space-y-4">
            <div>
              <Label>When an email arrives in Gmail with</Label>
              <Select
                value={step.config.criteria} // Now type-safe
                onValueChange={(value: string) => handleConfigChange('criteria', value as 'subject' | 'from')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select criteria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subject">Subject contains</SelectItem>
                  <SelectItem value="from">From contains</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input
                value={step.config.value} // Now type-safe
                onChange={(e) => handleConfigChange('value', e.target.value)}
                placeholder="Enter value to match"
              />
            </div>
          </div>
        );
      case 'sheets':
        return (
          <div className="space-y-4">
            <div>
              <Label>Spreadsheet ID</Label>
              <Input
                value={step.config.spreadsheetId} // Now type-safe
                onChange={(e) => handleConfigChange('spreadsheetId', e.target.value)}
                placeholder="Enter spreadsheet ID"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sheet Name</Label>
                <Input
                  value={step.config.sheetName} // Now type-safe
                  onChange={(e) => handleConfigChange('sheetName', e.target.value)}
                  placeholder="Sheet1"
                />
              </div>
              <div>
                <Label>Range</Label>
                <Input
                  value={step.config.range} // Now type-safe
                  onChange={(e) => handleConfigChange('range', e.target.value)}
                  placeholder="A1"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={step.config.append}
                onCheckedChange={(checked: boolean) => handleConfigChange('append', checked)}
                id="append-sheet"
              />
              <Label htmlFor="append-sheet" asChild><span>Append to existing sheet</span></Label>
            </div>
          </div>
        );
      case 'calendar':
        return (
          <div className="space-y-4">
            <div>
              <Label>Event Title</Label>
              <Input
                value={step.config.eventTitle} // Now type-safe
                onChange={(e) => handleConfigChange('eventTitle', e.target.value)}
                placeholder="e.g., Meeting with Team or {{email.subject}}"
              />
              <p className="text-xs text-gray-500 mt-1">You can use static text or reference fields from previous steps</p>
            </div>
            <div>
              <Label>Event Description</Label>
              <Textarea
                value={step.config.eventDescription} // Now type-safe
                onChange={(e) => handleConfigChange('eventDescription', e.target.value)}
                placeholder="e.g., Event details or {{email.body}}"
              />
              <p className="text-xs text-gray-500 mt-1">{'Use {{email.body}} to include email content'}</p>
            </div>
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-900 mb-1">📅 Date & Time Configuration</p>
              <p className="text-xs text-gray-600">
                Enter actual date/time values OR field names from previous steps.
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {'Examples: "2024-11-15", "14:30", or field references like "{{sheet.date}}"'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date (YYYY-MM-DD or field reference)</Label>
                <Input
                  value={step.config.dateField} // Now type-safe
                  onChange={(e) => handleConfigChange('dateField', e.target.value)}
                  placeholder="2024-11-15 or {{sheet.date}}"
                />
                <p className="text-xs text-gray-500 mt-1">Format: YYYY-MM-DD</p>
              </div>
              <div>
                <Label>Time (HH:MM or field reference)</Label>
                <Input
                  value={step.config.timeField} // Now type-safe
                  onChange={(e) => handleConfigChange('timeField', e.target.value)}
                  placeholder="14:30 or {{sheet.time}}"
                />
                <p className="text-xs text-gray-500 mt-1">Format: HH:MM (24-hour)</p>
              </div>
            </div>
            
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={step.config.duration} // Now type-safe
                onChange={(e) => handleConfigChange('duration', parseInt(e.target.value) || 60)}
                placeholder="60"
                min="15"
                max="1440"
              />
              <p className="text-xs text-gray-500 mt-1">How long the event will last (15-1440 minutes)</p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="send-notifications"
                checked={step.config.sendNotifications} // Now type-safe
                onCheckedChange={(checked: boolean) => handleConfigChange('sendNotifications', checked)}
              />
              <Label htmlFor="send-notifications">Send calendar notifications to attendees</Label>
            </div>
            
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800">
                💡 <strong>Tip:</strong> For testing, use actual date/time values like "2024-11-15" and "14:30".
                For production workflows, reference fields from your Google Sheet or email content.
              </p>
            </div>
          </div>
        );
      case 'email':
        return (
          <div className="space-y-4">
            <div>
              <Label>To</Label>
              <Input
                value={step.config.to} // Now type-safe
                onChange={(e) => handleConfigChange('to', e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={step.config.subject} // Now type-safe
                onChange={(e) => handleConfigChange('subject', e.target.value)}
                placeholder="Enter email subject"
              />
            </div>
            <div>
              <Label>Email Body</Label>
              <Textarea
                value={step.config.body} // Now type-safe
                onChange={(e) => handleConfigChange('body', e.target.value)}
                placeholder="Enter email content"
                rows={6}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderStep = () => {
    if (step === 1) {
      // Workflow Builder View
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Workflow Name</h3>
            <Input 
              value={workflow.name}
              onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Event Scheduler"
              className="max-w-md"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium">Workflow Steps</h3>
              <div className="flex space-x-2">
                <Select 
                  onValueChange={(value: string) => addStep(value as 'sheets' | 'calendar' | 'email')}
                >
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      <span>Add Step</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sheets">Google Sheets</SelectItem>
                    <SelectItem value="calendar">Google Calendar</SelectItem>
                    <SelectItem value="email">Gmail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="steps">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {workflow.steps.map((step, index) => (
                        <Draggable 
                          key={step.id} 
                          draggableId={step.id} 
                          index={index}
                          // Disable dragging for the first (trigger) step
                          isDragDisabled={index === 0}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`p-4 border rounded-lg flex items-center justify-between ${
                                editingStep?.id === step.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div 
                                  {...provided.dragHandleProps} 
                                  className={index === 0 ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-gray-600 cursor-move"}
                                >
                                  <GripVertical className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="font-medium">{step.title}</div>
                                  <div className="text-sm text-gray-500">
                                    {/* These subtitles can be simpler now */}
                                    {step.type === 'trigger' && 'When an email arrives in Gmail'}
                                    {step.type === 'sheets' && 'Add row to Google Sheet'}
                                    {step.type === 'calendar' && 'Create Google Calendar event'}
                                    {step.type === 'email' && 'Send email'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setEditingStep(step)}
                                >
                                  Edit
                                </Button>
                                {step.type !== 'trigger' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() => removeStep(step.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>
          
          {editingStep && (
            <div className="mt-8 p-6 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-medium mb-4">
                {editingStep.type === 'trigger' && 'Configure Gmail Trigger'}
                {editingStep.type === 'sheets' && 'Configure Google Sheets Action'}
                {editingStep.type === 'calendar' && 'Configure Google Calendar Action'}
                {editingStep.type === 'email' && 'Configure Email Action'}
              </h3>
              {renderStepConfig(editingStep)}
              <div className="mt-6 flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setEditingStep(null)}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      );
    } else {
      // Final confirmation step
      return (
        <div className="space-y-6">
          <h3 className="text-lg font-medium">Workflow Summary</h3>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Workflow Name</h4>
              <p>{workflow.name || '(No name provided)'}</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Workflow Steps</h4>
              <ol className="space-y-3">
                {workflow.steps.map((step, index) => (
                  <li key={step.id} className="flex items-start">
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium mr-3">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium">{step.title}</div>
                      {/* This summary logic is now also type-safe */}
                      <div className="text-sm text-gray-500">
                        {step.type === 'trigger' && `When email ${step.config.criteria} contains "${step.config.value}"`}
                        {step.type === 'sheets' && `Add to sheet: ${step.config.sheetName} (${step.config.range})`}
                        {step.type === 'calendar' && `Create event: ${step.config.eventTitle}`}
                        {step.type === 'email' && `Send email to: ${step.config.to} - ${step.config.subject}`}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      );
    }
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      onComplete(workflow);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  const isNextDisabled = () => {
    if (step === 1) {
      return !workflow.name || workflow.steps.length === 0;
    }
    return false;
  };

  // FIXED: Removed the first, duplicated renderProgress function. This is the one being used.
  const renderProgress = () => {
    if (step === 1) {
      return (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium">Build your workflow</div>
          <div className="text-sm text-gray-500">Step 1 of 2</div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium">Review and confirm</div>
          <div className="text-sm text-gray-500">Step 2 of 2</div>
        </div>
      );
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Google Workspace Zap</CardTitle>
        <CardDescription>
          Build a custom workflow by connecting Gmail, Google Sheets, and Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          {renderProgress()}
          
          <div className="relative pt-1">
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
              <div
                style={{ width: `${(step / 2) * 100}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
              ></div>
            </div>
          </div>
        </div>
        
        {renderStep()}
        
        <div className="flex justify-between mt-8">
          <Button 
            variant="outline" 
            // FIXED: Use the handleBack function directly
            onClick={handleBack}
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleNext}
            disabled={isNextDisabled()}
          >
            {step < 2 ? 'Continue' : 'Complete Configuration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}