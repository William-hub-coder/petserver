/**
 * 毛孩子圈子示例帖（双列 Feed 演示）
 */
import { PrismaClient, CommunityCategory, CommunityMediaType } from '@prisma/client';

const prisma = new PrismaClient();

const posts: Array<{
  id: string;
  phone: string;
  nickname: string;
  title: string;
  content: string;
  category: CommunityCategory;
  coverUrl: string;
  mediaUrls: string[];
  likeCount: number;
  comments: string[];
}> = [
  {
    id: 'cpost_1',
    phone: '13800000001',
    nickname: '豆豆家长',
    title: '新手养猫第一周避坑清单',
    content:
      '刚接回家别急着洗澡；先准备独立小天地；猫砂盆远离食盆；前三天少投喂罐头。有问题欢迎评论区一起聊～',
    category: CommunityCategory.experience,
    coverUrl:
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&q=80',
    mediaUrls: [
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80',
      'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&q=80',
    ],
    likeCount: 128,
    comments: ['太实用了！正在接猫', '独立小天地真的很重要'],
  },
  {
    id: 'cpost_2',
    phone: '13800000088',
    nickname: '奶茶家长',
    title: '周末带狗狗去公园晒太阳',
    content: '今天阳光正好，旺财在草地上打了个滚，回家又睡了一下午。幸福就是这么简单。',
    category: CommunityCategory.daily,
    coverUrl:
      'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&q=80',
    mediaUrls: ['https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&q=80'],
    likeCount: 86,
    comments: ['好治愈啊', '旺财好可爱'],
  },
  {
    id: 'cpost_3',
    phone: '13800000001',
    nickname: '豆豆家长',
    title: '猫咪突然不吃猫粮怎么办？',
    content:
      '这两天只舔罐头汁，主粮几乎不动。精神还行，也有喝水。有没有家长遇到过？是换粮还是要去医院？',
    category: CommunityCategory.help,
    coverUrl:
      'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=600&q=80',
    mediaUrls: ['https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=800&q=80'],
    likeCount: 42,
    comments: ['先观察有没有呕吐拉稀', '建议称一下体重，超过两天建议就医'],
  },
  {
    id: 'cpost_4',
    phone: '13800000088',
    nickname: '奶茶家长',
    title: '自制冻干零食小技巧',
    content: '鸡胸肉切小块、低温烘干，比买的干净也更省。注意密封冷藏，一次别做太多。',
    category: CommunityCategory.experience,
    coverUrl:
      'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80',
    mediaUrls: ['https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80'],
    likeCount: 201,
    comments: ['收藏了！', '温度大概多少合适？'],
  },
  {
    id: 'cpost_5',
    phone: '13800000001',
    nickname: '豆豆家长',
    title: '第一次剪指甲手忙脚乱',
    content: '准备了罐头贿赂，剪两下就喂一口，比强按效果好太多。分享给手残党家长。',
    category: CommunityCategory.daily,
    coverUrl:
      'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=600&q=80',
    mediaUrls: ['https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=800&q=80'],
    likeCount: 67,
    comments: ['贿赂大法好'],
  },
  {
    id: 'cpost_6',
    phone: '13800000088',
    nickname: '奶茶家长',
    title: '如何挑选靠谱宠物医院？',
    content:
      '看信用分和实地考察记录，候诊区是否干净、药品是否分柜。宠伴严选店可以对照考察报告再约。',
    category: CommunityCategory.experience,
    coverUrl:
      'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&q=80',
    mediaUrls: ['https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80'],
    likeCount: 155,
    comments: ['严选报告真的有用'],
  },
];

async function main() {
  const existing = await prisma.communityPost.count();
  if (existing > 0) {
    console.log('Seed community: skip (already %d posts)', existing);
    return;
  }

  for (const p of posts) {
    const user = await prisma.user.upsert({
      where: { phone: p.phone },
      update: { nickname: p.nickname },
      create: {
        phone: p.phone,
        nickname: p.nickname,
        privacyAcceptedAt: new Date(),
        privacyVersion: '2026.1',
      },
    });

    await prisma.communityPost.create({
      data: {
        id: p.id,
        userId: user.id,
        title: p.title,
        content: p.content,
        category: p.category,
        mediaType: CommunityMediaType.image,
        mediaUrls: p.mediaUrls,
        coverUrl: p.coverUrl,
        likeCount: p.likeCount,
        commentCount: p.comments.length,
        comments: {
          create: p.comments.map((content, i) => ({
            userId: user.id,
            content,
            createdAt: new Date(Date.now() - (i + 1) * 3600_000),
          })),
        },
      },
    });
  }

  console.log('Seed community: posts=%d', posts.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
