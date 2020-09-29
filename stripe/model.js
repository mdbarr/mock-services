'use strict';

function Model (stripe) {
  this.context = (request, response, next) => {
    const timestamp = stripe.util.timestamp();
    const model = {
      identity: request.authorization.identity,
      admin: request.authorization.admin,
      requestId: request.requestId,
      timestamp,
      livemode: stripe.options.livemode,
      events: [],
      next,
    };

    model.send = (code, object) => {
      if (!stripe.options.silent) {
        console.json(object);
      }

      this.request({
        id: request.requestId,
        timestamp,
        method: request.method,
        url: request.url,
        parameters: request.params,
        query: request.query,
        body: request.body,
        statusCode: code,
        response: object,
      });

      response.send(code, object);
      response.end();

      for (const event of model.events) {
        stripe.webhooks.queueWebhooks({
          context: model,
          event,
        });
      }
    };

    return model;
  };

  this.list = function({
    items = [], url, paginate, query,
  }) {
    if (!Array.isArray(items)) {
      items = [ items ];
    }

    let has_more = false;

    if (paginate) {
      const limit = Number(query.limit) || 10;
      items = items.slice().sortByCreated();

      if (query.starting_after) {
        let starting_index = null;
        for (let s = 0; s < items.length; s++) {
          if (items[s].id === query.starting_after) {
            starting_index = s;
            break;
          }
        }
        if (starting_index !== null) {
          items = items.slice(starting_index + 1, items.length);
        }
      }

      if (query.ending_before) {
        let ending_index = null;
        for (let e = 0; e < items.length; e++) {
          if (items[e].id === query.ending_before) {
            ending_index = e;
            break;
          }
        }
        if (ending_index !== null) {
          items = items.slice(0, ending_index);
        }
      }

      items = items.filter((item) => {
        // Remove canceled items by default
        if (item.status === 'canceled' &&
            query.status !== 'canceled') {
          return false;
        }

        let match = true;

        if (query.created) {
          if (typeof query.created === 'string') {
            match &= item.created === Number(query.created);
          } else if (query.created.gt) {
            match &= item.created > Number(query.created.gt);
          } else if (query.created.gte) {
            match &= item.created >= Number(query.created.gte);
          } else if (query.created.lt) {
            match &= item.created < Number(query.created.lt);
          } else if (query.created.lte) {
            match &= item.created <= Number(query.created.lte);
          }
        }

        if (query.type) {
          query.type = query.type.toLowerCase();
          if (query.type.endsWith('*')) {
            match &= item.type.startsWith(query.type.replace('*', ''));
          } else {
            match &= item.type === query.type;
          }
        } else if (query.types && Array.isArray(query.types)) {
          for (const type of query.types) {
            if (item.type === type) {
              match &= true;
            }
          }
          match &= false;
        }

        return match;
      });

      if (items.length > limit) {
        has_more = true;
        items = items.slice(0, limit);
      }
    }

    const model = {
      object: 'list',
      data: items,
      has_more,
      total_count: items.length,
      url,
    };

    return model;
  };

  this.card = function({
    context, card, type, metadata,
  }) {
    const model = {
      id: `card_${ stripe.store.generateId(24) }`,
      object: 'card',
      address_city: card.address_city || null,
      address_country: card.address_country || null,
      address_line1: card.address_line1 || null,
      address_line1_check: card.address_line1 ? 'unchecked' : null,
      address_line2: card.address_line2 || null,
      address_state: card.address_state || null,
      address_zip: card.address_zip || null,
      address_zip_check: card.address_zip ? 'unchecked' : null,
      brand: type.brand,
      country: type.country,
      cvc_check: 'unchecked',
      dynamic_last4: null,
      exp_month: Number(card.exp_month),
      exp_year: Number(card.exp_year),
      fingerprint: stripe.store.generateId(16),
      funding: type.funding,
      last4: card.number.replace(/^(.*)(\d\d\d\d)$/g, '$2'),
      metadata: metadata || {},
      name: card.name || null,
      tokenization_method: null,
      create: stripe.util.timestamp(),
    };

    stripe.store.addCard(context.identity, model.id, model);

    return model;
  };

  this.token = function({
    context, card, clientIp,
  }) {
    const model = {
      id: `tok_${ stripe.store.generateId(24) }`,
      object: 'token',
      card,
      client_ip: clientIp,
      created: stripe.util.timestamp(),
      livemode: context.livemode,
      type: 'card',
      used: false,
    };

    stripe.store.addToken(context.identity, model.id, model);

    return model;
  };

  this.plan = function({
    context, id, amount, currency, interval, interval_count,
    metadata, name, statement_descriptor, trial_period_days,
  }) {
    const model = {
      id,
      object: 'plan',
      amount: Number(amount) || 0,
      created: stripe.util.timestamp(),
      currency,
      interval,
      interval_count: Number(interval_count) || 1,
      livemode: context.livemode,
      metadata: metadata || {},
      name,
      statement_descriptor: statement_descriptor || null,
      trial_period_days: Number(trial_period_days) || null,
    };

    stripe.store.addPlan(context.identity, model.id, model);

    return model;
  };

  this.coupon = function({
    context, id, amount_off, currency, duration, duration_in_months,
    max_redemptions, metadata, percent_off, redeem_by,
  }) {
    const model = {
      id: id || `cou_${ stripe.store.generateId(24) }`,
      object: 'coupon',
      amount_off: Number(amount_off) || null,
      created: stripe.util.timestamp(),
      currency: currency || null,
      duration,
      duration_in_months: Number(duration_in_months) || null,
      livemode: context.livemode,
      max_redemptions: Number(max_redemptions) || null,
      metadata: metadata || {},
      percent_off: Number(percent_off) || null,
      redeem_by: Number(redeem_by) || null,
      times_redeemed: 0,
      valid: true,
    };

    stripe.store.addCoupon(context.identity, model.id, model);

    return model;
  };

  this.customer = function({
    context, card, description, email, metadata, shipping,
  }) {
    const model = {
      id: `cus_${ stripe.store.generateId(24) }`,
      object: 'customer',
      account_balance: 0,
      created: stripe.util.timestamp(),
      currency: 'usd',
      default_source: card ? card.id : null,
      delinquent: false,
      description: description || null,
      discount: null,
      email: email || null,
      livemode: context.livemode,
      metadata: metadata || {},
      shipping: shipping || null,
    };

    stripe.store.addCustomer(context.identity, model.id, model);

    return model;
  };

  this.subscriptionItem = function({
    plan, quantity, metadata,
  }) {
    const model = {
      id: `si_${ stripe.store.generateId(24) }`,
      object: 'subscription_item',
      created: stripe.util.timestamp(),
      metadata: metadata || {},
      plan: plan.id,
      quantity: Number(quantity) || 1,
    };

    return model;
  };

  this.subscription = function({
    context, customer, items, metadata, coupon, application_fee_percent,
    tax_percent, trial_end, trial_period_days,
  }) {
    const id = `sub_${ stripe.store.generateId(24) }`;
    const timestamp = stripe.util.timestamp();

    let discount;
    if (coupon) {
      discount = this.discount({
        context,
        customer: customer.id,
        subscription: id,
        coupon,
      });
    }

    let plan;
    let quantity;
    const subscriptionItems = [];
    for (const item of items) {
      const subscriptionItem = this.subscriptionItem({
        context,
        plan: item.plan,
        quantity: item.quantity,
      });
      plan = item.plan;
      quantity = subscriptionItem.quantity;

      subscriptionItems.push(subscriptionItem);
    }

    let trial_start = null;
    trial_end = null;

    const trial_period = trial_period_days || plan.trial_period_days;
    if (trial_end) {
      trial_start = timestamp;
      if (trial_end === 'now') {
        trial_end = timestamp;
      }
    }

    if (trial_period) {
      trial_start = timestamp;
      trial_end = timestamp + stripe.data.trial.duration.day * trial_period;
    }

    const model = {
      id,
      object: 'subscription',
      application_fee_percent: application_fee_percent || null,
      cancel_at_period_end: false,
      canceled_at: null,
      created: timestamp,
      current_period_end: trial_period ? trial_end :
        timestamp + stripe.data.plans.intervals[plan.interval],
      current_period_start: timestamp,
      customer: customer.id,
      discount: discount || null,
      ended_at: null,
      items: this.list({
        items: subscriptionItems,
        url: `/v1/subscription_items?subscription=${ id }`,
      }),
      livemode: context.livemode,
      metadata: metadata || {},
      plan: plan.id,
      quantity: quantity || 1,
      start: timestamp,
      status: trial_period ? 'trialing' : 'active',
      tax_percent: tax_percent || null,
      trial_end: trial_end || null,
      trial_start: trial_start || null,
    };

    stripe.store.addSubscription(context.identity, model.id, model);

    return model;
  };

  this.invoiceLineItem = function({
    context, id, amount, currency, description, metadata,
    start, end, plan, quantity, subscription, type,
    subscription_item, coupon, upcoming, proration,
  }) {
    const timestamp = stripe.util.timestamp();

    const model = {
      id,
      object: 'line_item',
      amount: amount || 0,
      currency: currency || 'usd',
      description: description || null,
      discountable: true,
      livemode: context.livemode,
      metadata: metadata || {},
      period: {
        start: start || timestamp,
        end: end || timestamp,
      },
      plan: plan || null,
      proration: stripe.util.toBoolean(proration),
      quantity: quantity || 1,
      subscription: subscription || null,
      subscription_item: subscription_item || null,
      type: type || 'invoiceitem',
    };

    if (coupon) {
      if (coupon.amount_off) {
        model.amount -= coupon.amount_off;
      } else if (coupon.percent_off) {
        model.amount -= Math.ceil(model.amount * (coupon.percent_off / 100));
      }
    }

    if (upcoming) {
      const diff = model.period.end - model.period.start;
      model.period.start = model.period.end;
      model.period.end += diff;
    }

    return model;
  };

  this.invoiceItem = function({
    context, customer, amount, currency, description,
    invoice, metadata, subscription, plan, quantity,
    subscription_item, proration, start, end,
  }) {
    const timestamp = stripe.util.timestamp();

    const model = {
      id: `ii_${ stripe.store.generateId(24) }`,
      object: 'invoiceitem',
      amount: Number(amount),
      currency: currency || 'usd',
      customer,
      date: timestamp,
      description: description || null,
      discountable: true,
      invoice: invoice || null,
      livemode: context.livemode,
      metadata: metadata || {},
      period: {
        start: start || timestamp,
        end: end || timestamp,
      },
      plan: plan || null,
      proration: stripe.util.toBoolean(proration),
      quantity: quantity || 1,
      subscription: subscription || null,
      subscription_item: subscription_item || null,
    };

    stripe.store.addInvoiceItem(context.identity, model.id, model);

    return model;
  };

  this.invoice = function({
    context, customer, application_fee, description, metadata,
    statement_descriptor, subscription, tax_percent, upcoming,
    pay,
  }) {
    const id = upcoming ? 'upcoming' : `in_${ stripe.store.generateId(24) }`;
    const timestamp = stripe.util.timestamp();
    const items = [];

    let discount = null;

    let start = timestamp;
    let end = 0;

    let subtotal = 0;
    let total = 0;
    let tax = null;

    const starting_balance = customer.account_balance;
    let ending_balance = 0;

    let subscriptionId = null;

    if (subscription) {
      let coupon;
      if (subscription.discount) {
        discount = subscription.discount;
        coupon = stripe.store.getCoupon(context.identity, subscription.discount.coupon);
      }

      for (const item of subscription.items.data) {
        const plan = stripe.store.getPlan(context.identity, item.plan);

        const lineItem = this.invoiceLineItem({
          context,
          id: subscription.id,
          subscription_item: item.id,
          currency: plan.currency,
          plan: plan.id,
          amount: plan.amount * item.quantity,
          coupon,
          description: item.description || null,
          metadata: subscription.metadata,
          start: subscription.current_period_start,
          end: subscription.current_period_end,
          type: 'subscription',
          upcoming,
        });

        items.push(lineItem);

        subtotal += lineItem.amount;
        start = lineItem.period.start;
        end = lineItem.period.end;
      }
    } else {
      const invoiceItems = stripe.store.findInvoiceItems(context.identity, {
        customer: customer.id,
        invoice: null,
      });

      for (const item of invoiceItems) {
        const lineItem = this.invoiceLineItem({
          context,
          id: item.id,
          amount: item.amount,
          currency: item.currency,
          description: item.description || null,
          metadata: item.metadata,
          start: item.period.start,
          end: item.period.end,
          plan: item.plan || null,
          quantity: item.quantity || null,
          subscription: item.subscription || null,
          subscription_item: item.subscription_item || null,
          proration: item.proration,
          type: 'invoiceitem',
          upcoming,
        });

        items.push(lineItem);

        subscriptionId = item.subscription;

        subtotal += lineItem.amount;
        start = lineItem.period.start;
        end = lineItem.period.end;

        if (!upcoming) {
          item.invoice = id;
          stripe.store.updateInvoiceItem(context.identity, item.id, item);
        }
      }
    }

    if (tax_percent) {
      tax = subtotal * (tax_percent / 100);
      total = subtotal + tax;
    } else {
      total = subtotal;
    }

    total += starting_balance;

    let charge;
    if (pay) {
      if (total > 0) {
        charge = this.charge({
          context,
          customer,
          invoice: id,
          amount: total,
          upcoming,
        });

        stripe.store.updateCustomer(context.identity, customer.id, { account_balance: 0 });
      } else {
        charge = {
          id: null,
          closed: true,
          paid: true,
        };

        stripe.store.updateCustomer(context.identity, customer.id, { account_balance: total });
        ending_balance = total;
      }
    }

    const model = {
      id,
      object: 'invoice',
      amount_due: total,
      application_fee: application_fee || null,
      attempt_count: charge ? 1 : 0,
      attempted: Boolean(pay && !upcoming),
      charge: charge ? charge.id : null,
      closed: Boolean(charge && charge.paid),
      currency: 'usd',
      customer: customer.id,
      date: timestamp,
      description: description || null,
      discount,
      ending_balance: upcoming ? null : ending_balance,
      forgiven: false,
      lines: this.list({
        items,
        url: `/v1/invoices/${ id }/lines`,
      }),
      livemode: context.livemode,
      metadata: metadata || {},
      next_payment_attempt: null,
      paid: charge ? charge.paid : false,
      period_end: end,
      period_start: start,
      receipt_number: null,
      starting_balance,
      statement_descriptor: statement_descriptor || null,
      subscription: subscription ? subscription.id : subscriptionId,
      subtotal,
      tax,
      tax_percent: tax_percent || null,
      total,
      webhooks_delivered_at: null,
    };

    if (upcoming) {
      delete model.id;
      const diff = model.period_end - model.period_start;
      model.period_start = model.period_end;
      model.period_end = model.period_end + diff;
      model.next_payment_attempt = model.period_start;
    }

    if (context.identity && !upcoming) {
      stripe.store.addInvoice(context.identity, model.id, model);
    }

    return model;
  };

  this.charge = function({
    context, amount, currency, source, customer, invoice, description, upcoming,
  }) {
    const id = `ch_${ stripe.store.generateId(24) }`;

    let card;
    if (customer) {
      card = customer.default_source;
    }
    if (source) {
      const token = stripe.store.getToken(context.identity, source);
      card = token.card;
    }

    if (card.id) {
      card = card.id;
    }

    const model = {
      id,
      object: 'charge',
      amount,
      amount_refunded: 0,
      application: null,
      application_fee: null,
      balance_transaction: `txn_${ stripe.store.generateId(24) }`,
      captured: true,
      created: stripe.util.timestamp(),
      currency: currency || 'usd',
      customer: customer ? customer.id : null,
      description: description || null,
      destination: null,
      dispute: null,
      failure_code: null,
      failure_message: null,
      fraud_details: {},
      invoice: invoice || null,
      livemode: context.livemode,
      metadata: {},
      on_behalf_of: null,
      order: null,
      outcome: {
        network_status: 'approved_by_network',
        reason: null,
        risk_level: 'normal',
        seller_message: 'Payment complete.',
        type: 'authorized',
      },
      paid: !upcoming,
      receipt_email: null,
      receipt_number: null,
      refunded: false,
      refunds: this.list({ url: `/v1/charges/${ id }/refunds` }),
      review: null,
      shipping: null,
      source: card,
      source_transfer: null,
      statement_descriptor: null,
      status: upcoming ? 'pending' : 'succeeded',
      transfer_group: null,
    };

    stripe.store.addCharge(context.identity, model.id, model);

    const event = stripe.util.clone(model);
    event.source = stripe.store.getCard(context.identity, card);

    this.event({
      context,
      type: `charge.${ model.status }`,
      object: event,
    });

    return model;
  };

  this.discount = function({
    context, coupon, customer, subscription,
  }) {
    if (coupon.deleted || coupon.times_redeemed === coupon.max_redemptions) {
      return null;
    }

    coupon.times_redeemed++;

    const model = {
      id: `di_${ stripe.store.generateId(24) }`,
      object: 'discount',
      coupon: coupon.id,
      customer,
      end: null,
      start: stripe.util.timestamp(),
      subscription,
    };

    if (coupon.duration === 'repeating') {
      model.end = model.start + coupon.duration_in_months * stripe.data.coupons.duration.month;
    }

    stripe.store.addDiscount(context.identity, model.id, model);
    stripe.store.updateCoupon(context.identity, coupon.id, coupon);

    return model;
  };

  this.event = function({
    context, type, object, previous,
  }) {
    const model = {
      id: `evt_${ stripe.store.generateId(24) }`,
      object: 'event',
      api_version: stripe.options.apiVersion,
      created: stripe.util.timestamp(),
      data: { object },
      livemode: context.livemode,
      pending_webhooks: 0,
      request: {
        id: context.requestId,
        idempotency_key: null,
      },
      type,
    };

    if (previous) {
      model.data.previous_attributes = previous;
    }

    stripe.store.addEvent(context.identity, model.id, model);
    if (!stripe.options.silent) {
      console.json(model);
    }

    context.events.push(model);

    return model;
  };

  this.webhook = function({
    context, url, sharedSecret, events,
  }) {
    const model = {
      id: `wh_${ stripe.store.generateId(24) }`,
      created: stripe.util.timestamp(),
      url,
      sharedSecret,
      events: events || [ '*' ],
    };

    stripe.store.addWebhook(context.identity, model.id, model);

    return model;
  };

  this.request = function({
    id, timestamp, method, url, parameters, query, body, statusCode, response,
  }) {
    const model = {
      id,
      timestamp,
      method,
      url,
      parameters: parameters || null,
      query: query || null,
      body: body || null,
      statusCode,
      response,
    };

    stripe.store.addRequest(model);

    return model;
  };
}

module.exports = (stripe) => new Model(stripe);
