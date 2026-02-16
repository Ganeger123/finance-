import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles, User } from 'lucide-react';
import { assistantApi } from '../apiClient';

const FinBot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'bot'; content: string }[]>([
        { role: 'bot', content: 'Hello! I am FinBot. How can I help you with your finances today? You can ask about your spending, income, or savings.' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        try {
            // Direct call to our backend assistant endpoint
            const response = await assistantApi.query(userMsg);
            setMessages(prev => [...prev, { role: 'bot', content: response.data.response }]);
        } catch (error) {
            console.error("FinBot Error:", error);
            setMessages(prev => [...prev, { role: 'bot', content: "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later." }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-80 md:w-96 h-[500px] bg-white rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
                    {/* Header */}
                    <div className="bg-[#374b91] p-6 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                                <Bot className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="font-black text-sm tracking-tight">FinBot AI</h4>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Always Online</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium ${msg.role === 'user'
                                    ? 'bg-[#374b91] text-white rounded-tr-none shadow-lg shadow-indigo-100'
                                    : 'bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-slate-100">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask me anything..."
                                className="w-full pl-5 pr-14 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all font-medium text-slate-700"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#374b91] text-white rounded-xl flex items-center justify-center hover:bg-[#202a54] transition-all disabled:opacity-50 active:scale-95"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-90 group relative ${isOpen ? 'bg-rose-500 rotate-90' : 'bg-[#374b91] hover:scale-105'
                    }`}
            >
                <div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-150 transition-transform duration-700 opacity-0 group-hover:opacity-100"></div>
                {isOpen ? (
                    <X className="w-8 h-8 text-white" />
                ) : (
                    <MessageSquare className="w-8 h-8 text-white" />
                )}

                {!isOpen && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full"></div>
                )}
            </button>
        </div>
    );
};

export default FinBot;
