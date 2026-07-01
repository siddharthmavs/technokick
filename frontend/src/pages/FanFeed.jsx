import React, { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import Header from "../components/Header";
import { Footer } from "./Home";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const PAGE_SIZE = 10;

function timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function Avatar({ nickname, size = 9 }) {
    const colors = ["bg-brick", "bg-teal", "bg-mustard", "bg-ink", "bg-[#5B8C5A]", "bg-[#4A6FA5]"];
    const idx = nickname.charCodeAt(0) % colors.length;
    return (
        <div className={`${colors[idx]} text-white font-heading uppercase flex items-center justify-center rounded-full shrink-0 border-2 border-ink`}
            style={{ width: `${size * 4}px`, height: `${size * 4}px`, fontSize: `${size * 1.5}px` }}>
            {nickname[0]}
        </div>
    );
}

/* ── Nickname Setup ── */
function NicknameSetup({ onCreated }) {
    const [nick, setNick] = useState("");
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const r = await api.post("/fan/profile", { nickname: nick.trim() });
            toast.success(`Welcome to Fan Fight, @${r.data.nickname}! 🔥`);
            onCreated(r.data);
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        } finally { setSaving(false); }
    };

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="retro-card bg-white p-8 max-w-md w-full text-center shadow-retro-lg">
                <div className="text-5xl mb-4">🔥</div>
                <h2 className="font-heading text-3xl uppercase">Pick Your <span className="text-brick">Fighter Name</span></h2>
                <p className="font-body opacity-70 mt-2 mb-6">Your nickname is shown instead of your real name. Permanent once set — choose wisely!</p>
                <form onSubmit={submit} className="space-y-4">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-heading text-ink/40 text-lg">@</span>
                        <input
                            value={nick}
                            onChange={(e) => setNick(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                            maxLength={24}
                            required
                            placeholder="CoolNickname99"
                            className="input-retro pl-8 w-full text-center font-heading text-xl tracking-wider"
                            data-testid="nickname-input"
                        />
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Letters, numbers, - and _ only · 2–24 chars</p>
                    <button disabled={saving || nick.trim().length < 2} className="btn-retro btn-brick w-full disabled:opacity-40 disabled:cursor-not-allowed" data-testid="nickname-submit">
                        {saving ? "Claiming…" : "Claim My Name →"}
                    </button>
                </form>
            </div>
        </div>
    );
}

