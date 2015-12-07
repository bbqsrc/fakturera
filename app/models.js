'use strict';

const mongoose = require('mongoose'),
      BigNumber = require('bignumber.js');

const bn = (x) => new BigNumber(x); // eslint-disable-line

const Contact = new mongoose.Schema({
  type: { type: String, required: true },
  value: { type: String, required: true }
});

const InvoiceItem = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  taxRate: { type: Number, default: 0 }
});

InvoiceItem.virtual('total').get(function getTotal() {
  return parseFloat(bn(this.price)
    .times(bn(this.quantity))
    .plus(this.tax)
    .toNumber()
    .toFixed(2));
});

InvoiceItem.virtual('tax').get(function getTax() {
  const rate = bn(this.taxRate).dividedBy(100);

  return parseFloat(bn(this.price)
    .times(bn(this.quantity))
    .times(rate)
    .toNumber()
    .toFixed(2));
});

const PaymentMethod = new mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String, required: true },
  details: { type: String, required: true }
});

const Provider = new mongoose.Schema({
  paymentMethods: { type: [PaymentMethod], required: true },
  name: { type: String, required: true },
  details: { type: String, required: true },
  businessId: String,
  contacts: [Contact]
});

const Client = new mongoose.Schema({
  locale: { type: String, required: true },
  slug: { type: String, required: true },
  name: { type: String, required: true },
  details: { type: String, required: true },
  businessId: String
});

const Invoice = new mongoose.Schema({
  provider: { type: Provider, required: true },
  client: { type: Client, required: true },
  currency: { type: String, required: true },
  items: { type: [InvoiceItem], required: true },
  paymentMethods: { type: [PaymentMethod], required: true },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  amountPaid: { type: Number, default: 0 },
  reference: String,
  advice: String,
  remarks: String
});

Invoice.virtual('amountPayable').get(function getAmountPayable() {
  const total = this.items.reduce((last, curr) => last.plus(curr.total), bn(0));

  return parseFloat(total.minus(bn(this.amountPaid)).toNumber().toFixed(2));
});

Invoice.virtual('hasTax').get(function getHasTax() {
  return this.items.find(item => item.tax > 0);
});

module.exports = {
  Invoice: mongoose.model('Invoice', Invoice),
  Provider: mongoose.model('Provider', Provider),
  Client: mongoose.model('Client', Client)
};
