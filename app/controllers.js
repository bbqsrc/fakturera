'use strict';

const models = require('./models'),
      Invoice = models.Invoice;

const Invoices = {
  create(data) {
    if (data == null) {
      throw new TypeError('Data required');
    }

    const invoice = new Invoice(invoice);

    return invoice.save();
  }
};

module.exports = { Invoices };
