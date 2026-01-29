import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import api from '../utils/api';
import { Send, User, Users, Circle } from 'lucide-react';

interface Message {
    id: string;
    content: string;
    senderId: string;
    receiverId?: string | null;
    classId?: string | null;
    sender: {
        id: string;
        firstName: string;
        lastName: string;
    };
    createdAt: string;
}

interface Contact {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    isOnline?: boolean;
    // For classes (if we mix them in contacts list or separate)
    name?: string; 
    type?: 'user' | 'class';
}

const Chat = () => {
    const { user, token } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!token) return;

        const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
            auth: { token }
        });

        newSocket.on('connect', () => {
            console.log('Connected to socket');
        });

        newSocket.on('receive_message', (message: Message) => {
            setMessages((prev) => [...prev, message]);
        });
        
        // Listen for user status updates
        newSocket.on('user_status_update', (data: { userId: string, isOnline: boolean }) => {
            setContacts(prev => prev.map(c => 
                c.id === data.userId ? { ...c, isOnline: data.isOnline } : c
            ));
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [token]);

    useEffect(() => {
        fetchContacts();
    }, []);

    useEffect(() => {
        if (selectedContact) {
            fetchHistory(selectedContact);
            if (socket && selectedContact.type === 'class') {
                socket.emit('join_class', selectedContact.id);
            }
        }
    }, [selectedContact, socket]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchContacts = async () => {
        try {
            // Fetch users (students/teachers)
            const resUsers = await api.get('/chat/contacts');
            const users = resUsers.data.map((u: any) => ({ ...u, type: 'user' }));

            // Fetch classes (for Teachers/Students)
            // Ideally we should have an endpoint for this, but reusing existing ones or fetching from chat controller
            // For simplicity, let's assume the user has access to some classes. 
            // We can fetch courses and get classes from there.
            
            let classes: Contact[] = [];
            if (user?.role === 'TEACHER') {
                const resCourses = await api.get('/courses');
                // Unique classes
                const classMap = new Map();
                resCourses.data.forEach((c: any) => {
                    if (!classMap.has(c.class.id)) {
                        classMap.set(c.class.id, {
                            id: c.class.id,
                            name: c.class.name,
                            type: 'class'
                        });
                    }
                });
                classes = Array.from(classMap.values());
            } else if (user?.role === 'STUDENT') {
                // Get my class
                // Student usually belongs to one class in a year, or multiple enrollments.
                // We can fetch enrollments? 
                // Let's rely on backend providing this later or just users for now.
                // Or fetch from /users/me (if it returns class info)
            }

            setContacts([...classes, ...users]);
        } catch (error) {
            console.error("Error fetching contacts", error);
        }
    };

    const fetchHistory = async (contact: Contact) => {
        try {
            let url = '';
            if (contact.type === 'class') {
                url = `/chat/history/class/${contact.id}`;
            } else {
                url = `/chat/history/user/${contact.id}`;
            }
            const res = await api.get(url);
            setMessages(res.data);
        } catch (error) {
            console.error("Error fetching history", error);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket || !selectedContact) return;

        const messageData = {
            content: newMessage,
            receiverId: selectedContact.type === 'user' ? selectedContact.id : undefined,
            classId: selectedContact.type === 'class' ? selectedContact.id : undefined
        };

        socket.emit('send_message', messageData);
        setNewMessage('');
    };

    // Filter messages for current view (optimistic update or just display filter)
    // Actually the socket listener adds all messages. We should filter them or rely on backend fetch.
    // Ideally we only append if it matches current contact.
    const displayMessages = messages.filter(m => {
        if (!selectedContact) return false;
        if (selectedContact.type === 'class') {
            return m.classId === selectedContact.id; // classId needed in Message interface locally if we want to filter
        } else {
            return (m.senderId === selectedContact.id && m.receiverId === user?.id) ||
                   (m.senderId === user?.id && m.receiverId === selectedContact.id);
        }
    });
    // Note: The Message interface above didn't include classId/receiverId. Let's add them.

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Sidebar */}
            <div className="w-1/4 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <h2 className="font-semibold text-gray-700 dark:text-gray-200">Discussions</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {contacts.map(contact => (
                        <div 
                            key={contact.id}
                            onClick={() => setSelectedContact(contact)}
                            className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition ${selectedContact?.id === contact.id ? 'bg-blue-50 dark:bg-gray-700' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-gray-200 dark:bg-gray-600 p-2 rounded-full">
                                    {contact.type === 'class' ? <Users className="w-5 h-5 text-gray-600 dark:text-gray-300" /> : <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {contact.type === 'class' ? contact.name : `${contact.firstName} ${contact.lastName}`}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {contact.type === 'class' ? 'Classe' : (contact.role === 'TEACHER' ? 'Professeur' : 'Élève')}
                                    </p>
                                </div>
                                {contact.isOnline && <Circle className="w-3 h-3 text-green-500 fill-current ml-auto" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
                {selectedContact ? (
                    <>
                        {/* Header */}
                        <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                                    {selectedContact.type === 'class' ? <Users className="w-5 h-5 text-blue-600 dark:text-blue-300" /> : <User className="w-5 h-5 text-blue-600 dark:text-blue-300" />}
                                </div>
                                <h3 className="font-bold text-gray-800 dark:text-white">
                                    {selectedContact.type === 'class' ? selectedContact.name : `${selectedContact.firstName} ${selectedContact.lastName}`}
                                </h3>
                             </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {displayMessages.map((msg, idx) => {
                                const isMe = msg.senderId === user?.id;
                                return (
                                    <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] rounded-lg p-3 ${isMe ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'}`}>
                                            {!isMe && <p className="text-xs font-bold mb-1 opacity-70">{msg.sender.firstName} {msg.sender.lastName}</p>}
                                            <p className="text-sm">{msg.content}</p>
                                            <p className="text-[10px] mt-1 opacity-70 text-right">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                            <input
                                type="text"
                                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Écrivez votre message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <button 
                                type="submit" 
                                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition flex items-center justify-center w-10 h-10"
                                disabled={!newMessage.trim()}
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                        Sélectionnez une discussion pour commencer
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;
