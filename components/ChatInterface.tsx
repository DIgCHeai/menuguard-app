import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { SendIcon } from './icons/SendIcon';

interface ChatInterfaceProps {
    conversation: ChatMessage[];
    onSendMessage: (message: string) => void;
    isLoading: boolean;
}

const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-xl lg:max-w-2xl px-4 py-2 rounded-xl whitespace-pre-wrap ${
                    isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                }`}
            >
                {message.content}
            </div>
        </div>
    );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ conversation, onSendMessage, isLoading }) => {
    const [input, setInput] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll to bottom when new messages are added
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [conversation]);


    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    return (
        <div className="mt-8 bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Allergy Assistant Chat</h3>
            <div 
                ref={chatContainerRef}
                className="h-80 overflow-y-auto space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4"
                aria-live="polite"
            >
                {conversation.map((msg, index) => (
                    <ChatBubble key={index} message={msg} />
                ))}
                {isLoading && conversation[conversation.length - 1]?.role === 'user' && (
                     <div className="flex justify-start">
                        <div className="flex items-center space-x-2 bg-gray-200 text-gray-800 px-4 py-2 rounded-xl">
                           <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                           <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                           <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                )}
            </div>
            <form onSubmit={handleSend} className="flex items-center space-x-3">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a follow-up question..."
                    className="flex-grow w-full px-4 py-2 bg-white border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
                    aria-label="Your message"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="flex-shrink-0 bg-green-600 text-white rounded-full p-3 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    aria-label="Send message"
                >
                   <SendIcon className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
};

export default ChatInterface;