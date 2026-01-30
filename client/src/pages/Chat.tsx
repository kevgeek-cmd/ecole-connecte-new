import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import api from '../utils/api';
import { Send, User, Users, Circle, Paperclip, FileText, Image as ImageIcon, Video, X } from 'lucide-react';

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

    // Use a ref for user to access current value inside socket listeners
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    useEffect(() => {
        if (!token) return;

        const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
            auth: { token }
        });

        newSocket.on('connect', () => {
            console.log('Connected to socket');
        });

        newSocket.on('receive_message', (message: Message) => {
            setMessages((prev) => {
                // If message is from me, replace the temporary optimistic message
                if (message.senderId === userRef.current?.id) {
                     // Find a temp message (id is timestamp-like) with same content
                     const tempIdx = prev.findIndex(m => 
                        m.senderId === userRef.current?.id && 
                        m.content === message.content && 
                        m.id.length > 10 // Simple heuristic for timestamp vs uuid
                     );
                     
                     if (tempIdx !== -1) {
                         const newPrev = [...prev];
                         newPrev[tempIdx] = message;
                         return newPrev;
                     }
                     
                     // If no temp message found (maybe race condition or didn't optimize), check for duplicates by ID
                     if (prev.some(m => m.id === message.id)) return prev;
                } else {
                     // Check for duplicates
                     if (prev.some(m => m.id === message.id)) return prev;
                }
                
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
                // For now relying on users/contacts
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
                attachmentUrl = res.data.url;
                attachmentType = res.data.type;
            } catch (error) {
                console.error("Upload failed", error);
                alert("Erreur lors de l'envoi du fichier");
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
            id: Date.now().toString(),
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

        socket.emit('send_message', messageData);
        setNewMessage('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
