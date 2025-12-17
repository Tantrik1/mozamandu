import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const INTERNAL_ROUTES = new Set([
  '/shop',
  '/products',
  '/contact',
  '/about',
  '/faq',
  '/privacy',
  '/terms',
  '/shipping',
  '/auth',
  '/dashboard',
  '/admin',
  '/admin/chatbot-knowledge',
  '/admin/settings',
  '/admin/analytics',
  '/admin/analytics-settings',
]);

const ROUTE_LABELS: Record<string, string> = {
  '/contact': 'Contact',
};

function renderInlineMarkdown(text: string) {
  const parts: Array<{ type: 'text' | 'bold'; value: string }> = [];
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'bold', value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts.map((p, idx) =>
    p.type === 'bold' ? (
      <strong key={idx} className="font-semibold">
        {p.value}
      </strong>
    ) : (
      <span key={idx}>{p.value}</span>
    )
  );
}

function renderInlineMarkdownWithLinks(text: string, onInternalNavigate?: () => void) {
  const parts: Array<{ type: 'text' | 'bold'; value: string }> = [];
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'bold', value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts.map((p, idx) =>
    p.type === 'bold' ? (
      <strong key={idx} className="font-semibold">
        {renderLinkifiedText(p.value, onInternalNavigate)}
      </strong>
    ) : (
      <span key={idx}>{renderLinkifiedText(p.value, onInternalNavigate)}</span>
    )
  );
}

function renderLinkifiedText(text: string, onInternalNavigate?: () => void) {
  const parts: React.ReactNode[] = [];
  const tokenRegex = /(https?:\/\/[^\s)]+)|(\/[a-zA-Z0-9][a-zA-Z0-9\/-]*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    // External URL
    if (token.startsWith('http://') || token.startsWith('https://')) {
      parts.push(
        <a
          key={`${match.index}-${token}`}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 text-primary hover:text-primary/80"
        >
          {token}
        </a>
      );
      lastIndex = match.index + token.length;
      continue;
    }

    // Internal route
    if (token.startsWith('/') && (INTERNAL_ROUTES.has(token) || token.startsWith('/admin'))) {
      const label = ROUTE_LABELS[token] ?? token;
      parts.push(
        <Link
          key={`${match.index}-${token}`}
          to={token}
          onClick={onInternalNavigate}
          className="underline underline-offset-2 text-primary hover:text-primary/80"
        >
          {label}
        </Link>
      );
      lastIndex = match.index + token.length;
      continue;
    }

    // Fallback: leave as plain text (e.g. unknown /path)
    parts.push(token);
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.map((p, idx) => (typeof p === 'string' ? <span key={idx}>{p}</span> : p));
}

function renderMarkdownLite(content: string, onInternalNavigate?: () => void) {
  const lines = content.split(/\r?\n/);
  const blocks: Array<{ type: 'p' | 'ul'; lines: string[] }> = [];

  let currentPara: string[] = [];
  let currentList: string[] = [];

  const flushPara = () => {
    if (currentPara.length) {
      blocks.push({ type: 'p', lines: [...currentPara] });
      currentPara = [];
    }
  };

  const flushList = () => {
    if (currentList.length) {
      blocks.push({ type: 'ul', lines: [...currentList] });
      currentList = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const isBullet = /^\s*[-*]\s+/.test(line);

    if (line.trim() === '') {
      flushList();
      flushPara();
      continue;
    }

    if (isBullet) {
      flushPara();
      currentList.push(line.replace(/^\s*[-*]\s+/, ''));
      continue;
    }

    flushList();
    currentPara.push(line);
  }

  flushList();
  flushPara();

  return (
    <div className="space-y-2">
      {blocks.map((b, idx) => {
        if (b.type === 'ul') {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1">
              {b.lines.map((li, liIdx) => (
                <li key={liIdx} className="leading-relaxed">
                  {renderInlineMarkdownWithLinks(li, onInternalNavigate)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={idx} className="leading-relaxed whitespace-pre-wrap">
            {renderInlineMarkdownWithLinks(b.lines.join('\n'), onInternalNavigate)}
          </p>
        );
      })}
    </div>
  );
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mentionedProducts?: MentionedProduct[];
}

interface MentionedProduct {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
}

interface ChatResponse {
  success: boolean;
  response: string;
  mentionedProducts?: MentionedProduct[];
  error?: string;
}

const INITIAL_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! 👋 I'm your Mozamandu shopping assistant. I can help you find the perfect products. What are you looking for today?",
  timestamp: new Date(),
};

export function ProductChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Prevent background scroll on mobile when chat is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const message = inputValue.trim();
    if (!message || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build conversation history (exclude welcome message)
      const conversationHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      const { data, error } = await supabase.functions.invoke<ChatResponse>('product-chatbot', {
        body: {
          message,
          conversationHistory,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data?.response || "I'm sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
        mentionedProducts: data?.mentionedProducts,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  return (
    <>
      {/* Chat Toggle Button - Fixed position */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed z-50 flex items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "bottom-4 right-4 h-14 w-14",
          "sm:bottom-6 sm:right-6 sm:h-16 sm:w-16",
          isOpen && "scale-0 opacity-0"
        )}
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed z-[1000] flex flex-col bg-background border shadow-2xl transition-all duration-300",
          // Mobile: Full screen
          "inset-0 rounded-none",
          // Tablet and up: Floating window
          "sm:inset-auto sm:bottom-6 sm:right-6 sm:rounded-2xl",
          "sm:w-[400px] sm:h-[600px] sm:max-h-[80vh]",
          // Large screens
          "lg:w-[420px] lg:h-[650px]",
          // Animation
          isOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none sm:translate-y-8"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground sm:rounded-t-2xl pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-foreground/20">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Shopping Assistant</h3>
              <p className="text-xs opacity-80">Ask me about products</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetChat}
              className="text-primary-foreground hover:bg-primary-foreground/20 text-xs"
            >
              New Chat
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                {/* Message Content */}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted rounded-tl-sm"
                  )}
                >
                  <div className="text-sm leading-relaxed">
                    {message.role === 'assistant' ? renderMarkdownLite(message.content, () => setIsOpen(false)) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                  
                  {/* Mentioned Products */}
                  {message.mentionedProducts && message.mentionedProducts.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.mentionedProducts.map((product) => (
                        <Link
                          key={product.id}
                          to={`/product/${product.id}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-lg bg-background/50 hover:bg-background transition-colors group"
                        >
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-md"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                              <Bot className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                              {product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Rs {product.price.toLocaleString()}
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t bg-background pb-[env(safe-area-inset-bottom)]">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about products..."
              disabled={isLoading}
              className="flex-1 rounded-full px-4 text-sm"
            />
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="rounded-full h-10 w-10 flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Powered by AI • Ask me anything about our products
          </p>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[900] sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
