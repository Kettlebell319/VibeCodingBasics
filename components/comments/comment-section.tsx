'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Reply, Send } from 'lucide-react';

interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  replies?: Comment[];
}

interface CommentSectionProps {
  questionId: string;
  questionTitle: string;
}

export default function CommentSection({ questionId, questionTitle }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');

  // Load comments on component mount
  useEffect(() => {
    fetchComments();
  }, [questionId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/comments?questionId=${questionId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!name.trim() || !email.trim() || !content.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          parentId: replyingTo,
          authorName: name.trim(),
          authorEmail: email.trim(),
          content: content.trim(),
        }),
      });

      if (response.ok) {
        // Reset form
        setName('');
        setEmail('');
        setContent('');
        setShowForm(false);
        setReplyingTo(null);
        
        // Show success message
        alert('Comment submitted! It will appear after moderation.');
        
        // Refresh comments (in case auto-approval is enabled)
        fetchComments();
      } else {
        alert('Failed to submit comment. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Failed to submit comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const CommentForm = ({ isReply = false, onCancel }: { isReply?: boolean; onCancel?: () => void }) => (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      <h4 className="font-semibold text-gray-900">
        {isReply ? 'Reply to comment' : `Add your thoughts on "${questionTitle}"`}
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <Textarea
        placeholder="Share your insights, ask follow-up questions, or provide additional context..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        required
      />
      
      <div className="flex gap-2">
        <Button 
          onClick={submitComment} 
          disabled={submitting}
          className="flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Submitting...' : 'Submit Comment'}
        </Button>
        {isReply && onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      
      <p className="text-xs text-gray-500">
        Comments are moderated and will appear after approval. Be constructive and respectful.
      </p>
    </div>
  );

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`${isReply ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
      <div className="bg-white rounded-lg border p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {comment.author_name.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-gray-900">{comment.author_name}</span>
          </div>
          <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
        </div>
        
        <p className="text-gray-700 mb-3 whitespace-pre-wrap">{comment.content}</p>
        
        {!isReply && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setReplyingTo(comment.id);
              setShowForm(true);
            }}
            className="text-blue-600 hover:text-blue-800 p-0 h-auto"
          >
            <Reply className="h-3 w-3 mr-1" />
            Reply
          </Button>
        )}
      </div>
      
      {/* Show replies */}
      {comment.replies && comment.replies.map((reply) => (
        <CommentItem key={reply.id} comment={reply} isReply={true} />
      ))}
    </div>
  );

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Discussion ({comments.length})
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Add Comment Button */}
        {!showForm && (
          <Button 
            onClick={() => {
              setShowForm(true);
              setReplyingTo(null);
            }}
            className="w-full"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Join the Discussion
          </Button>
        )}

        {/* Comment Form */}
        {showForm && (
          <CommentForm 
            isReply={replyingTo !== null}
            onCancel={() => {
              setShowForm(false);
              setReplyingTo(null);
              setName('');
              setEmail('');
              setContent('');
            }}
          />
        )}

        {/* Comments List */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}