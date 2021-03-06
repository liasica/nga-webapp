define(function (require, exports, module) {
  var art = require('utils/artTemplate/index');
  var ui = require('utils/ui/index');
  var BasicView = require('modules/views/abstracts/Basic');
  var TopicInForumCollection = require('modules/daos/forum/TopicInForumCollection');
  var tpl = require('templates/forum/forum.tpl');
  var RowForumView = require('modules/views/forum/Row');
  var iScrollPull = require('utils/iScrollPull');
  var appCache = require('modules/AppCache').appCache;
  var sliceSubject = require('utils/common').sliceSubject;
  var inCharset = require('utils/inCharset');
  
  var ForumView = BasicView.extend({
    el: '#forum',
    tpl: art.compile(tpl),
    _currentPage: 0,
    flag: {
      favorList: false,
      searchList: false
    },
    cache: {
      keyword: ''
    },
    events: {
      // 抖动动画测试
      'singleTap .action-shake': function () {
        $self = this.$el.find('.glyphicon-search');
        $self.addClass('animated shake');
        _.delay(function () {$self.removeClass('animated');}, 1000);
      },
      // 登录调试测试
      'doubleTap .action-autologin': function () {
        $.get('/api/autoLogin', function () {
          alert('connected!');
          window.location = function () {
            return '/client/';
          }();
        });
      },
      'singleTap .action-new': function () {
        Backbone.stage.change('#!/publish/' + this.collection.cache.fid, ['slide-right', 'slide-left']);
        appCache.get('publishView').$el.find('header .subject').text(sliceSubject('新帖'));
      },
      'singleTap .action-refresh': function (e) {
        var $btn = $(e.currentTarget);
        $btn.addClass('loading');
        this.refresh();
      },
      'edgeRight header+article': 'openLeftSider',
      'swipeRight header+article': 'openLeftSider',
      'edge .asideMask': 'closeSider',
      'swipe .asideMask': 'closeSider',
      'tap .asideMask': 'closeSider',
      'tap .action-aside': function () {
        if (this.$el.find('.asideMask').hasClass('on')) {
          this.closeSider();
        } else {
          this.openLeftSider();
        }
      }
    },
    openLeftSider: function () {
      var self = this;
      self.$el.find('.asideMask').addClass('on');
      Backbone.aside.onceAfterHide(function () {
        self.$el.find('.asideMask').removeClass('on');
      });
      Backbone.aside.show('menu', ['', 'slide-left']);
    },
    closeSider: function () {
      Backbone.aside.hide(['', 'slide-left']);
    },
    refresh: function () {
      if (this.flag.favorList) {
        this.fetch({favor: 1, page: 1}, {remove: true});
      } else if (this.flag.searchList) {
        this.fetch({key: this.cache.keyword, fidgroup: 'user', page: 1}, {remove: true});
      } else {
        this.fetch({fid: this.collection.cache.fid, page: 1}, {remove: true});
      }
    },
    render: function () {
      this.$el.html(this.tpl());
      this.$ul = this.$el.find('ul');
      this.initializeScroll();
      return this;
    },
    /**
     * 创建滚动条
     */
    initializeScroll: function () {
      var self = this;
      var pullDownAction, pullUpAction;
      self.$el.find('.iscroll').css('height', window.innerHeight - 50);
      pullDownAction = function () {
        self.refresh();
      };
      pullUpAction = function () {
        if (self.flag.favorList) {
          self.fetch({favor: 1, page: self._currentPage + 1}, {remove: false});
        } else if (self.flag.searchList) {
          self.fetch({key: self.cache.keyword, fidgroup: 'user', page: self._currentPage + 1}, {remove: false});
        } else {
          self.fetch({fid: self.collection.cache.fid, page: self._currentPage + 1}, {remove: false});
        }
      };
      iScrollPull.call(self, 'forum-article', pullDownAction, pullUpAction);
      return self;
    },
    /**
     * 渲染单条帖子视图
     * @private
     * @param {TopicModel} topic
     */
    _addOne: function (topic) {
      if (this.$ul.find('[data-tid="' + topic.id + '"]').length > 0) {
        return;
      }
      var view = new RowForumView({model: topic});
      this.$ul.append(view.el);
      $(view.el).addClass('animate');
      setTimeout(function () {
        $(view.el).removeClass('animate');
      }, 800);
    },
    /**
     * 添加全部帖子
     */
    _addAll: function (model, resp, options) {
      var self = this;
      var match;
      this.$el.find('.action-pulldown, .action-pullup, .action-refresh').removeClass('loading');
      if (typeof options.data === 'object') {
        this._currentPage = options.data.page;
      } else if (typeof options.data === 'string') {
        match = options.data.match(/&page=(\d*)/);
        if (match && match.length > 1) {
          this._currentPage = parseInt(match[1], 0);
        } else {
          this._currentPage = 1;
        }
      } else {
        this._currentPage = 1;
      }
      // 刷新时清空列表，重置滚动条位置
      if (options.remove) {
        this.$ul.html('');
        this.scroll.scrollTo(0, 0, 0);
      }
      this.collection.each(this._addOne, this);
      _.delay(function () {
        ui.Loading.close();
      }, 600);
      _.delay(function () {
        self.scroll.refresh();
      }, 1000);
    },
    /**
     * 清空列表
     */
    _clearAll: function (model, resp, options) {
      var self = this;
      var match;
      this.$el.find('.action-pulldown, .action-pullup, .action-refresh').removeClass('loading');
      this.$ul.html('');
      this.scroll.scrollTo(0, 0, 0);
      _.delay(function () {
        ui.Loading.close();
      }, 600);
      _.delay(function () {
        self.scroll.refresh();
      }, 1000);
    },
    fetch: function (data, options) {
      var self = this;
      ui.Loading.open();
      this.flag.favorList = !!data.favor;
      this.flag.searchList = !!data.key;
      this.cache.keyword = (data.key || '');
      if (this.flag.favorList || this.flag.searchList) {
        this.$el.find('.action-new').hide();
      } else {
        this.$el.find('.action-new').show();
      }
      _.defaults(options || (options = {}), {
        error: function () {
          console.log('error', arguments);
          ui.Loading.close();
        }
      });
      // 搜索列表需要对关键字转编码
      if (data.key) {
        self.charsetRequest = inCharset.get(data.key, 'gbk', function (key) {
          var obj = _.extend({}, data, {key: key});
          options = _.extend({}, options, {urlEncoded: true});
          self.xhr = self.collection.fetchXml(obj, options);
        }, function (err) {
          ui.Loading.close();
        });
      } else {
        self.xhr =  self.collection.fetchXml(data, options);
      }
    },
    initialize: function () {
      var self = this;
      var initializeScroll = function () {
        self.initializeScroll();
      };
      this.collection = new TopicInForumCollection();
      this.listenTo(this.collection, 'sync', this._addAll);
      this.listenTo(this.collection, 'error', this._clearAll);
      this.listenTo($(window), 'resize', initializeScroll);
      this.listenTo($(document), 'throttledresize', initializeScroll);
      this.listenTo($(document), 'orientationchange', initializeScroll);
      return this.render();
    }
  });
  module.exports = ForumView;
});
