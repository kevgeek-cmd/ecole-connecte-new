import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import api from '../utils/api';
import { Send, User, Users, Circle, Paperclip, FileText, X } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface Message {
    id: string;
    content: string;
    senderId: string;
    receiverId?: string | null;
    classId?: string | null;
    attachmentUrl?: string | null;
    attachmentType?: 'IMAGE' | 'PDF' | 'DOC' | 'VIDEO' | null;
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
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isConnected, setIsConnected] = useState(false);

    // Supabase Realtime for new messages
    useEffect(() => {
        if (!user) return;

        console.log('[Supabase] Subscribing to Message table...');
        const channel = supabase
            .channel('public:Message')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'Message' 
            }, async (payload) => {
                console.log('[Supabase] New message received:', payload.new);
                const newMessage = payload.new as any;
                
                setMessages(prev => {
                    // Check if message already exists by ID
                    if (prev.find(m => String(m.id) === String(newMessage.id))) return prev;
                    
                    // ALSO: Check if we have an optimistic message with same content and sender
                    // that was sent very recently (within 5 seconds)
                    const now = new Date();
                    const duplicateOptimistic = prev.find(m => 
                        String(m.id).startsWith('temp-') && 
                        m.content === newMessage.content &&
                        String(m.senderId) === String(newMessage.senderId) &&
                        (now.getTime() - new Date(m.createdAt).getTime()) < 5000
                    );

                    if (duplicateOptimistic) {
                        // Replace the temp message with the real one to avoid double display
                        return prev.map(m => m.id === duplicateOptimistic.id ? {
                            ...newMessage,
                            sender: newMessage.sender || duplicateOptimistic.sender
                        } : m);
                    }
                    
                    const formattedMessage: Message = {
                        ...newMessage,
                        sender: newMessage.sender || { firstName: '...', lastName: '' }
                    };
                    return [...prev, formattedMessage];
                });
            })
            .subscribe((status) => {
                console.log('[Supabase] Subscription status:', status);
                if (status === 'SUBSCRIBED') setIsConnected(true);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Use a ref for user to access current value inside socket listeners
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    useEffect(() => {
        if (!token) return;

        // Use the same URL as the API, ensuring it's the base URL without /api
        const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        console.log('[Socket] Attempting connection to:', socketUrl);

        const newSocket = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            timeout: 10000
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected with ID:', newSocket.id);
        });

        newSocket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        newSocket.on('receive_message', (message: Message) => {
            console.log('[Socket] Message received via socket:', message);
            // Still handling via socket for legacy/fallback if needed, though Supabase is primary now
            setMessages((prev) => {
                const isDuplicate = prev.some(m => String(m.id) === String(message.id));
                if (isDuplicate) return prev;
                return [...prev, message];
            });
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
                const resCourses = await api.get('/courses');
                if (resCourses.data && resCourses.data.length > 0) {
                    const classMap = new Map();
                    resCourses.data.forEach((c: any) => {
                        if (c.class && !classMap.has(c.class.id)) {
                            classMap.set(c.class.id, {
                                id: c.class.id,
                                name: c.class.name,
                                type: 'class'
                            });
                        }
                    });
                    classes = Array.from(classMap.values());
                }
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedFile) || !socket || !selectedContact) return;

        let attachmentUrl = null;
        let attachmentType = null;

        if (selectedFile) {
            setIsUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', selectedFile);
                const res = await api.post('/chat/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                console.log("Upload success:", res.data);
                attachmentUrl = res.data.url;
                attachmentType = res.data.type;
            } catch (error: any) {
                console.error("Upload failed details:", error.response?.data || error.message);
                alert(`Erreur lors de l'envoi du fichier: ${error.response?.data?.message || error.message}`);
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        const messageData = {
            content: newMessage || (selectedFile ? `📎 ${selectedFile.name}` : ''),
            receiverId: selectedContact.type === 'user' ? selectedContact.id : undefined,
            classId: selectedContact.type === 'class' ? selectedContact.id : undefined,
            attachmentUrl,
            attachmentType
        };

        // Optimistic update
        const tempMessage: Message = {
            id: `temp-${Date.now()}`,
            content: messageData.content,
            senderId: user?.id || '',
            receiverId: messageData.receiverId,
            classId: messageData.classId,
            attachmentUrl: attachmentUrl,
            attachmentType: attachmentType as any,
            sender: {
                id: user?.id || '',
                firstName: user?.firstName || '',
                lastName: user?.lastName || ''
            },
            createdAt: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, tempMessage]);

        try {
            const res = await api.post('/chat/send', messageData);
            const savedMessage = res.data;
            
            // Replace the temporary message with the saved one
            setMessages(prev => {
                // Check if the message was already added by Supabase Realtime
                const alreadyExists = prev.some(m => String(m.id) === String(savedMessage.id));
                if (alreadyExists) {
                    // Remove the temp message since the real one is already there
                    return prev.filter(m => m.id !== tempMessage.id);
                }
                // Otherwise replace the temp message
                return prev.map(m => m.id === tempMessage.id ? savedMessage : m);
            });
            
            setNewMessage('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error("Error sending message via API:", error);
            alert("Erreur lors de l'envoi du message");
            // Optionally remove the temp message or mark it as failed
            setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        }
    };

    // Filter messages for current view
    const displayMessages = messages.filter(m => {
        if (!selectedContact || !user) return false;
        
        const currentUserId = String(user.id);
        const contactId = String(selectedContact.id);
        
        if (selectedContact.type === 'class') {
            return m.classId === contactId; 
        } else {
            const senderId = String(m.senderId);
            const receiverId = m.receiverId ? String(m.receiverId) : null;
            
            return (senderId === contactId && receiverId === currentUserId) ||
                   (senderId === currentUserId && receiverId === contactId);
        }
    });

    const renderAttachment = (msg: Message) => {
        if (!msg.attachmentUrl) return null;
        
        if (msg.attachmentType === 'IMAGE') {
            return (
                <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
                    <img src={msg.attachmentUrl} alt="attachment" className="max-w-[200px] rounded-lg border border-gray-200" />
                </a>
            );
        } else if (msg.attachmentType === 'VIDEO') {
            return (
                <video src={msg.attachmentUrl} controls className="max-w-[200px] mt-2 rounded-lg" />
            );
        } else {
            return (
                <a 
                    href={msg.attachmentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-blue-600 hover:underline"
                >
                    {msg.attachmentType === 'PDF' ? <FileText className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
                    <span>Voir la pièce jointe</span>
                </a>
            );
        }
    };

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Sidebar */}
            <div className="w-1/4 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-700 dark:text-gray-200">Discussions</h2>
                    <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                        <span className="text-[10px] text-gray-500 uppercase">{isConnected ? 'Connecté' : 'Déconnecté'}</span>
                    </div>
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
                            {displayMessages.map((msg) => {
                                const isMe = String(msg.senderId) === String(user?.id);
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[70%] p-3 rounded-lg ${
                                            isMe 
                                                ? 'bg-blue-600 text-white rounded-br-none' 
                                                : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm rounded-bl-none'
                                        }`}>
                                            {!isMe && <p className="text-xs font-bold mb-1 opacity-70">{msg.sender.firstName} {msg.sender.lastName}</p>}
                                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                            {renderAttachment(msg)}
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
                        <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
                            {selectedFile && (
                                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm">
                                    <Paperclip className="w-4 h-4 text-gray-500" />
                                    <span className="truncate max-w-xs dark:text-gray-300">{selectedFile.name}</span>
                                    <button 
                                        type="button" 
                                        onClick={() => setSelectedFile(null)}
                                        className="ml-auto hover:text-red-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-2 items-end">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition"
                                    title="Joindre un fichier"
                                >
                                    <Paperclip className="w-5 h-5" />
                                </button>
                                <input
                                    type="text"
                                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                    placeholder="Écrivez votre message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <button 
                                    type="submit" 
                                    className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition flex items-center justify-center w-10 h-10 disabled:opacity-50"
                                    disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                                >
                                    {isUploading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Send className="w-5 h-5" />}
                                </button>
                            </div>
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
