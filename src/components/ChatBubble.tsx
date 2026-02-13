import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { useCarsContext } from '@/contexts/CarsContext';
import { getGeminiApiKey, getSessions, getGeminiModel } from '@/lib/db';
import { chatWithVehicleData } from '@/lib/gemini-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  parts: string;
  animate?: boolean;
}

const TypewriterMarkdown = ({ content, onComplete }: { content: string, onComplete?: () => void }) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < content.length) {
      const timeout = setTimeout(() => {
        setDisplayedContent(prev => prev + content[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 10); // Typing speed
      return () => clearTimeout(timeout);
    } else {
      if (onComplete) onComplete();
    }
  }, [currentIndex, content, onComplete]);

  return <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">{displayedContent}</ReactMarkdown>;
};

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [contextData, setContextData] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { selectedCar } = useCarsContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      initializeChat();
    }
  }, [isOpen, selectedCar]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    // Focus input when chat opens
    if (isOpen && !loading && !initializing) {
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, loading, initializing]);

  const initializeChat = async () => {
    setInitializing(true);
    try {
      const key = await getGeminiApiKey();
      setApiKey(key);

      if (!key) {
        setMessages([{
          role: 'model',
          parts: 'Please configure your Gemini API Key in Settings to start chatting with your data.'
        }]);
        setInitializing(false);
        return;
      }

      if (!selectedCar) {
        setMessages([{
          role: 'model',
          parts: 'Please select a vehicle to start analyzing data.'
        }]);
        setInitializing(false);
        return;
      }

      // Gather Context
      const sessions = await getSessions(selectedCar.id);
      const recentSessions = sessions.slice(0, 5).map(s => ({
        date: s.uploaded_at,
        filename: s.source_filename,
        duration: s.duration_seconds,
        summary: s.summary
      }));

      setContextData({
        vehicle: {
          name: selectedCar.name,
          notes: selectedCar.notes
        },
        recent_sessions: recentSessions,
        session_count: sessions.length
      });

      if (messages.length === 0) {
        setMessages([{
          role: 'model',
          parts: `Hi! I'm Car Insights AI. I've analyzed the data for your ${selectedCar.name}. How can I help you today?`
        }]);
      }

    } catch (error) {
      console.error('Failed to init chat', error);
      toast({ title: 'Error', description: 'Failed to initialize chat context', variant: 'destructive' });
    } finally {
      setInitializing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !apiKey || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', parts: userMessage }]);
    setLoading(true);

    try {
      const modelName = await getGeminiModel() || 'gemini-2.5-flash';
      
      // Filter out system messages or error prompts from history if needed, 
      // but usually we just pass the conversation.
      // We pass 'messages' which includes the initial greeting, 
      // but the API expects a clean history.
      // Let's filter out the initial greeting if it was generated locally and not by the model in a real session.
      // Actually, for a stateless API call like we implemented, we pass the history.
      
      // Clean history for API (exclude the greeting if it's the very first message and locally generated)
      const apiHistory = messages.slice(1); 

      const response = await chatWithVehicleData(
        apiKey,
        apiHistory,
        userMessage,
        contextData,
        modelName
      );

      setMessages(prev => [...prev, { role: 'model', parts: response }]);
    } catch (error) {
      console.error('Chat error', error);
      toast({ title: 'Error', description: 'Failed to get response from AI', variant: 'destructive' });
      setMessages(prev => [...prev, { role: 'model', parts: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 transition-all duration-300",
          isOpen ? "rotate-90 scale-0 opacity-0" : "scale-100 opacity-100"
        )}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-6 right-6 w-[90vw] sm:w-[400px] h-[600px] max-h-[80vh] z-50 transition-all duration-300 transform origin-bottom-right",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-10 pointer-events-none"
        )}
      >
        <Card className="h-full flex flex-col shadow-2xl border-primary/20">
          <CardHeader className="p-4 border-b bg-muted/30 flex flex-row items-center justify-between sticky top-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Car Insights AI</CardTitle>
                <p className="text-[10px] text-muted-foreground">
                  {selectedCar ? selectedCar.name : 'No Vehicle Selected'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 overflow-hidden relative flex flex-col">
            <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
                <div className="space-y-4 pb-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex w-full gap-2",
                        msg.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.role === 'model' && (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mt-1">
                          <Bot className="w-3 h-3 text-primary" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm max-w-[80%]",
                          msg.role === 'user' 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-foreground"
                        )}
                      >
                         {msg.role === 'model' && msg.animate ? (
                             <TypewriterMarkdown content={msg.parts} />
                          ) : (
                             <div className={msg.role === 'model' ? "prose prose-sm dark:prose-invert max-w-none" : "whitespace-pre-wrap"}>
                                 {msg.role === 'model' ? (
                                     <ReactMarkdown>{msg.parts}</ReactMarkdown>
                                 ) : (
                                     msg.parts
                                 )}
                             </div>
                          )
                          }
                         {msg.parts.includes('Please configure your Gemini API Key') && (
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                className="mt-2 w-full text-xs"
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/settings');
                                }}
                            >
                                Go to Settings
                            </Button>
                         )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-6 h-6 rounded-full bg-primary flex-shrink-0 flex items-center justify-center mt-1">
                          <User className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mt-1">
                          <Bot className="w-3 h-3 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-1 h-9">
                           <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                           <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                           <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                  )}
                </div>
            </div>
          </CardContent>

          <CardFooter className="p-3 border-t bg-background">
            <form 
                className="flex w-full gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                }}
            >
              <Input
                ref={inputRef}
                placeholder={apiKey ? "Ask about your vehicle..." : "API Key required"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading || !apiKey || initializing}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={loading || !apiKey || !input.trim() || initializing}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
