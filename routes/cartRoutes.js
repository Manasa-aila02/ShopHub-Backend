const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Item = require('../models/Item');
const auth = require('../middleware/auth');

// Get user's cart
router.get('/', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.item');
    
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
      await cart.save();
    }

    res.send(cart);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Add item to cart
router.post('/add', auth, async (req, res) => {
  try {
    const { itemId, quantity = 1 } = req.body;

    // Verify item exists
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).send({ error: 'Item not found' });
    }

    // Check stock
    if (item.stock < quantity) {
      return res.status(400).send({ error: 'Insufficient stock' });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Check if item already in cart
    const existingItemIndex = cart.items.findIndex(
      i => i.item.toString() === itemId
    );

    if (existingItemIndex > -1) {
      // Update quantity
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({ item: itemId, quantity });
    }

    cart.updatedAt = Date.now();
    await cart.save();
    await cart.populate('items.item');

    res.send(cart);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Update item quantity in cart
router.put('/update/:itemId', auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).send({ error: 'Quantity must be at least 1' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).send({ error: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(i => i.item.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).send({ error: 'Item not in cart' });
    }

    cart.items[itemIndex].quantity = quantity;
    cart.updatedAt = Date.now();
    await cart.save();
    await cart.populate('items.item');

    res.send(cart);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Remove item from cart
router.delete('/remove/:itemId', auth, async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).send({ error: 'Cart not found' });
    }

    cart.items = cart.items.filter(i => i.item.toString() !== itemId);
    cart.updatedAt = Date.now();
    await cart.save();
    await cart.populate('items.item');

    res.send(cart);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Clear cart
router.delete('/clear', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).send({ error: 'Cart not found' });
    }

    cart.items = [];
    cart.updatedAt = Date.now();
    await cart.save();

    res.send(cart);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

module.exports = router;
