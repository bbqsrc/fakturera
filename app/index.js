'use strict';

require('intl');
Intl.NumberFormat   = IntlPolyfill.NumberFormat;
Intl.DateTimeFormat = IntlPolyfill.DateTimeFormat;

const app = require('koa')(),
      Router = require('koa-rutt'),
      mongoose = require('mongoose'),
      moment = require('moment'),
      path = require('path'),
      fs = require('fs'),
      models = require('./models'),
      Handlebars = require('handlebars'),
      HandlebarsIntl = require('handlebars-intl'),
      marked = require('marked');

HandlebarsIntl.registerWith(Handlebars);

Handlebars.registerHelper('markdown', function(data, context) { // eslint-disable-line
  if (data == null) {
    return '';
  }
  return new Handlebars.SafeString(marked(data).replace(/\n/g, '<br>'));
});

mongoose.connect('mongodb://localhost:27017/fakturera');
const db = mongoose.connection;

const tmpl = Handlebars.compile(fs.readFileSync(
  path.resolve(__dirname, 'templates', 'invoice.hbs'), 'utf8'));

const router = new Router();

router
.get('/:clientSlug/:year/:month/:day', function* getInvoice() {
  const date = moment(this.params.year + '-' +
                      this.params.month + '-' +
                      this.params.day, 'YYYY-M-D');
  const nextDay = date.clone().add(1, 'day');
  const invoice = yield models.Invoice.findOne({
    'client.slug': this.params.clientSlug,
    issueDate: {
      $gte: date.toDate(),
      $lt: nextDay.toDate()
    }
  });

  if (!invoice) {
    return (this.body = 'Not found.');
  }

  this.redirect(`${this.url}/${invoice._id}`);
})
.get('/:clientSlug/:year/:month/:day/:id', function* getInvoice() {
  const invoice = yield models.Invoice.findOne({ _id: this.params.id });

  if (!invoice) {
    return (this.body = 'Not found.');
  }

  this.body = tmpl(invoice, {
    data: { intl: {
      locales: invoice.client.locale,
      formats: {
        date: {
          short: {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }
        }
      }
    }}
  });
});

app.use(router.middleware());

process.on('unhandledRejection', (err) => {
  console.log('Unhandled promise', err);
});

db.once('open', () => {
  console.log('gogogo port 3000');
  app.listen(3000);
});
