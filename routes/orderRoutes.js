const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const auth = require('../middleware/auth');

// Create order from cart
router.post('/', auth, async (req, res) => {
  try {
    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.item');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).send({ error: 'Cart is empty' });
    }

    // Calculate total and prepare order items
    let totalAmount = 0;
    const orderItems = cart.items.map(cartItem => {
      const itemTotal = cartItem.item.price * cartItem.quantity;
      totalAmount += itemTotal;
      
      return {
        item: cartItem.item._id,
        name: cartItem.item.name,
        price: cartItem.item.price,
        quantity: cartItem.quantity
      };
    });

    // Create order
    const order = new Order({
      user: req.user._id,
      items: orderItems,
      totalAmount,
      status: 'pending'
    });

    await order.save();

    // Clear cart
    cart.items = [];
    await cart.save();

    // Populate order items
    await order.populate('items.item');

    res.status(201).send({
      message: 'Order placed successfully',
      order
    });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Get user's orders
router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.item')
      .sort({ createdAt: -1 });
    
    res.send(orders);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Get single order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('items.item');

    if (!order) {
      return res.status(404).send({ error: 'Order not found' });
    }

    res.send(order);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;
