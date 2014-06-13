var crypto = require('crypto'),
    shasum = crypto.createHash('sha1'),
    _ = require('underscore'),
    http = require('http'),
    Liq = function LiqPay (public_key, private_key) {
      if (public_key) { throw new Error('public_key is empty'); }
      if (private_key) { throw new Error('private_key is empty'); }

      this._public_key = public_key;
      this._private_key = private_key;
      this._rootUrl = 'https://www.liqpay.com/api';
    };

_.extend(Liq.prototype, {
    _supportedCurrencies: ['EUR','UAH','USD','RUB','RUR'],

    _supportedParams: ['public_key','amount','currency','description',
                       'order_id','result_url','server_url','type',
                       'signature','language','sandbox'],

  api: function (url, params, next) {
    var private_key,
      post_options,
      public_key,
      postfields,
      signature,
      data = '',
      toEncode,
      post_req,
      ch;

    params = params || {};

    public_key = this._public_key;
    private_key = this._private_key;
    data = new Buffer(_.extend(params, {public_key: public_key})).toString('base64');
    toEncode = private_key + JSON.stringify(data) + private_key;

    shasum.update(toEncode);
    signature = shasum.digest('binary');
      /*********************************************/
      /*********************************************/
      /*********************************************/
      /*********************************************/
    post_data = JSON.stringify({
        signature:  signature,
        data:       data
      });

    post_options = {
      host: this._rootUrl,
      port: '80',
      path: '/' + url,
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': post_data.length
        }
      };

    post_req = http.request(post_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          data += chunk;
        });
      res.on('close', function () {
          next(null, JSON.parse(data));
        });
    });

    post_req.write(post_data);
    post_req.end();
  },

  cnb_form: function (params) {
    var params = params || {},
      public_key = params.public_key = this._public_key,
      private_key = this._private_key,
      language = 'ru',
      html = '';

    if (!params.amount) {
        throw new Error('Amount is null');
    }
    if (!params.currency) {
       throw new Error('Currency is null');
    }
    if (!_.contains(this._supportedCurrencies, params.currency)) {
        throw new Error('Currency is not supported');
    }
    if (params.currency === 'RUR') {
        params.currency = 'RUB';
    }
    if (!params.description) {
        throw new Error('Description is null');
    }

    params.signature = this.cnb_signature(params);

    if (params.language === 'en') {
        language = 'en';
    }

    html = '<form method="post" action="https://www.liqpay.com/api/pay" accept-charset="utf-8">';

    _.each(params, function (val, key) {
        if (!_.contains(this._supportedParams, key)) {
            return;
        }
        html += '\r\n<input type="hidden" name="' + key + '" value="' + value + '" />';
      }, this);

    html += '<input type="image" src="//static.liqpay.com/buttons/p1%s.radius.png" name="btn_text" /></form>';

    return html;
  },

  cnb_signature: function cnb_signature(params) {
    params = params || {};
    
    var public_key =  params.public_key = this._public_key,
      result_url =    params.result_url || '',
      server_url =    params.server_url ||'',
      order_id =      params.order_id || '',
      description =   params.description,
      private_key =   this._private_key,
      type =          params.type || '',
      currency =      params.currency,
      amount =        params.amount,
      signature =     '';

    if (currency === 'RUR') {
        currency = 'RUB';
    }

    signature += private_key + amount + currency + public_key + order_id + type + description + result_url + server_url

    return this.str_to_sign(signature)
  },

  str_to_sign: function (str) {
    var toEncode = new Buffer(str).toString('base64');

    shasum.update(toEncode);

    return shasum.digest('binary');
  }
});

module.exports = Liq;