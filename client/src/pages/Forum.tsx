import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { MessageSquare, Plus, Search, Filter, MessageCircle, User, Paperclip, X, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: string;
  fileUrl?: string;
  fileType?: string;
  authorId: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  _count?: {
    comments: number;
  };
  comments?: ForumComment[];
}

interface ForumComment {
  id: string;
  content: string;
  authorId: string;
  postId?: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface PostForm {
  title: string;
  content: string;
  category: string;
  file?: FileList;
}

interface CommentForm {
  content: string;
}

const Forum = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Forms
  const { register: registerPost, handleSubmit: handleSubmitPost, reset: resetPost } = useForm<PostForm>();
  const { register: registerComment, handleSubmit: handleSubmitComment, reset: resetComment } = useForm<CommentForm>();

  useEffect(() => {
    fetchPosts();
  }, [filterCategory, searchTerm]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewPost = (newPost: ForumPost) => {
      // Apply filter check
      if (filterCategory !== "ALL" && newPost.category !== filterCategory) return;
      // Apply search check (basic)
      if (searchTerm && !newPost.title.toLowerCase().includes(searchTerm.toLowerCase()) && !newPost.content.toLowerCase().includes(searchTerm.toLowerCase())) return;

      setPosts((prev) => {
        if (prev.some(p => p.id === newPost.id)) return prev;
        return [newPost, ...prev];
      });
    };

    const handlePostDeleted = (id: string) => {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      if (selectedPost?.id === id) {
        setSelectedPost(null);
      }
    };

    const handleNewComment = (comment: ForumComment & { author: { id: string; firstName: string; lastName: string; role: string } }) => {
      // Update comment count in list
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === comment.postId) {
            return {
              ...p,
              _count: {
                ...p._count,
                comments: (p._count?.comments || 0) + 1,
              },
            };
          }
          return p;
        })
      );

      // If viewing the post, add comment
      if (selectedPost?.id === comment.postId) {
        setSelectedPost((prev) => {
          if (!prev) return null;
          if (prev.comments?.some(c => c.id === comment.id)) return prev;
          return {
            ...prev,
            comments: [...(prev.comments || []), comment],
            _count: {
              ...prev._count,
              comments: (prev._count?.comments || 0) + 1,
            },
          };
        });
      }
    };

    const handleCommentDeleted = ({ id, postId }: { id: string; postId: string }) => {
       // Update comment count in list
       setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              _count: {
                ...p._count,
                comments: Math.max((p._count?.comments || 1) - 1, 0),
              },
            };
          }
          return p;
        })
      );

      // If viewing the post, remove comment
      if (selectedPost?.id === postId) {
        setSelectedPost((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            comments: prev.comments?.filter((c) => c.id !== id),
            _count: {
              ...prev._count,
              comments: Math.max((prev._count?.comments || 1) - 1, 0),
            },
          };
        });
      }
    };

    socket.on("forum:post_created", handleNewPost);
    socket.on("forum:post_deleted", handlePostDeleted);
    socket.on("forum:comment_created", handleNewComment);
    socket.on("forum:comment_deleted", handleCommentDeleted);

    return () => {
      socket.off("forum:post_created", handleNewPost);
      socket.off("forum:post_deleted", handlePostDeleted);
      socket.off("forum:comment_created", handleNewComment);
      socket.off("forum:comment_deleted", handleCommentDeleted);
    };
  }, [socket, filterCategory, searchTerm, selectedPost?.id]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterCategory !== "ALL") params.category = filterCategory;
      if (searchTerm) params.search = searchTerm;
      
      const res = await api.get('/forum', { params });
      setPosts(res.data);
    } catch (error) {
      console.error("Error fetching posts", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPostDetails = async (id: string) => {
    try {
      const res = await api.get(`/forum/${id}`);
      setSelectedPost(res.data);
    } catch (error) {
      console.error("Error fetching post details", error);
    }
  };

  const onCreatePost = async (data: PostForm) => {
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('content', data.content);
      formData.append('category', data.category);
      if (data.file && data.file[0]) {
        formData.append('file', data.file[0]);
      }

      await api.post('/forum', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      resetPost();
      setIsCreateModalOpen(false);
      fetchPosts();
    } catch (error) {
      console.error("Error creating post", error);
    }
  };

  const onAddComment = async (data: CommentForm) => {
    if (!selectedPost) return;
    try {
      await api.post(`/forum/${selectedPost.id}/comments`, data);
      resetComment();
      fetchPostDetails(selectedPost.id); // Refresh comments
    } catch (error) {
      console.error("Error adding comment", error);
    }
  };

  const onDeletePost = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce sujet ?")) return;
    try {
      await api.delete(`/forum/${id}`);
      if (selectedPost?.id === id) setSelectedPost(null);
      fetchPosts();
    } catch (error) {
      console.error("Error deleting post", error);
    }
  };

  const onDeleteComment = async (commentId: string) => {
    if (!confirm("Supprimer ce commentaire ?")) return;
    try {
      await api.delete(`/forum/comments/${commentId}`);
      if (selectedPost) fetchPostDetails(selectedPost.id);
    } catch (error) {
      console.error("Error deleting comment", error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Forum École
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Espace d'échange et de partage de ressources pour toute l'école.
          </p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus className="w-5 h-5" />
          Nouveau Sujet
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Rechercher un sujet..." 
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-gray-500 w-5 h-5" />
          <select 
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="ALL">Toutes catégories</option>
            <option value="GENERAL">Général</option>
            <option value="HOMEWORK">Devoirs</option>
            <option value="COURSE">Cours</option>
            <option value="ANNOUNCEMENT">Annonces</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posts List */}
        <div className="lg:col-span-1 space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Chargement...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-10 text-gray-500">Aucun sujet trouvé.</div>
          ) : (
            posts.map(post => (
              <div 
                key={post.id}
                onClick={() => fetchPostDetails(post.id)}
                className={`cursor-pointer p-4 rounded-xl border transition hover:shadow-md ${selectedPost?.id === post.id ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-500' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    post.category === 'ANNOUNCEMENT' ? 'bg-red-100 text-red-600' :
                    post.category === 'HOMEWORK' ? 'bg-yellow-100 text-yellow-600' :
                    post.category === 'COURSE' ? 'bg-green-100 text-green-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {post.category === 'ANNOUNCEMENT' ? 'Annonce' :
                     post.category === 'HOMEWORK' ? 'Devoir' :
                     post.category === 'COURSE' ? 'Cours' : 'Général'}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(post.createdAt), 'dd/MM', { locale: fr })}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">{post.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{post.content}</p>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {post.author.firstName} {post.author.lastName}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {post._count?.comments || 0}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Post Details */}
        <div className="lg:col-span-2">
          {selectedPost ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full max-h-[calc(100vh-250px)]">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedPost.title}</h2>
                  {(user?.id === selectedPost.authorId || user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN') && (
                    <button onClick={() => onDeletePost(selectedPost.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {selectedPost.author.firstName} {selectedPost.author.lastName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selectedPost.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    selectedPost.category === 'ANNOUNCEMENT' ? 'bg-red-100 text-red-600' :
                    selectedPost.category === 'HOMEWORK' ? 'bg-yellow-100 text-yellow-600' :
                    selectedPost.category === 'COURSE' ? 'bg-green-100 text-green-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedPost.category === 'ANNOUNCEMENT' ? 'Annonce' :
                     selectedPost.category === 'HOMEWORK' ? 'Devoir' :
                     selectedPost.category === 'COURSE' ? 'Cours' : 'Général'}
                  </span>
                </div>
                <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-300">
                  <p className="whitespace-pre-wrap">{selectedPost.content}</p>
                </div>
                {selectedPost.fileUrl && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center gap-3 border border-gray-200 dark:border-gray-600">
                    <Paperclip className="w-5 h-5 text-blue-500" />
                    <a href={selectedPost.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
                      Voir la pièce jointe
                    </a>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Commentaires ({selectedPost.comments?.length || 0})
                </h3>
                {selectedPost.comments?.map(comment => (
                  <div key={comment.id} className="flex gap-3 group">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {comment.author.firstName[0]}{comment.author.lastName[0]}
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg rounded-tl-none">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">
                            {comment.author.firstName} {comment.author.lastName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(comment.createdAt), 'dd MMM HH:mm', { locale: fr })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                      {(user?.id === comment.authorId || user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN') && (
                        <button 
                          onClick={() => onDeleteComment(comment.id)}
                          className="text-xs text-red-400 hover:text-red-600 mt-1 opacity-0 group-hover:opacity-100 transition"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Comment Input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                <form onSubmit={handleSubmitComment(onAddComment)} className="flex gap-2">
                  <input
                    {...registerComment('content', { required: true })}
                    type="text"
                    placeholder="Écrire un commentaire..."
                    className="flex-1 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button type="submit" className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition">
                    <SendIcon />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-10 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Sélectionnez un sujet pour voir les détails</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nouveau Sujet</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:bg-gray-100 p-1 rounded">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitPost(onCreatePost)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre</label>
                <input
                  {...registerPost('title', { required: true })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Sujet de la discussion"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie</label>
                <select
                  {...registerPost('category')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="GENERAL">Général</option>
                  <option value="HOMEWORK">Devoirs</option>
                  <option value="COURSE">Cours</option>
                  <option value="ANNOUNCEMENT">Annonce</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contenu</label>
                <textarea
                  {...registerPost('content', { required: true })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="De quoi voulez-vous parler ?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pièce jointe (Optionnel)</label>
                <input
                  {...registerPost('file')}
                  type="file"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Publier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default Forum;
