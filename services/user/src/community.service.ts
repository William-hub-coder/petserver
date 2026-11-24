import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CommunityCategory,
  CommunityMediaType,
  CommunityPostStatus,
  prisma,
} from '@petpal/db';

const CATEGORIES = new Set(['experience', 'daily', 'help', 'other']);
const MEDIA_TYPES = new Set(['image', 'video', 'text']);

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
}

@Injectable()
export class CommunityService {
  private mapPost(
    post: {
      id: string;
      userId: string;
      title: string;
      content: string;
      category: CommunityCategory;
      mediaType: CommunityMediaType;
      mediaUrls: unknown;
      coverUrl: string | null;
      likeCount: number;
      commentCount: number;
      createdAt: Date;
      user: { id: string; nickname: string; avatarUrl: string | null };
    },
    liked?: boolean,
  ) {
    const mediaUrls = asStringArray(post.mediaUrls);
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      category: post.category,
      mediaType: post.mediaType,
      mediaUrls,
      coverUrl: post.coverUrl || mediaUrls[0] || null,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      liked: !!liked,
      createdAt: post.createdAt.toISOString(),
      author: {
        id: post.user.id,
        nickname: post.user.nickname,
        avatarUrl: post.user.avatarUrl,
      },
    };
  }

  async listPosts(opts: {
    category?: string;
    cursor?: string;
    limit?: number;
    userId?: string;
  }) {
    const take = Math.min(Math.max(opts.limit ?? 20, 1), 50);
    const where: {
      status: CommunityPostStatus;
      category?: CommunityCategory;
    } = { status: CommunityPostStatus.published };

    if (opts.category && opts.category !== 'all' && CATEGORIES.has(opts.category)) {
      where.category = opts.category as CommunityCategory;
    }

    const rows = await prisma.communityPost.findMany({
      where,
      take: take + 1,
      ...(opts.cursor
        ? { cursor: { id: opts.cursor }, skip: 1 }
        : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? page[page.length - 1]?.id : null;

    let likedSet = new Set<string>();
    if (opts.userId && page.length) {
      const likes = await prisma.communityLike.findMany({
        where: {
          userId: opts.userId,
          postId: { in: page.map((p) => p.id) },
        },
        select: { postId: true },
      });
      likedSet = new Set(likes.map((l) => l.postId));
    }

    return {
      items: page.map((p) => this.mapPost(p, likedSet.has(p.id))),
      nextCursor,
    };
  }

  async getPost(id: string, userId?: string) {
    const post = await prisma.communityPost.findFirst({
      where: { id, status: CommunityPostStatus.published },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });
    if (!post) throw new NotFoundException({ code: 'NOT_FOUND', message: '帖子不存在' });

    let liked = false;
    if (userId) {
      const like = await prisma.communityLike.findUnique({
        where: { postId_userId: { postId: id, userId } },
      });
      liked = !!like;
    }
    return this.mapPost(post, liked);
  }

  async createPost(
    userId: string | undefined,
    body: {
      title?: string;
      content?: string;
      category?: string;
      mediaType?: string;
      mediaUrls?: string[];
      coverUrl?: string;
    },
  ) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '请先登录' });
    const title = body.title?.trim();
    if (!title) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '请填写标题' });
    }
    if (title.length > 60) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '标题最多 60 字' });
    }
    const content = (body.content || '').trim();
    if (content.length > 2000) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '正文最多 2000 字' });
    }
    const category = (
      CATEGORIES.has(body.category || '') ? body.category : 'daily'
    ) as CommunityCategory;
    const mediaType = (
      MEDIA_TYPES.has(body.mediaType || '') ? body.mediaType : 'image'
    ) as CommunityMediaType;
    let mediaUrls = asStringArray(body.mediaUrls).slice(0, 9);
    if (mediaType === 'video') mediaUrls = mediaUrls.slice(0, 1);
    if (mediaType === 'text') mediaUrls = [];
    if (mediaType !== 'text' && mediaUrls.length === 0) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '请至少添加一张图片或视频' });
    }

    const post = await prisma.communityPost.create({
      data: {
        userId,
        title,
        content,
        category,
        mediaType,
        mediaUrls,
        coverUrl: body.coverUrl || mediaUrls[0] || null,
      },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });
    return this.mapPost(post, false);
  }

  async toggleLike(userId: string | undefined, postId: string) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '请先登录' });
    const post = await prisma.communityPost.findFirst({
      where: { id: postId, status: CommunityPostStatus.published },
    });
    if (!post) throw new NotFoundException({ code: 'NOT_FOUND', message: '帖子不存在' });

    const existing = await prisma.communityLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.communityLike.delete({ where: { id: existing.id } }),
        prisma.communityPost.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      const updated = await prisma.communityPost.findUniqueOrThrow({ where: { id: postId } });
      return { liked: false, likeCount: Math.max(0, updated.likeCount) };
    }

    await prisma.$transaction([
      prisma.communityLike.create({ data: { postId, userId } }),
      prisma.communityPost.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);
    const updated = await prisma.communityPost.findUniqueOrThrow({ where: { id: postId } });
    return { liked: true, likeCount: updated.likeCount };
  }

  async listComments(postId: string) {
    const post = await prisma.communityPost.findFirst({
      where: { id: postId, status: CommunityPostStatus.published },
    });
    if (!post) throw new NotFoundException({ code: 'NOT_FOUND', message: '帖子不存在' });

    const rows = await prisma.communityComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });
    return {
      items: rows.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        author: {
          id: c.user.id,
          nickname: c.user.nickname,
          avatarUrl: c.user.avatarUrl,
        },
      })),
    };
  }

  async addComment(userId: string | undefined, postId: string, content?: string) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '请先登录' });
    const text = content?.trim();
    if (!text) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '请填写评论' });
    }
    if (text.length > 500) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '评论最多 500 字' });
    }
    const post = await prisma.communityPost.findFirst({
      where: { id: postId, status: CommunityPostStatus.published },
    });
    if (!post) throw new NotFoundException({ code: 'NOT_FOUND', message: '帖子不存在' });

    const comment = await prisma.$transaction(async (tx) => {
      const c = await tx.communityComment.create({
        data: { postId, userId, content: text },
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
      });
      await tx.communityPost.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      });
      return c;
    });

    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: {
        id: comment.user.id,
        nickname: comment.user.nickname,
        avatarUrl: comment.user.avatarUrl,
      },
    };
  }
}
