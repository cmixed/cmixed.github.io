/**
 * 博客 / 资源小窝 共用的列表实时搜索。
 *
 * 只负责搜索自身的状态：输入、清除、快捷键、?q= 同步、分词匹配、计数与空态。
 * 页面已有的标签 / 分类筛选通过 extraFilter 回调传入，二者按 AND 叠加。
 *
 *   var search = window.initListSearch({
 *     inputId: 'searchInput',
 *     clearId: 'searchClear',
 *     countId: 'searchCount',
 *     emptyId: 'searchEmpty',
 *     cardSelector: '.blog-page-card',
 *     countUnit: '篇文章',
 *     extraFilter: function (card) { return true; }
 *   });
 *   search.refresh(); // 页面切换标签 / 分类或重新排序后调用
 */
(function () {
  function tokenize(query) {
    return query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(function (t) {
        return t;
      });
  }

  // 每个 token 都必须是 data-search 的子串（AND），大小写不敏感，天然支持中文
  function matches(card, tokens) {
    var key = card.getAttribute('data-search') || '';
    for (var i = 0; i < tokens.length; i++) {
      if (key.indexOf(tokens[i]) === -1) return false;
    }
    return true;
  }

  function isTyping() {
    var el = document.activeElement;
    if (!el) return false;
    return (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'SELECT' ||
      el.isContentEditable === true
    );
  }

  window.initListSearch = function (opts) {
    var input = document.getElementById(opts.inputId);
    if (!input)
      return {
        refresh: function () {},
        getQuery: function () {
          return '';
        },
      };

    var clearBtn = opts.clearId ? document.getElementById(opts.clearId) : null;
    var countEl = opts.countId ? document.getElementById(opts.countId) : null;
    var emptyEl = opts.emptyId ? document.getElementById(opts.emptyId) : null;
    var cards = Array.prototype.slice.call(document.querySelectorAll(opts.cardSelector));
    var unit = opts.countUnit || '条';
    var extraFilter =
      opts.extraFilter ||
      function () {
        return true;
      };
    var query = '';
    var tokens = [];

    function apply() {
      var visible = 0;
      for (var i = 0; i < cards.length; i++) {
        var ok = extraFilter(cards[i]) && matches(cards[i], tokens);
        cards[i].style.display = ok ? '' : 'none';
        if (ok) visible++;
      }
      if (countEl) {
        if (tokens.length) {
          countEl.hidden = false;
          countEl.textContent = '找到 ' + visible + ' ' + unit;
        } else {
          countEl.hidden = true;
        }
      }
      if (emptyEl) emptyEl.hidden = visible !== 0;
      if (clearBtn) clearBtn.hidden = !input.value;
      return visible;
    }

    function syncUrl() {
      var params = new URLSearchParams(location.search);
      if (query) params.set('q', query);
      else params.delete('q');
      var qs = params.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
    }

    function setQuery(value) {
      query = value;
      tokens = tokenize(value);
      apply();
      syncUrl();
    }

    input.addEventListener('input', function () {
      setQuery(input.value);
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        input.value = '';
        setQuery('');
        input.focus();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !isTyping()) {
        e.preventDefault();
        input.focus();
      } else if (e.key === 'Escape' && document.activeElement === input) {
        if (input.value) {
          input.value = '';
          setQuery('');
        } else {
          input.blur();
        }
      }
    });

    window.addEventListener('popstate', function () {
      var q = new URLSearchParams(location.search).get('q') || '';
      if (q === query) return;
      input.value = q;
      query = q;
      tokens = tokenize(q);
      apply();
    });

    // 初始化：读取 ?q=
    input.value = new URLSearchParams(location.search).get('q') || '';
    query = input.value;
    tokens = tokenize(query);
    apply();

    return {
      refresh: apply,
      getQuery: function () {
        return query;
      },
    };
  };
})();
