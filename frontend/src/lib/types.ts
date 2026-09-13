export type PostStatus = "draft" | "published";

// Extensible content type. "article" and "gallery" are implemented; the schema
// and types are ready for photo/video/journal posts later.
export type PostType = "article" | "gallery" | "photo" | "video" | "journal";

export interface GalleryImage {
  url: string;
  caption: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // Markdown source (intro text for galleries)
  coverImage: string | null;
  images: GalleryImage[]; // used by gallery/photo posts
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
  images?: GalleryImage[];
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

export type ProjectStatus = "draft" | "published";

export interface ProjectRecord {
  id: string;
  title: string;
  description: string;
  image: string | null;
  techStacks: string[];
  githubUrl: string | null;
  liveUrl: string | null;
  status: ProjectStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectInput {
  title: string;
  description?: string;
  image?: string | null;
  techStacks?: string[];
  githubUrl?: string | null;
  liveUrl?: string | null;
  status?: ProjectStatus;
}
