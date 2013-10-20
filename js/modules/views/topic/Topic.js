define(function (require, exports, module) {
  var art = require('utils/artTemplate/index');
  var ui = require('utils/ui/index');
  var BasicView = require('modules/views/abstracts/Basic');
  var PostInTopicCollection = require('modules/daos/topic/PostInTopicCollection');
  var tpl = require('templates/topic/topic.tpl');
  var RowTopicView = require('modules/views/topic/Row');

  var TopicView = BasicView.extend({
    el: '#topic',
    tpl: art.compile(tpl),
    events: {
    },
    render: function () {
      this.$el.html(this.tpl());
      this.$el.find('.iscroll').css('height', window.innerHeight - 50);
      // this.scroll = new iScroll('.iscroll', {
      //   scrollbars: true,
      //   interactiveScrollbars: true
      // });
      this.scroll = new iScroll('topic-article', {
      });
      this.$ul = this.$el.find('ul');
      return this;
    },
    /**
     * 渲染单层楼视图
     * @private
     * @param {TopicModel} post
     */
    _addOne: function (post) {
      var view = new RowTopicView({model: post});
      this.$ul.append(view.el);
      $(view.el).removeClass('hide').addClass('show');
    },
    /**
     * 添加全部楼层
     */
    _addAll: function () {
      var self = this;
      ui.Loading.open();
      this.$ul.html('');
      console.log(this.collection);
      this.collection.each(this._addOne, this);
      _.delay(function () {
        ui.Loading.close();
      }, 600);
      _.delay(function () {
        self.scroll.refresh();
      }, 1000);
    },
    fetch: function (data, options) {
      this.collection.fetchXml(data, options);
    },
    initialize: function () {
      ui.Loading.open();
      this.collection = new PostInTopicCollection();
      this.$ul = this.$el.find('ul');
      this.listenTo(this.collection, 'sync', this._addAll);
      ui.Loading.close();
      return this.render();
    }
  });
  module.exports = TopicView;
});
