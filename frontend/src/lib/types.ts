export type PostStatus = "draft" | "published";

// Extensible content type. Only "article" is implemented today; the schema and
// types are ready for photo/video/journal/gallery posts later.
export type PostType = "article" | "photo" | "video" | "journal" | "gallery";

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // Markdown source
  coverImage: string | null;
  status: PostStatus;
  type: PostType;
  tags: string[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
  publishedAt: string | null; // ISO
}

export interface PostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImage?: string | null;
  status?: PostStatus;
  type?: PostType;
  tags?: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface MediaAsset {
  id: string;
  filename: string;
  originalName: string;
  mime: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  read: boolean;
}
