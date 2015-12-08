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
      marked = require('marked'),
      childProcess = require('child_process');

HandlebarsIntl.registerWith(Handlebars);

Handlebars.registerHelper('markdown', function(data, context) { // eslint-disable-line
  if (data == null) {
    return '';
  }
  return new Handlebars.SafeString(marked(data).trim().replace(/\n/g, '<br>'));
});

mongoose.connect('mongodb://localhost:27017/fakturera');
const db = mongoose.connection;

const tmpl = Handlebars.compile(fs.readFileSync(
  path.resolve(__dirname, 'templates', 'invoice.hbs'), 'utf8'));

const genInvoice = (invoice) => {
  return tmpl(invoice, {
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
};

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

  this.body = genInvoice(invoice);
})
.get('/:clientSlug/:year/:month/:day/:id/pdf', function* getInvoicePdf() {
  this.type = "application/pdf";

  const invoice = yield models.Invoice.findOne({ _id: this.params.id });

  if (!invoice) {
    return (this.body = 'Not found.');
  }

  const html = genInvoice(invoice);

  const proc = childProcess.spawn('wkhtmltopdf', ['--print-media-type', '-', '-']);

  proc.stdin.write(html);
  proc.stdin.end();

  this.body = yield (new Promise((resolve, reject) => {
    let bufs = [];

    proc.stdout.on('data', data => {
      bufs.push(data);
    });

    proc.stdout.on('close', () => {
      resolve(Buffer.concat(bufs));
    })
  }));
});

app.use(router.middleware());

process.on('unhandledRejection', (err) => {
  console.log('Unhandled promise', err);
});

db.once('open', () => {
  console.log('gogogo port 3000');
  app.listen(3000);
});