/* ── Create Post ── */
function CreatePost({ profile, onPosted }) {
    const [content, setContent] = useState("");
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef();

    const pickImage = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
        setImage(f);
        setPreview(URL.createObjectURL(f));
    };

    const removeImage = () => { setImage(null); setPreview(null); if (fileRef.current) fileRef.current.value = ""; };

    const submit = async () => {
        if (!content.trim() && !image) { toast.error("Add some text or an image!"); return; }
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append("content", content.trim());
            if (image) fd.append("image", image);
            const r = await api.post("/fan/posts", fd, { headers: { "Content-Type": "multipart/form-data" } });
            setContent(""); removeImage();
            onPosted(r.data);
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        } finally { setSaving(false); }
    };

    return (
        <div className="retro-card bg-white p-4 flex gap-3" data-testid="create-post-box">
            <Avatar nickname={profile.nickname} size={10} />
            <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-widest opacity-50 mb-1">@{profile.nickname}</div>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Drop your hottest take, meme caption, or trash talk… ⚽🔥"
                    maxLength={500}
                    rows={3}
                    className="input-retro w-full resize-none text-sm"
                    data-testid="post-content"
                />
                {preview && (
                    <div className="relative mt-2 inline-block">
                        <img src={preview} alt="preview" className="max-h-48 border-2 border-ink object-cover" />
                        <button onClick={removeImage} className="absolute -top-2 -right-2 bg-brick text-white border-2 border-ink w-6 h-6 font-heading text-sm flex items-center justify-center">✕</button>
                    </div>
                )}
                <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                    <button type="button" onClick={() => fileRef.current?.click()} className="btn-retro !text-xs !py-1.5 !px-3 flex items-center gap-1.5">
                        📸 Add Image
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] opacity-40">{content.length}/500</span>
                        <button onClick={submit} disabled={saving || (!content.trim() && !image)}
                            className="btn-retro btn-brick !text-xs !py-1.5 !px-4 disabled:opacity-40 disabled:cursor-not-allowed" data-testid="post-submit">
                            {saving ? "Posting…" : "Post 🔥"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Comment ── */
function CommentItem({ comment, postId, currentUserId, onReply, onDelete, depth = 0 }) {
    const [likeCount, setLikeCount] = useState(comment.like_count);
    const [liked, setLiked] = useState(comment.liked);

    const toggleLike = async () => {
        try {
            const r = await api.post(`/fan/comments/${comment.id}/like`);
            setLiked(r.data.liked);
            setLikeCount(r.data.like_count);
        } catch (e) { toast.error("Could not like"); }
    };

    return (
        <div className={`flex gap-2.5 ${depth > 0 ? "ml-8 mt-2" : "mt-3"}`} data-testid={`comment-${comment.id}`}>
            <Avatar nickname={comment.nickname} size={7} />
            <div className="flex-1 min-w-0">
                <div className="bg-cream border-2 border-ink px-3 py-2 rounded-sm">
                    <span className="font-heading text-xs uppercase text-brick">@{comment.nickname}</span>
                    <span className="font-mono text-[9px] opacity-40 ml-2">{timeAgo(comment.created_at)}</span>
                    <p className="font-body text-sm mt-0.5 break-words">{comment.content}</p>
                </div>
                <div className="flex items-center gap-3 mt-1 ml-1">
                    <button onClick={toggleLike} className={`font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 ${liked ? "text-brick font-bold" : "opacity-50 hover:opacity-80"}`}>
                        ❤ {likeCount > 0 && likeCount}
                    </button>
                    {depth === 0 && (
                        <button onClick={() => onReply(comment)} className="font-mono text-[10px] uppercase tracking-wider opacity-50 hover:opacity-80">
                            Reply
                        </button>
                    )}
                    {comment.user_id === currentUserId && (
                        <button onClick={() => onDelete(comment.id)} className="font-mono text-[10px] uppercase tracking-wider opacity-40 hover:text-brick">
                            Delete
                        </button>
                    )}
                </div>
                {comment.replies?.map((r) => (
                    <CommentItem key={r.id} comment={r} postId={postId} currentUserId={currentUserId} onReply={onReply} onDelete={onDelete} depth={1} />
                ))}
            </div>
        </div>
    );
}

/* ── Comment Section ── */
function CommentSection({ postId, currentUserId }) {
    const [comments, setComments] = useState(null);
    const [text, setText] = useState("");
    const [replyTo, setReplyTo] = useState(null);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef();

    const load = useCallback(async () => {
        const r = await api.get(`/fan/posts/${postId}/comments`);
        setComments(r.data);
    }, [postId]);

    useEffect(() => { load(); }, [load]);

    const handleReply = (c) => {
        setReplyTo(c);
        setText(`@${c.nickname} `);
        inputRef.current?.focus();
    };

    const submit = async (e) => {
        e.preventDefault();
        const content = text.trim();
        if (!content) return;
        setSaving(true);
        try {
            await api.post(`/fan/posts/${postId}/comments`, { content, parent_id: replyTo?.id || null });
            setText(""); setReplyTo(null);
            load();
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        } finally { setSaving(false); }
    };

    const handleDelete = async (cid) => {
        if (!window.confirm("Delete comment?")) return;
        try { await api.delete(`/fan/comments/${cid}`); load(); } catch (e) { toast.error("Could not delete"); }
    };

    return (
        <div className="mt-3 border-t-2 border-ink/10 pt-3" data-testid={`comments-${postId}`}>
            {comments === null ? (
                <div className="font-mono text-[10px] uppercase opacity-40 animate-pulse">Loading comments…</div>
            ) : comments.length === 0 ? (
                <div className="font-mono text-[10px] uppercase opacity-40">No comments yet — be first!</div>
            ) : (
                comments.map((c) => (
                    <CommentItem key={c.id} comment={c} postId={postId} currentUserId={currentUserId} onReply={handleReply} onDelete={handleDelete} />
                ))
            )}
            <form onSubmit={submit} className="flex gap-2 mt-3" data-testid={`comment-form-${postId}`}>
                <input
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={replyTo ? `Replying to @${replyTo.nickname}…` : "Write a comment…"}
                    maxLength={500}
                    className="input-retro flex-1 !text-sm !py-1.5"
                    data-testid={`comment-input-${postId}`}
                />
                {replyTo && (
                    <button type="button" onClick={() => { setReplyTo(null); setText(""); }} className="btn-retro !text-xs !py-1.5 !px-2">✕</button>
                )}
                <button disabled={!text.trim() || saving} className="btn-retro btn-ink !text-xs !py-1.5 !px-3 disabled:opacity-40" data-testid={`comment-submit-${postId}`}>
                    {saving ? "…" : "Send"}
                </button>
            </form>
        </div>
    );
}

/* ── Post Card ── */
function PostCard({ post: initPost, currentUserId, onDelete }) {
    const [post, setPost] = useState(initPost);
    const [showComments, setShowComments] = useState(false);

    const toggleLike = async () => {
        try {
            const r = await api.post(`/fan/posts/${post.id}/like`);
            setPost((p) => ({ ...p, liked: r.data.liked, like_count: r.data.like_count }));
        } catch (e) { toast.error("Could not like"); }
    };

    return (
        <div className="retro-card bg-white p-4" data-testid={`post-${post.id}`}>
            {/* Header */}
            <div className="flex items-start gap-3 justify-between">
                <div className="flex items-center gap-2.5">
                    <Avatar nickname={post.nickname} size={10} />
                    <div>
                        <div className="font-heading text-base uppercase text-ink">@{post.nickname}</div>
                        <div className="font-mono text-[10px] opacity-40">{timeAgo(post.created_at)}</div>
                    </div>
                </div>
                {post.user_id === currentUserId && (
                    <button onClick={() => onDelete(post.id)} className="font-mono text-[10px] opacity-30 hover:text-brick hover:opacity-100 transition-opacity">✕</button>
                )}
            </div>

            {/* Content */}
            {post.content && (
                <p className="font-body text-sm mt-3 leading-relaxed break-words">{post.content}</p>
            )}
            {post.image_url && (
                <div className="mt-3 border-2 border-ink overflow-hidden">
                    <img
                        src={`${BACKEND_URL}${post.image_url}`}
                        alt="post"
                        className="w-full object-cover max-h-96"
                        loading="lazy"
                    />
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t-2 border-ink/10">
                <button onClick={toggleLike}
                    className={`flex items-center gap-1.5 font-heading text-sm uppercase transition-colors ${post.liked ? "text-brick" : "text-ink/50 hover:text-brick"}`}
                    data-testid={`like-btn-${post.id}`}>
                    <span>{post.liked ? "❤️" : "🤍"}</span>
                    <span>{post.like_count > 0 ? post.like_count : ""}</span>
                </button>
                <button
                    onClick={() => setShowComments((v) => !v)}
                    className="flex items-center gap-1.5 font-heading text-sm uppercase text-ink/50 hover:text-teal transition-colors"
                    data-testid={`comments-toggle-${post.id}`}>
                    💬 {post.comment_count > 0 ? post.comment_count : ""} {showComments ? "Hide" : "Comments"}
                </button>
            </div>

            {showComments && (
                <CommentSection postId={post.id} currentUserId={currentUserId} />
            )}
        </div>
    );
}

/* ── Main Page ── */
export default function FanFeed() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [posts, setPosts] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get("/fan/profile")
            .then((r) => setProfile(Object.keys(r.data).length ? r.data : null))
            .catch(() => setProfile(null))
            .finally(() => setProfileLoading(false));
    }, []);

    const loadPosts = useCallback(async (pg = 1, replace = true) => {
        setLoading(true);
        try {
            const r = await api.get(`/fan/posts?page=${pg}&page_size=${PAGE_SIZE}`);
            setPosts((prev) => replace ? r.data.posts : [...prev, ...r.data.posts]);
            setTotal(r.data.total);
            setPage(pg);
        } catch (e) {
            toast.error("Could not load posts");
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { if (profile) loadPosts(1); }, [profile, loadPosts]);

    const handlePosted = (newPost) => setPosts((p) => [newPost, ...p]);

    const handleDelete = async (postId) => {
        if (!window.confirm("Delete this post?")) return;
        try {
            await api.delete(`/fan/posts/${postId}`);
            setPosts((p) => p.filter((x) => x.id !== postId));
            setTotal((t) => t - 1);
            toast.success("Post deleted.");
        } catch (e) { toast.error("Could not delete post"); }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="App min-h-screen bg-cream">
            <Header />
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
                {/* Page Header */}
                <div className="text-center mb-8">
                    <span className="stamp stamp-brick">Fan Zone · Meme Arena</span>
                    <h1 className="font-heading text-5xl md:text-6xl mt-3 uppercase">Fan <span className="underline-wiggle">Fight</span> 🔥</h1>
                    <p className="font-body opacity-70 mt-2">Drop your hottest takes, memes, and trash talk. No mercy.</p>
                </div>

                {profileLoading ? (
                    <div className="ticket p-8 text-center font-heading text-xl uppercase animate-pulse">Loading…</div>
                ) : !profile ? (
                    <NicknameSetup onCreated={(p) => { setProfile(p); }} />
                ) : (
                    <div className="space-y-5">
                        {/* Identity bar */}
                        <div className="flex items-center gap-2 justify-end">
                            <Avatar nickname={profile.nickname} size={7} />
                            <span className="font-heading text-sm uppercase">You are <span className="text-brick">@{profile.nickname}</span></span>
                        </div>

                        {/* Create post */}
                        <CreatePost profile={profile} onPosted={handlePosted} />

                        {/* Feed */}
                        {loading && posts.length === 0 ? (
                            <div className="ticket p-8 text-center font-heading text-xl uppercase animate-pulse">Loading feed…</div>
                        ) : posts.length === 0 ? (
                            <div className="ticket p-8 text-center">
                                <div className="font-heading text-2xl uppercase">No posts yet</div>
                                <p className="font-body opacity-60 mt-2">Be the first fighter to drop a post!</p>
                            </div>
                        ) : (
                            <>
                                {posts.map((p) => (
                                    <PostCard key={p.id} post={p} currentUserId={user?.id} onDelete={handleDelete} />
                                ))}
                                {page < totalPages && (
                                    <button onClick={() => loadPosts(page + 1, false)} disabled={loading}
                                        className="btn-retro w-full !text-sm disabled:opacity-40" data-testid="load-more-btn">
                                        {loading ? "Loading…" : "Load More Posts"}
                                    </button>
                                )}
                                {page >= totalPages && posts.length > 0 && (
                                    <p className="text-center font-mono text-[10px] uppercase tracking-widest opacity-40">You've seen all the fire 🔥</p>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
