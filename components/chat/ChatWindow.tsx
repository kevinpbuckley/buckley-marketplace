'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketplaceClient, useAppContext, usePagesContext } from '@/components/providers/marketplace';
import { getToolDefinitions, getTool, executeToolByName } from '@/lib/tools';
import type { SamplePrompt } from '@/lib/tools/types';
import { estimateMessagesTokens, estimateToolResultTokens } from '@/lib/token-estimator';
import type { ChatMessageMetadata, ChatUIMessage } from '@/app/api/chat/route';

type ToolSummary = { name: string; description: string; category: string };

// The registry holds every tool so any of them can be executed; which ones the model is
// actually offered depends on the server's tool mode, so the panel asks the server.
const REGISTERED_TOOLS: ToolSummary[] = getToolDefinitions().map(def => ({
  name: def.name,
  description: def.description,
  category: def.category,
}));

// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface ChatWindowProps {
  samplePrompts?: SamplePrompt[];
}

export function ChatWindow({ samplePrompts = [] }: ChatWindowProps) {
  const client = useMarketplaceClient();
  const appContext = useAppContext();
  const pagesContext = usePagesContext();
  
  // Get the context ID for SDK calls
  const contextId = appContext?.resourceAccess?.[0]?.context?.preview as string;
  
  // Store pages context in a ref so it can be accessed by tool executors
  const pagesEditorContextRef = useRef(pagesContext);
  
  // Update ref whenever pages context changes
  useEffect(() => {
    pagesEditorContextRef.current = pagesContext;
    if (pagesContext) {
      console.log('[ChatWindow] Updated pages context ref:', pagesContext);
    }
  }, [pagesContext]);

  const { messages, sendMessage, addToolOutput, status, error, stop } = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    // Automatically send tool results back to the LLM when all tools complete
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    // Track token usage from server metadata when message is complete
    onFinish: async ({ message }) => {
      // Real token usage is now available in message.metadata.totalUsage
      if (message?.metadata?.totalUsage) {
        console.log('[ChatWindow] Server-reported token usage:', message.metadata.totalUsage);
      }
    },
    // Handle client-side tool execution dynamically
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) return;
      
      const toolModule = getTool(toolCall.toolName);
      if (!toolModule) return;
      
      // Only handle client-side tools here
      if (!toolModule.definition.clientSide) return;
      
      // Execute the tool using the dynamic executor
      const result = await executeToolByName(
        toolCall.toolName,
        toolCall.input,
        { client, contextId, pagesContext: pagesEditorContextRef.current }
      );
      
      if (result.success) {
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: result.output,
        });
      } else {
        // Only errorText reaches the model, so fold in any diagnostic fields the tool
        // returned alongside `error` — availableSections, hints and the like — rather than
        // dropping them and leaving it to guess why the call failed.
        const { error, ...rest } = result as { success: false; error: string } & Record<
          string,
          unknown
        >;
        const { success: _, ...diagnostics } = rest;

        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          state: 'output-error',
          errorText: Object.keys(diagnostics).length
            ? `${error}\n${JSON.stringify(diagnostics)}`
            : error,
        });
      }
    },
  });
  
  const [input, setInput] = useState('');
  const [activeTools, setActiveTools] = useState<ToolSummary[]>(REGISTERED_TOOLS);
  const [toolMode, setToolMode] = useState<string | null>(null);
  const [showTools, setShowTools] = useState(false);
  const [showTokenStats, setShowTokenStats] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/tools')
      .then((res) => res.json())
      .then((data: { mode: string; tools: ToolSummary[] }) => {
        if (Array.isArray(data.tools)) setActiveTools(data.tools);
        setToolMode(data.mode ?? null);
      })
      .catch(() => {
        // Keep the registry listing rather than showing nothing.
      });
  }, []);
  const [serverTokens, setServerTokens] = useState<{
    prompt: number;
    completion: number;
    total: number;
    requestCount: number;
    lastRequest: { prompt: number; completion: number; total: number };
    source?: 'api' | 'estimate';
  }>({ 
    prompt: 0, 
    completion: 0, 
    total: 0, 
    requestCount: 0,
    lastRequest: { prompt: 0, completion: 0, total: 0 },
    source: undefined,
  });
  const [modelInfo, setModelInfo] = useState({ 
    modelName: 'gpt-4o-mini', 
    contextSize: parseInt(process.env.NEXT_PUBLIC_MAX_CONTEXT_SIZE || '128000', 10) 
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevTokensRef = useRef<string | null>(null);
  
  const isLoading = status === 'streaming' || status === 'submitted';

  // Memoize token calculations - prefer real API usage when available, fall back to estimates
  const calculatedTokens = useMemo(() => {
    if (messages.length === 0) return null;
    
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    // Try to get real usage data from message metadata
    // Accumulate usage from all assistant messages that have metadata
    let realInputTokens = 0;
    let realOutputTokens = 0;
    let realTotalTokens = 0;
    let hasRealUsage = false;
    let requestCount = 0;
    
    for (const msg of assistantMessages) {
      const usage = (msg.metadata as ChatMessageMetadata)?.totalUsage;
      if (usage) {
        hasRealUsage = true;
        requestCount++;
        realInputTokens += usage.inputTokens || 0;
        realOutputTokens += usage.outputTokens || 0;
        realTotalTokens += usage.totalTokens || 0;
      }
    }
    
    // If we have real usage data from API, use it
    if (hasRealUsage) {
      const lastAssistantMsg = assistantMessages[assistantMessages.length - 1];
      const lastUsage = (lastAssistantMsg?.metadata as ChatMessageMetadata)?.totalUsage;
      
      return {
        prompt: realInputTokens,
        completion: realOutputTokens,
        total: realTotalTokens,
        requestCount: requestCount,
        lastRequest: {
          prompt: lastUsage?.inputTokens || 0,
          completion: lastUsage?.outputTokens || 0,
          total: lastUsage?.totalTokens || 0,
        },
        source: 'api' as const,
      };
    }
    
    // Fall back to client-side estimation if no real usage data yet
    // Calculate cumulative input tokens across all requests
    // Each request sends: System prompt + Tools + ALL previous messages + new input
    // Requests happen for: 1) each user message, 2) each tool result sent back to LLM
    let cumulativeInputTokens = 0;
    const systemOverhead = 100; // Rough estimate for system prompt + tool definitions overhead per request
    let estimatedRequestCount = 0;
    
    // Walk through messages and count each LLM request
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      // User message triggers a request
      if (msg.role === 'user') {
        const messagesUpToThisPoint = messages.slice(0, i + 1);
        const requestInputTokens = systemOverhead + estimateMessagesTokens(messagesUpToThisPoint);
        cumulativeInputTokens += requestInputTokens;
        estimatedRequestCount++;
      }
      
      // Assistant message with tool calls that have outputs triggers follow-up requests
      // Each time tool results are sent back, it's another LLM request
      if (msg.role === 'assistant' && Array.isArray(msg.parts)) {
        const toolPartsWithOutput = msg.parts.filter(
          (p: any) => p.type?.startsWith('tool-') && p.output
        );
        
        if (toolPartsWithOutput.length > 0) {
          // Tool results sent back to LLM = another request with full context
          const messagesUpToThisPoint = messages.slice(0, i + 1);
          const requestInputTokens = systemOverhead + estimateMessagesTokens(messagesUpToThisPoint);
          cumulativeInputTokens += requestInputTokens;
          estimatedRequestCount++;
        }
      }
    }
    
    // Completion tokens = all assistant responses generated (minus tool outputs which are inputs)
    const toolResultTokens = estimateToolResultTokens(messages);
    const completionTokens = estimateMessagesTokens(assistantMessages) - toolResultTokens;
    
    // Get last exchange
    const lastUserMsg = userMessages[userMessages.length - 1];
    const lastAssistantMsg = assistantMessages[assistantMessages.length - 1];
    
    // Last request input = system + tools + all history
    const lastRequestPromptTokens = systemOverhead + estimateMessagesTokens(messages);
    
    const lastToolResultTokens = lastAssistantMsg ? estimateToolResultTokens([lastAssistantMsg]) : 0;
    const lastRequestCompletionTokens = lastAssistantMsg ? estimateMessagesTokens([lastAssistantMsg]) - lastToolResultTokens : 0;
    const lastRequestTotalTokens = lastRequestPromptTokens + lastRequestCompletionTokens;
    
    return {
      prompt: cumulativeInputTokens,
      completion: completionTokens,
      total: cumulativeInputTokens + completionTokens,
      requestCount: estimatedRequestCount,
      lastRequest: {
        prompt: lastRequestPromptTokens,
        completion: lastRequestCompletionTokens,
        total: lastRequestTotalTokens,
      },
      source: 'estimate' as const,
    };
  }, [messages]);

  // Update state and localStorage only when calculated tokens change
  useEffect(() => {
    if (!calculatedTokens) return;
    
    // Only update if tokens actually changed (prevents unnecessary re-renders)
    const tokensKey = JSON.stringify(calculatedTokens);
    if (prevTokensRef.current === tokensKey) return;
    prevTokensRef.current = tokensKey;
    
    setServerTokens(calculatedTokens);
    localStorage.setItem('reviewapp-tokens', tokensKey);
    
    // Log final token count with source indicator
    console.log(`[ChatWindow] Token usage (${calculatedTokens.source}):`, calculatedTokens);
  }, [calculatedTokens]);

  // Fetch model info on mount only
  useEffect(() => {
    const fetchModelInfo = async () => {
      try {
        console.log('[ChatWindow] Fetching model info from API...');
        const res = await fetch('/api/usage');
        const data = await res.json();
        console.log('[ChatWindow] Model info response:', data);
        
        if (data.modelName && data.contextSize) {
          setModelInfo({
            modelName: data.modelName,
            contextSize: data.contextSize,
          });
          console.log('[ChatWindow] Updated model info:', { modelName: data.modelName, contextSize: data.contextSize });
        }
      } catch (err) {
        console.error('Failed to fetch model info:', err);
      }
    };
    
    fetchModelInfo();
  }, []); // Empty dependency array - only run once on mount

  // Use server-tracked tokens
  const sessionTokens = serverTokens;

  // Get model context size from API response
  const modelName = modelInfo.modelName;
  const contextSize = modelInfo.contextSize;
  // Context window shows cumulative INPUT to LLM (all history + system prompt + tools)
  // This is what actually consumes the context window - everything sent in the request
  const totalInputTokens = serverTokens.prompt || 0;
  const contextUsagePercent = contextSize > 0 ? Math.min((totalInputTokens / contextSize) * 100, 100) : 0;

  // Show prompts in order (no shuffling) - show 1 at a time
  const visiblePrompt = useMemo(() => {
    if (samplePrompts.length === 0) return null;
    return samplePrompts[carouselIndex % samplePrompts.length];
  }, [carouselIndex, samplePrompts]);

  // Navigate carousel
  const nextPrompts = () => {
    setCarouselIndex((prev) => (prev + 1) % samplePrompts.length);
  };
  
  const prevPrompts = () => {
    setCarouselIndex((prev) => (prev - 1 + samplePrompts.length) % samplePrompts.length);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage({ text: input });
      setInput('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Handle suggestion click - send message and advance carousel
  const handleSuggestionClick = (text: string) => {
    sendMessage({ text });
    nextPrompts(); // Advance to next set of prompts
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex-1">
          <h2 className="font-semibold text-lg">Buckley</h2>
          <p className="text-sm text-muted-foreground">
            Manage XM Cloud content using the Agentic API - create, update, analyze, and explore your content
          </p>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
            <span>Session: {sessionTokens.total.toLocaleString()} tokens</span>
            <span>•</span>
            <span>
              Context: {contextUsagePercent.toFixed(1)}% of {(contextSize / 1000).toFixed(0)}k
            </span>
            <button
              onClick={() => setShowTokenStats(!showTokenStats)}
              className="text-primary hover:underline"
            >
              {showTokenStats ? 'Hide details' : 'Show details'}
            </button>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTools(!showTools)}
          className="flex items-center gap-2"
        >
          <span>🔧</span>
          <span>Tools</span>
          <Badge colorScheme="neutral" className="ml-1">{activeTools.length}</Badge>
        </Button>
      </div>

      {/* Token Statistics Panel */}
      {showTokenStats && (
        <div className="border-b bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">📊 Token Usage Statistics</h3>
              {serverTokens.source && (
                <Badge colorScheme={serverTokens.source === 'api' ? 'success' : 'warning'} className="text-xs">
                  {serverTokens.source === 'api' ? '✓ API' : '~ Est.'}
                </Badge>
              )}
            </div>
            <button 
              onClick={() => setShowTokenStats(false)}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              ✕
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="bg-background rounded-lg p-3 border">
              <div className="text-xs text-muted-foreground mb-1">Input Tokens</div>
              <div className="text-lg font-semibold">{sessionTokens.prompt.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Session total • Last: {sessionTokens.lastRequest.prompt.toLocaleString()}
              </div>
            </div>
            <div className="bg-background rounded-lg p-3 border">
              <div className="text-xs text-muted-foreground mb-1">Output Tokens</div>
              <div className="text-lg font-semibold">{sessionTokens.completion.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Generated responses</div>
            </div>
            <div className="bg-background rounded-lg p-3 border">
              <div className="text-xs text-muted-foreground mb-1">Total Tokens</div>
              <div className="text-lg font-semibold">{sessionTokens.total.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Input + Output</div>
            </div>
          </div>
          <div className="mt-3 bg-background rounded-lg p-3 border">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Last Request Context Usage</span>
              <span className="font-medium">{contextUsagePercent.toFixed(1)}% of {(contextSize / 1000).toFixed(0)}k</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Model</span>
              <span className="font-medium">{modelName}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${contextUsagePercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-muted-foreground">{sessionTokens.total.toLocaleString()} used</span>
              <span className="text-muted-foreground">{contextSize.toLocaleString()} max</span>
            </div>
          </div>
        </div>
      )}

      {/* Tools Panel */}
      {showTools && (
        <div className="border-b bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm">
              Available Tools ({activeTools.length})
              {toolMode && (
                <span className="text-muted-foreground font-normal">
                  {' '}— {toolMode} mode
                  {toolMode !== 'full' && `, ${REGISTERED_TOOLS.length} registered`}
                </span>
              )}
            </h3>
            <button 
              onClick={() => setShowTools(false)}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              ✕
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {activeTools.map((tool) => (
              <div key={tool.name} className="bg-background rounded-lg p-3 border text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{tool.name}</span>
                  <Badge colorScheme="primary" className="text-xs">{tool.category}</Badge>
                </div>
                <p className="text-muted-foreground text-xs">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message when no messages */}
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Hello, I&apos;m Buckley.</h3>
              <p className="text-muted-foreground">
                I have a variety of skills and tools that will allow me to help you.
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Choose a suggestion below or type your own question.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-lg px-4 py-2',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}
            >
              {/* Message content */}
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {message.parts?.map((part, index) => {
                  // Handle text parts
                  if (part.type === 'text') {
                    return <span key={index}>{part.text}</span>;
                  }
                  
                  // Handle all tool parts dynamically (type starts with 'tool-')
                  if (part.type.startsWith('tool-')) {
                    const toolName = part.type.replace('tool-', '');
                    const toolPart = part as { 
                      state?: string; 
                      input?: unknown;
                      output?: unknown; 
                      errorText?: string;
                    };
                    
                    const toolKey = `${message.id}-${toolName}-${index}`;
                    const isExpanded = expandedTools.has(toolKey);
                    
                    const toggleTool = () => {
                      setExpandedTools(prev => {
                        const next = new Set(prev);
                        if (next.has(toolKey)) {
                          next.delete(toolKey);
                        } else {
                          next.add(toolKey);
                        }
                        return next;
                      });
                    };
                    
                    return (
                      <Collapsible key={index} open={isExpanded} onOpenChange={toggleTool}>
                        <div className="mt-2 text-xs bg-background/50 rounded border">
                          <CollapsibleTrigger className="w-full p-2 hover:bg-background/80 transition-colors">
                            <div className="font-medium flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              <span className={cn(
                                "inline-block w-2 h-2 rounded-full",
                                toolPart.state === 'output-available' ? 'bg-green-500' : 
                                toolPart.state === 'output-error' ? 'bg-red-500' : 'bg-blue-500'
                              )}></span>
                              <span>Tool: {toolName}</span>
                              {toolPart.state === 'input-streaming' && (
                                <span className="ml-auto text-muted-foreground">Loading...</span>
                              )}
                              {toolPart.state === 'input-available' && (
                                <span className="ml-auto text-muted-foreground">Executing...</span>
                              )}
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-2 pb-2 border-t mt-1 pt-2">
                              {toolPart.input !== undefined && (
                                <div className="mb-2">
                                  <div className="text-muted-foreground font-medium mb-1">Parameters:</div>
                                  <pre className="overflow-x-auto text-xs bg-muted/50 p-2 rounded">
                                    {JSON.stringify(toolPart.input, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {toolPart.state === 'output-available' && (
                                <div>
                                  <div className="text-muted-foreground font-medium mb-1">Result:</div>
                                  <pre className="overflow-x-auto text-xs bg-muted/50 p-2 rounded">
                                    {JSON.stringify(toolPart.output, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {toolPart.state === 'output-error' && (
                                <div className="text-red-500">Error: {toolPart.errorText}</div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  }
                  
                  return null;
                })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="animate-pulse flex gap-1">
                  <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-2 text-sm">
              Error: {error.message}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions Carousel - Between messages and input */}
      <div className="border-t bg-muted/30 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            {/* Navigation Buttons */}
            <button
              onClick={prevPrompts}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-7 h-7 rounded-full bg-background border shadow-sm hover:bg-muted flex items-center justify-center transition-colors text-sm"
              aria-label="Previous suggestions"
            >
              ←
            </button>
            <button
              onClick={nextPrompts}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-7 h-7 rounded-full bg-background border shadow-sm hover:bg-muted flex items-center justify-center transition-colors text-sm"
              aria-label="Next suggestions"
            >
              →
            </button>
            
            {/* Prompt Cards - Show single prompt */}
            <div className="flex gap-2 px-8 overflow-hidden justify-center">
              {visiblePrompt && (
                <SuggestionChip 
                  key={carouselIndex}
                  icon={visiblePrompt.icon}
                  text={visiblePrompt.prompt} 
                  onClick={handleSuggestionClick}
                  disabled={isLoading}
                />
              )}
            </div>
          </div>
          
          {/* Carousel Indicator */}
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">
              {carouselIndex + 1}/{samplePrompts.length}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {samplePrompts.length} checks
            </span>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about XM Cloud best practices..."
            className="flex-1 resize-none rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] max-h-[200px]"
            rows={1}
            disabled={isLoading}
          />
          {isLoading ? (
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => stop()}
              className="flex items-center gap-2 border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600 dark:hover:bg-red-950"
            >
              <span>⏹️</span>
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()}>
              Send
            </Button>
          )}
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

function SuggestionChip({ 
  icon, 
  text, 
  onClick,
  disabled = false,
}: { 
  icon: string; 
  text: string; 
  onClick: (text: string) => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={cn(
        "flex-1 min-w-0 text-left px-3 py-2 rounded-lg border bg-background text-sm transition-all duration-200",
        disabled 
          ? "opacity-50 cursor-not-allowed" 
          : "hover:bg-primary/5 hover:border-primary/50"
      )}
      onClick={() => !disabled && onClick(text)}
      disabled={disabled}
    >
      <div className="flex items-start gap-2">
        <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
        <span className="text-sm leading-tight">{text}</span>
      </div>
    </button>
  );
}

function SuggestionButton({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      className="block w-full text-left px-3 py-2 rounded-lg border hover:bg-muted transition-colors"
      onClick={() => onClick(text)}
    >
      {text}
    </button>
  );
}
