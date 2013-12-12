define(function (require, exports, module) {
  var art = require('utils/artTemplate/index');
  var ui = require('utils/ui/index');
  var BasicView = require('modules/views/abstracts/Basic');
  var tpl = require('templates/user/user.tpl');
  var Navigate = require('utils/Navigate');
  var UserModel = require('modules/daos/user/UserModel');
  var ContentUserView = require('modules/views/user/Content');
  var inCharset = require('utils/inCharset');

  var UserView = BasicView.extend({
    el: '#user',
    tpl: art.compile(tpl),
    events: {
      'tap .action-back': function () {
        Navigate.back();
      }
    },
    render: function () {
      this.$el.html(this.tpl());
      this.$el.find('.iscroll').css('height', window.innerHeight - 50);
      this.scroll = new iScroll('user-article', {
      });
      this.$content = this.$el.find('.content'); 
      return this;
    },
    _refresh: function () {
      var self = this;
      var view;
      if (this.model.toJSON()['error']) {
        ui.Loading.close();
        Navigate.back();
      } else {
        view = new ContentUserView({model: this.model});
        this.scroll.scrollTo(0, 0, 0);
        this.$content.html(view.el);
        $(view.el).removeClass('hide').addClass('show');
        _.delay(function () {
          ui.Loading.close();
        }, 200);
        _.delay(function () {
          self.scroll.refresh();
        }, 400);
      }
    },
    fetch: function (data, options) {
      var self = this;
      ui.Loading.open();
      if (data.username) {
        inCharset(data.username, 'gbk', function (username) {
          var obj = _.extend({}, data, {username: username});
          options = _.extend({}, options, {urlEncoded: true});
          self.model.fetchXml(obj, options);
        });
      } else {
        self.model.fetchXml(data, options);
      }
    },
    initialize: function () {
      this.model = new UserModel();
      this.$content = this.$el.find('.content');
      this.listenTo(this.model, 'sync', this._refresh);
      return this.render();
    }
  });
  module.exports = UserView;
});
