/**
 * Subscription Management Routes
 */

import { Hono } from 'hono';
import { authenticate, authorize } from '../middleware/auth';
import * as subscriptionService from '../services/subscription-service';

const app = new Hono();

// Get all plans
app.get('/plans', authenticate, async (c) => {
  try {
    const plans = await subscriptionService.getPlans(c.env.DB);
    return c.json({ success: true, data: plans });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get company subscription
app.get('/company/:companyId', authenticate, authorize('subscriptions.read'), async (c) => {
  try {
    const companyId = parseInt(c.req.param('companyId'));
    const subscription = await subscriptionService.getCompanySubscription(c.env.DB, companyId);
    return c.json({ success: true, data: subscription });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Request subscription
app.post('/request', authenticate, authorize('subscriptions.create'), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const subscriptionId = await subscriptionService.requestSubscription(c.env.DB, {
      ...body,
      requested_by: user.id,
    });
    return c.json({ success: true, data: { id: subscriptionId } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Approve subscription
app.post('/:id/approve', authenticate, authorize('subscriptions.approve'), async (c) => {
  try {
    const user = c.get('user');
    const subscriptionId = parseInt(c.req.param('id'));
    await subscriptionService.approveSubscription(c.env.DB, subscriptionId, user.id);
    return c.json({ success: true, message: 'Subscription approved' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Check limits
app.get('/limits/:companyId', authenticate, authorize('subscriptions.read'), async (c) => {
  try {
    const companyId = parseInt(c.req.param('companyId'));
    const limits = await subscriptionService.checkSubscriptionLimits(c.env.DB, companyId);
    return c.json({ success: true, data: limits });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
