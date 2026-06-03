/* ============================================================
   routes/blog.js — Blog post CRUD routes
   GET    /api/blog          — list published posts (public)
   GET    /api/blog/all      — list all posts (admin)
   GET    /api/blog/:slug    — get post by slug, +views (public)
   POST   /api/blog          — create post (admin)
   PUT    /api/blog/:id      — update post (admin)
   DELETE /api/blog/:id      — delete post (admin)
   ============================================================ */

'use strict';

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/** Convert a title to a URL-safe slug */
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Ensure slug uniqueness by appending a number if needed */
async function uniqueSlug(base, excludeId = null) {
  let slug    = slugify(base);
  let counter = 0;
  let candidate = slug;

  while (true) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    counter++;
    candidate = `${slug}-${counter}`;
  }
}

/* ── GET / — List published posts (public) ───────────────── */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, tag, search } = req.query;
    const skip  = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take  = parseInt(limit, 10);
    const where = { published: true };

    if (tag)    where.tags    = { contains: tag };
    if (search) where.OR = [
      { title:   { contains: search } },
      { excerpt: { contains: search } },
      { tags:    { contains: search } },
    ];

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, slug: true, excerpt: true,
          coverImage: true, tags: true, views: true, createdAt: true, updatedAt: true,
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    return res.json({
      posts,
      pagination: {
        total,
        page:       parseInt(page, 10),
        limit:      take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    console.error('[Blog/list]', err.message);
    return res.status(500).json({ error: 'Failed to fetch blog posts.' });
  }
});

/* ── GET /all — All posts including drafts (admin) ───────── */
router.get('/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip  = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take  = parseInt(limit, 10);
    const where = {};

    if (search) where.OR = [
      { title: { contains: search } },
      { tags:  { contains: search } },
    ];

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.blogPost.count({ where }),
    ]);

    return res.json({
      posts,
      pagination: {
        total,
        page:       parseInt(page, 10),
        limit:      take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    console.error('[Blog/all]', err.message);
    return res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

/* ── GET /:slug — Get single post, increment views ──────── */
router.get('/:slug', async (req, res) => {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug: req.params.slug },
    });

    if (!post || !post.published) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    // Increment views asynchronously
    prisma.blogPost.update({
      where: { id: post.id },
      data:  { views: { increment: 1 } },
    }).catch(console.error);

    return res.json(post);
  } catch (err) {
    console.error('[Blog/single]', err.message);
    return res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

/* ── POST / — Create post (admin) ────────────────────────── */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, content, excerpt, coverImage, tags, published } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    const slug = await uniqueSlug(title);

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        content,
        excerpt:    excerpt    || null,
        coverImage: coverImage || null,
        tags:       tags       || null,
        published:  published  ?? false,
      },
    });

    return res.status(201).json({ success: true, post });
  } catch (err) {
    console.error('[Blog/create]', err.message);
    return res.status(500).json({ error: 'Failed to create post.' });
  }
});

/* ── PUT /:id — Update post (admin) ──────────────────────── */
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, content, excerpt, coverImage, tags, published } = req.body;
    const data = {};

    if (title      !== undefined) {
      data.title = title;
      data.slug  = await uniqueSlug(title, req.params.id);
    }
    if (content    !== undefined) data.content    = content;
    if (excerpt    !== undefined) data.excerpt    = excerpt;
    if (coverImage !== undefined) data.coverImage = coverImage;
    if (tags       !== undefined) data.tags       = tags;
    if (published  !== undefined) data.published  = published;

    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data,
    });

    return res.json({ success: true, post });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Post not found.' });
    console.error('[Blog/update]', err.message);
    return res.status(500).json({ error: 'Failed to update post.' });
  }
});

/* ── DELETE /:id — Delete post (admin) ───────────────────── */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.blogPost.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Post deleted.' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Post not found.' });
    console.error('[Blog/delete]', err.message);
    return res.status(500).json({ error: 'Failed to delete post.' });
  }
});

module.exports = router;
