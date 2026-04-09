const { validationResult } = require('express-validator');
const Blog = require('../models/Blog');
const generateSlug = require('../utils/slugGenerator');

// POST /api/blog — admin only
const createPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, excerpt, author, tags, published } = req.body;

    let slug = generateSlug(title);

    // Ensure slug is unique
    const existing = await Blog.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const post = await Blog.create({
      title,
      slug,
      content,
      excerpt,
      author,
      tags,
      published,
    });

    return res.status(201).json({ message: 'Blog post created.', post });
  } catch (err) {
    console.error('Blog create error:', err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};

// GET /api/blog — public, paginated
const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { published: true };

    const total = await Blog.countDocuments(filter);
    const posts = await Blog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-content');

    return res.status(200).json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      posts,
    });
  } catch (err) {
    console.error('Blog fetch error:', err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};

// GET /api/blog/:slug — public
const getPostBySlug = async (req, res) => {
  try {
    const post = await Blog.findOne({ slug: req.params.slug, published: true });
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }
    return res.status(200).json({ post });
  } catch (err) {
    console.error('Blog fetch by slug error:', err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};

// PUT /api/blog/:slug — admin only
const updatePost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const post = await Blog.findOne({ slug: req.params.slug });
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const { title, content, excerpt, author, tags, published } = req.body;

    if (title && title !== post.title) {
      let newSlug = generateSlug(title);
      const existing = await Blog.findOne({ slug: newSlug });
      if (existing && existing._id.toString() !== post._id.toString()) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
      post.slug = newSlug;
      post.title = title;
    }

    if (content !== undefined) {post.content = content;}
    if (excerpt !== undefined) {post.excerpt = excerpt;}
    if (author !== undefined) {post.author = author;}
    if (tags !== undefined) {post.tags = tags;}
    if (published !== undefined) {post.published = published;}

    await post.save();

    return res.status(200).json({ message: 'Post updated.', post });
  } catch (err) {
    console.error('Blog update error:', err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};

// DELETE /api/blog/:slug — admin only
const deletePost = async (req, res) => {
  try {
    const post = await Blog.findOneAndDelete({ slug: req.params.slug });
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }
    return res.status(200).json({ message: 'Post deleted.' });
  } catch (err) {
    console.error('Blog delete error:', err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};

module.exports = { createPost, getPosts, getPostBySlug, updatePost, deletePost };
